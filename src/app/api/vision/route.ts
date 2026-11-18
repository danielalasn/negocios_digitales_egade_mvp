import { NextResponse } from 'next/server';
import { analyzePhotoWithGemini, isQuotaError, CatalogProduct } from '@/lib/gemini';
import { closingInstantToday, floorPriceCents, unitPriceCentsAt } from '@/lib/pricing';

// Matches below this confidence are treated as not recognized.
const MIN_MATCH_CONFIDENCE = 0.5;
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
    const { rows: closingRows } = await pool.query('SELECT closing_time FROM restaurants WHERE id = $1;', [merchantId]);
    const closingTime: string = closingRows[0]?.closing_time || '20:00';
    const closesAt = closingInstantToday(closingTime);

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
              min_discount_pct AS "minDiscountPct", max_discount_pct AS "maxDiscountPct", visual_descriptor AS "visualDescriptor"
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
      if (isQuotaError(geminiError)) {
        return NextResponse.json(
          {
            success: false,
            error_code: 'GEMINI_QUOTA',
            user_message: 'Se alcanzó el límite de uso de la IA por ahora. Intenta de nuevo en unos minutos.',
          },
          { status: 429 }
        );
      }
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
    // Low-confidence matches are moved to "unmatched" instead of being proposed.
    const catalogMap = new Map(catalog.map((c) => [c.id, c]));
    const proposedItems = [];
    const unmatched = [...(visionResult.unmatched || [])];
    const now = new Date();

    for (const match of visionResult.matches) {
      const prod = catalogMap.get(match.productId);
      if (!prod) continue;
      const quantity = Math.max(1, match.quantity);

      if (match.confidence < MIN_MATCH_CONFIDENCE) {
        unmatched.push({ description: `${prod.name} (baja confianza)`, quantity });
        continue;
      }

      const unitPriceCents = unitPriceCentsAt(
        prod.regularPriceCents,
        prod.minDiscountPct,
        prod.maxDiscountPct,
        closesAt,
        now
      );

      proposedItems.push({
        productId: prod.id,
        name: prod.name,
        photoUrl: prod.photoUrl,
        quantity,
        regularPriceCents: prod.regularPriceCents,
        unitPriceCents,
        floorPriceCents: floorPriceCents(prod.regularPriceCents, prod.maxDiscountPct),
        minDiscountPct: prod.minDiscountPct,
        maxDiscountPct: prod.maxDiscountPct,
        subtotalCents: unitPriceCents * quantity,
        confidence: match.confidence,
        source: 'ai',
        edited: false,
      });
    }

    const status = proposedItems.length === 0 ? 'no_match' : unmatched.length > 0 ? 'partial' : 'match';

    if (status === 'no_match') {
      await logEvent(merchantId, 'vision_no_match', { unmatched: unmatched.length });
      return NextResponse.json(
        {
          success: false,
          is_food: true,
          status,
          error_code: 'NO_CATALOG_MATCH',
          unmatched,
          user_message:
            'No encontramos ningún producto de tu catálogo en esta foto. Revisa que sea tu vitrina o agrega estos productos a tu catálogo.',
        },
        { status: 422 }
      );
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
        model: meta.model,
        overall_confidence: visionResult.overallConfidence,
        user_message: visionResult.userMessage,
        status,
        closing_time: closingTime,
        closes_at: closesAt.toISOString(),
        unmatched,
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
