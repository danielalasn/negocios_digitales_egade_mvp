import { NextResponse } from 'next/server';
import { pool, requireUser, errorResponse, HttpError } from '@/lib/serverAuth';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '#';
  for (let i = 0; i < 4; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Creates a reservation for the authenticated buyer. Stock is decremented atomically
 * (row lock) so two buyers can never reserve the same last unit.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const { packageId } = await req.json();
    if (!packageId || typeof packageId !== 'string') {
      throw new HttpError(400, 'BAD_REQUEST', 'Falta el paquete a reservar.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN;');

      const { rows: profile } = await client.query('SELECT rol FROM users WHERE id = $1;', [user.id]);
      if (profile.length === 0) throw new HttpError(403, 'NO_PROFILE', 'Tu perfil no existe todavía.');
      if (profile[0].rol !== 'b2c') {
        throw new HttpError(403, 'NOT_BUYER', 'Solo las cuentas de comprador pueden reservar.');
      }

      const { rows: pkgs } = await client.query(
        `SELECT id, restaurant_id, precio_remate, cantidad_disponible, disponible
           FROM packages WHERE id = $1 FOR UPDATE;`,
        [packageId]
      );
      const pkg = pkgs[0];
      if (!pkg) throw new HttpError(404, 'PACKAGE_NOT_FOUND', 'Este paquete ya no existe.');
      if (!pkg.disponible || pkg.cantidad_disponible <= 0) {
        throw new HttpError(409, 'SOLD_OUT', 'Este paquete ya se agotó.');
      }

      const remaining = pkg.cantidad_disponible - 1;
      const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const code = generateCode();

      await client.query(
        `INSERT INTO orders (id, package_id, user_id, restaurant_id, codigo_recoleccion, estado, precio_pagado)
         VALUES ($1, $2, $3, $4, $5, 'pendiente', $6);`,
        [orderId, pkg.id, user.id, pkg.restaurant_id, code, pkg.precio_remate]
      );
      await client.query(
        `UPDATE packages SET cantidad_disponible = $2, disponible = $3 WHERE id = $1;`,
        [pkg.id, remaining, remaining > 0]
      );
      await client.query(
        `INSERT INTO analytics_events (id, merchant_id, type, payload) VALUES ($1, $2, 'order_created', $3::jsonb);`,
        [
          `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          pkg.restaurant_id,
          JSON.stringify({ orderId, packageId: pkg.id, userId: user.id, pricePaid: Number(pkg.precio_remate) }),
        ]
      );

      await client.query('COMMIT;');

      return NextResponse.json({
        success: true,
        order: {
          id: orderId,
          package_id: pkg.id,
          user_id: user.id,
          restaurant_id: pkg.restaurant_id,
          codigo_recoleccion: code,
          estado: 'pendiente',
          precio_pagado: Number(pkg.precio_remate),
          createdAt: new Date().toISOString(),
        },
        remaining,
      });
    } catch (err) {
      await client.query('ROLLBACK;');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
