import { NextResponse } from 'next/server';
import { pool, requireMerchant, errorResponse } from '@/lib/serverAuth';
import { advisePricing, type PricingAdvice } from '@/lib/gemini';
import { clampUrgency, closingInstantToday, unitPriceCentsAt } from '@/lib/pricing';

// Hard cap so the function never hangs; the Gemini calls inside have their own shorter timeouts.
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const session = await requireMerchant(req);
    const { merchantId } = session;

    const body = await req.json();
    const { items, sourcePhotoRef, horaLimite, hadRemovals } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La canasta debe contener al menos un producto.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // 1. Cargar catálogo activo del comercio para revalidar precios en el servidor
      const pRes = await client.query(
        `SELECT id, name, regular_price_cents, min_discount_pct, max_discount_pct 
         FROM products 
         WHERE merchant_id = $1 AND active = true;`,
        [merchantId]
      );

      const catalogMap = new Map(pRes.rows.map((p) => [p.id, p]));

      // Closing instant: merchant-chosen pickup deadline (HH:MM, Monterrey time), default 20:00.
      const hhmm = typeof horaLimite === 'string' && /^\d{2}:\d{2}$/.test(horaLimite) ? horaLimite : '20:00';
      const closesAt = closingInstantToday(hhmm);
      const now = new Date();
      if (closesAt.getTime() <= now.getTime()) {
        return NextResponse.json(
          { success: false, message: `La hora límite (${hhmm}) ya pasó. Elige una hora posterior.`, user_message: `La hora límite (${hhmm}) ya pasó. Elige una hora posterior.` },
          { status: 400 }
        );
      }

      // 1b. AI pricing advice: urgency per product from leftovers, recent demand and time to close.
      // If the model is unavailable the lot is published with no AI adjustment (urgency 0) and that is recorded.
      const { rows: demandRows } = await client.query(
        `SELECT it->>'nombre' AS name,
                COUNT(o.id)::int AS reservations,
                COALESCE(SUM((it->>'cantidad')::int), 0)::int AS published
           FROM packages p
           CROSS JOIN LATERAL jsonb_array_elements(p.items_detectados) it
           LEFT JOIN orders o ON o.package_id = p.id
          WHERE p.restaurant_id = $1 AND p.created_at > NOW() - INTERVAL '14 days'
          GROUP BY it->>'nombre';`,
        [merchantId]
      );
      const demandByName = new Map(demandRows.map((r) => [r.name, r]));
      let advice: PricingAdvice | null = null;
      let adviceError: string | null = null;
      try {
        const qtyByProduct = new Map<string, number>();
        for (const item of items) {
          if (catalogMap.has(item.productId)) {
            qtyByProduct.set(
              item.productId,
              (qtyByProduct.get(item.productId) || 0) + Math.max(1, parseInt(item.quantity) || 1)
            );
          }
        }
        const result = await advisePricing({
          minutesToClose: Math.round((closesAt.getTime() - now.getTime()) / 60000),
          items: [...qtyByProduct.entries()].map(([productId, quantityLeft]) => {
            const prod = catalogMap.get(productId)!;
            const d = demandByName.get(prod.name);
            return {
              productId,
              name: prod.name,
              quantityLeft,
              regularPriceMxn: prod.regular_price_cents / 100,
              minDiscountPct: prod.min_discount_pct,
              maxDiscountPct: prod.max_discount_pct,
              recentReservations: d?.reservations ?? 0,
              recentPublished: d?.published ?? 0,
            };
          }),
        });
        advice = result.advice;
        await client.query(
          `INSERT INTO analytics_events (id, merchant_id, type, payload) VALUES ($1, $2, 'pricing_advice', $3::jsonb);`,
          [
            `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            merchantId,
            JSON.stringify({ ...result.meta, summary: result.advice.summary }),
          ]
        );
      } catch (err) {
        adviceError = err instanceof Error ? err.message : String(err);
        console.error('[Basket Confirm] pricing advice failed:', adviceError);
      }
      const adviceByProduct = new Map((advice?.items || []).map((a) => [a.productId, a]));

      // 2. Revalidar cada producto y precio
      const validatedItems = [];
      let totalRegularCents = 0;
      let totalRemateCents = 0;
      let totalPieces = 0;
      let anyEdited = hadRemovals === true;

      for (const item of items) {
        const prod = catalogMap.get(item.productId);
        if (!prod) {
          throw new Error(`Producto no válido o no pertenece a tu comercio (ID: ${item.productId})`);
        }

        const qty = Math.max(1, parseInt(item.quantity) || 1);
        // The server owns the price: dynamic by closing time, within the merchant's min/max discount.
        const adv = adviceByProduct.get(prod.id);
        const urgency = adv ? clampUrgency(adv.urgency) : 0;
        const unitPriceCents = unitPriceCentsAt(
          prod.regular_price_cents,
          prod.min_discount_pct,
          prod.max_discount_pct,
          closesAt,
          now,
          urgency
        );

        if (item.edited) anyEdited = true;

        totalRegularCents += prod.regular_price_cents * qty;
        totalRemateCents += unitPriceCents * qty;
        totalPieces += qty;

        validatedItems.push({
          productId: prod.id,
          name: prod.name, // Copia congelada del nombre al momento de publicar
          regularPriceCents: prod.regular_price_cents, // Copia congelada del precio regular
          minDiscountPct: prod.min_discount_pct,
          maxDiscountPct: prod.max_discount_pct,
          urgency,
          aiReason: adv?.reason ?? null,
          unitPriceCents: unitPriceCents,
          quantity: qty,
          source: item.source || 'ai',
          edited: item.edited || false,
          aiConfidence: typeof item.confidence === 'number' ? item.confidence : null,
        });
      }

      // 3. Escribir en base de datos de forma transaccional
      await client.query('BEGIN;');

      const basketId = `bsk-${Date.now()}`;
      await client.query(
        `INSERT INTO baskets (id, merchant_id, status, source_photo_ref, created_at, published_at)
         VALUES ($1, $2, 'published', $3, NOW(), NOW());`,
        [basketId, merchantId, sourcePhotoRef || null]
      );

      for (const vItem of validatedItems) {
        const itemId = `bi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        await client.query(
          `INSERT INTO basket_items (id, basket_id, product_id, name, regular_price_cents, unit_price_cents, quantity, source, edited, ai_confidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`,
          [
            itemId,
            basketId,
            vItem.productId,
            vItem.name,
            vItem.regularPriceCents,
            vItem.unitPriceCents,
            vItem.quantity,
            vItem.source,
            vItem.edited,
            vItem.aiConfidence,
          ]
        );
      }

      // 4. Escribir el lote en la tabla "packages" en el formato que ya usa el B2C
      const packageId = `pkg-${basketId}`;
      const packageTitle = `Lote de Cierre: ${validatedItems.map((i) => i.name).slice(0, 2).join(', ')}${
        validatedItems.length > 2 ? ' y más' : ''
      }`;
      const packageDesc = validatedItems.map((i) => `${i.quantity}x ${i.name}`).join(' • ');

      await client.query(
        `INSERT INTO packages (id, restaurant_id, titulo, descripcion, cantidad, cantidad_disponible, precio_original, precio_remate, hora_limite, disponible, created_at, foto_vitrina, items_detectados, aprobado_sin_edicion, closes_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), $10, $11::jsonb, $12, $13);`,
        [
          packageId,
          merchantId,
          packageTitle,
          packageDesc,
          3, // 3 paquetes disponibles
          3,
          totalRegularCents / 100,
          totalRemateCents / 100,
          hhmm,
          sourcePhotoRef || null,
          JSON.stringify(
            validatedItems.map((i) => ({
              nombre: i.name,
              cantidad: i.quantity,
              precio_estimado: i.unitPriceCents / 100,
              regular_cents: i.regularPriceCents,
              min_pct: i.minDiscountPct,
              max_pct: i.maxDiscountPct,
              urgency: i.urgency,
              ai_reason: i.aiReason,
            }))
          ),
          !anyEdited,
          closesAt.toISOString(),
        ]
      );

      await client.query(
        `INSERT INTO analytics_events (id, merchant_id, type, payload) VALUES ($1, $2, 'basket_confirmation', $3::jsonb);`,
        [
          `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          merchantId,
          JSON.stringify({
            basketId,
            approvedWithoutEdit: !anyEdited,
            items: validatedItems.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              source: i.source,
              edited: i.edited,
              aiConfidence: i.aiConfidence,
            })),
          }),
        ]
      );

      await client.query('COMMIT;');

      console.log(`[Basket Confirm] Lote publicado con éxito: ${basketId} -> Package: ${packageId}`);

      return NextResponse.json({
        success: true,
        pricing_summary: advice?.summary ?? null,
        pricing_advice_error: adviceError,
        basket_id: basketId,
        package: {
          id: packageId,
          restaurant_id: merchantId,
          titulo: packageTitle,
          descripcion: packageDesc,
          cantidad: 3,
          cantidad_disponible: 3,
          precio_original: totalRegularCents / 100,
          precio_remate: totalRemateCents / 100,
          hora_limite: hhmm,
          closes_at: closesAt.toISOString(),
          disponible: true,
          foto_vitrina: sourcePhotoRef,
          items_detectados: validatedItems.map((i) => ({
            nombre: i.name,
            cantidad: i.quantity,
            precio_estimado: i.unitPriceCents / 100,
            regular_cents: i.regularPriceCents,
            min_pct: i.minDiscountPct,
            max_pct: i.maxDiscountPct,
            urgency: i.urgency,
            ai_reason: i.aiReason,
          })),
          aprobado_sin_edicion: !anyEdited,
          created_at: new Date().toISOString(),
        },
      });
    } catch (dbErr: any) {
      await client.query('ROLLBACK;');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
