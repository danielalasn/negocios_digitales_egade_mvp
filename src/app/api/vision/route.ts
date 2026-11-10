import { NextResponse } from 'next/server';
import { analyzePhotoWithGemini, calculateRematePrice, CatalogProduct } from '@/lib/gemini';
import { pool, requireMerchant, errorResponse } from '@/lib/serverAuth';

// Real Gemini analysis only. There is no simulated or fallback result: if the model is
// unavailable the merchant gets an explicit error and can retry or build the basket by hand.

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'VISION_NOT_CONFIGURED',
          user_message: 'El análisis de fotos no está disponible en este momento.',
        },
        { status: 503 }
      );
    }

    // Identity comes from the verified Supabase session, never from the body.
    const { merchantId, restaurantName } = await requireMerchant(req);

    const body = await req.json();
    const { imageUrl } = body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, user_message: 'Se requiere una imagen para el análisis.' },
        { status: 400 }
      );
    }

    const { rows: catalog } = await pool.query<CatalogProduct>(
      `SELECT id, name, photo_url AS "photoUrl", regular_price_cents AS "regularPriceCents",
              max_discount_pct AS "maxDiscountPct", visual_descriptor AS "visualDescriptor"
         FROM products
        WHERE merchant_id = $1 AND active = true
        ORDER BY created_at ASC;`,
      [merchantId]
    );

    if (catalog.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'EMPTY_CATALOG',
          user_message:
            'Tu catálogo está vacío. Registra al menos un producto antes de publicar el cierre del día.',
        },
        { status: 400 }
      );
    }

    let analysis;
    try {
      analysis = await analyzePhotoWithGemini(imageUrl, catalog);
    } catch (geminiError) {
      console.error('[Vision API] Gemini error:', geminiError);
      await logEvent(merchantId, 'vision_error', {
        message: geminiError instanceof Error ? geminiError.message : String(geminiError),
      });
      return NextResponse.json(
        {
          success: false,
          error_code: 'GEMINI_INFERENCE_ERROR',
          user_message: 'No pudimos analizar la foto. Intenta de nuevo en unos segundos.',
        },
        { status: 502 }
      );
    }

    const { result: visionResult, meta } = analysis;

    await logEvent(merchantId, 'vision_analysis', {
      ...meta,
      is_food: visionResult.isFood,
      rejection_reason: visionResult.rejectionReason ?? null,
      matches: visionResult.matches.length,
      unmatched: visionResult.unmatched.length,
      overall_confidence: visionResult.overallConfidence,
    });

    if (!visionResult.isFood) {
      return NextResponse.json(
        {
          success: false,
          is_food: false,
          rejection_reason: visionResult.rejectionReason,
          user_message:
            visionResult.userMessage ||
            'La imagen recibida no muestra alimentos listos para venta. Por favor envía una foto de comida válida.',
        },
        { status: 422 }
      );
    }

    // Basket is built on the server using ONLY catalog prices. IDs outside the catalog are dropped.
    const catalogMap = new Map(catalog.map((c) => [c.id, c]));
    const proposedItems = [];

    for (const match of visionResult.matches) {
      const prod = catalogMap.get(match.productId);
      if (!prod) continue;

      const { rematePriceCents, floorPriceCents } = calculateRematePrice(
        prod.regularPriceCents,
        prod.maxDiscountPct
      );
      const quantity = Math.max(1, match.quantity);

      proposedItems.push({
        productId: prod.id,
        name: prod.name,
        photoUrl: prod.photoUrl,
        quantity,
        regularPriceCents: prod.regularPriceCents,
        unitPriceCents: rematePriceCents,
        floorPriceCents,
        maxDiscountPct: prod.maxDiscountPct,
        subtotalCents: rematePriceCents * quantity,
        confidence: match.confidence,
        source: 'ai',
        edited: false,
      });
    }

    const totalRegularCents = proposedItems.reduce((a, i) => a + i.regularPriceCents * i.quantity, 0);
    const totalRemateCents = proposedItems.reduce((a, i) => a + i.unitPriceCents * i.quantity, 0);
    const totalPieces = proposedItems.reduce((a, i) => a + i.quantity, 0);

    return NextResponse.json({
      success: true,
      is_food: true,
      data: {
        merchant_id: merchantId,
        restaurant_name: restaurantName,
        overall_confidence: visionResult.overallConfidence,
        user_message: visionResult.userMessage,
        unmatched: visionResult.unmatched || [],
        items: proposedItems,
        total_regular_cents: totalRegularCents,
        total_remate_cents: totalRemateCents,
        total_pieces: totalPieces,
        catalog,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function logEvent(merchantId: string, type: string, payload: Record<string, unknown>) {
  try {
    await pool.query(
      `INSERT INTO analytics_events (id, merchant_id, type, payload) VALUES ($1, $2, $3, $4::jsonb);`,
      [`ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, merchantId, type, JSON.stringify(payload)]
    );
  } catch (err) {
    console.error('[Vision API] analytics insert failed:', err);
  }
}
