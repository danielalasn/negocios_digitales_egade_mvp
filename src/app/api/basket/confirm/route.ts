import { NextResponse } from 'next/server';
import { pool, requireMerchant } from '@/lib/serverAuth';

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
        `SELECT id, name, regular_price_cents, max_discount_pct 
         FROM products 
         WHERE merchant_id = $1 AND active = true;`,
        [merchantId]
      );

      const catalogMap = new Map(pRes.rows.map((p) => [p.id, p]));

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

        const floorPriceCents = Math.round(
          prod.regular_price_cents * (1 - prod.max_discount_pct / 100)
        );

        const qty = Math.max(1, parseInt(item.quantity) || 1);
        let unitPriceCents = parseInt(item.unitPriceCents);

        // Validar estrictamente límites de precio: floorPrice <= unitPrice < regularPrice
        if (unitPriceCents < floorPriceCents) {
          console.warn(
            `[Basket Confirm] Precio enviado ($${unitPriceCents / 100}) menor al piso ($${
              floorPriceCents / 100
            }). Forzando precio piso.`
          );
          unitPriceCents = floorPriceCents;
          anyEdited = true;
        }

        if (unitPriceCents >= prod.regular_price_cents) {
          unitPriceCents = prod.regular_price_cents - 500; // Descuento mínimo de $5 MXN
          anyEdited = true;
        }

        if (item.edited) anyEdited = true;

        totalRegularCents += prod.regular_price_cents * qty;
        totalRemateCents += unitPriceCents * qty;
        totalPieces += qty;

        validatedItems.push({
          productId: prod.id,
          name: prod.name, // Copia congelada del nombre al momento de publicar
          regularPriceCents: prod.regular_price_cents, // Copia congelada del precio regular
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
        `INSERT INTO packages (id, restaurant_id, titulo, descripcion, cantidad, cantidad_disponible, precio_original, precio_remate, hora_limite, disponible, created_at, foto_vitrina, items_detectados, aprobado_sin_edicion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), $10, $11::jsonb, $12);`,
        [
          packageId,
          merchantId,
          packageTitle,
          packageDesc,
          3, // 3 paquetes disponibles
          3,
          totalRegularCents / 100,
          totalRemateCents / 100,
          horaLimite || '21:30',
          sourcePhotoRef || null,
          JSON.stringify(
            validatedItems.map((i) => ({
              nombre: i.name,
              cantidad: i.quantity,
              precio_estimado: i.unitPriceCents / 100,
            }))
          ),
          !anyEdited,
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
          hora_limite: horaLimite || '21:30',
          disponible: true,
          foto_vitrina: sourcePhotoRef,
          items_detectados: validatedItems.map((i) => ({
            nombre: i.name,
            cantidad: i.quantity,
            precio_estimado: i.unitPriceCents / 100,
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
  } catch (error: any) {
    console.error('[Basket Confirm Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Error al confirmar la canasta.' },
      { status: 500 }
    );
  }
}
