import pg from 'pg';
import { createClient, type User } from '@supabase/supabase-js';

declare global {
  // Reuse the pool across hot reloads and warm serverless invocations.
  // eslint-disable-next-line no-var
  var __bbPool: pg.Pool | undefined;
}

export const pool: pg.Pool =
  globalThis.__bbPool ??
  (globalThis.__bbPool = new pg.Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000,
    max: 3,
  }));

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Verifies the Supabase Auth access token sent as "Authorization: Bearer <jwt>".
 * Identity is never taken from the request body.
 */
export async function requireUser(req: Request): Promise<User> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new HttpError(401, 'AUTH_REQUIRED', 'Inicia sesión para continuar.');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new HttpError(500, 'SERVER_MISCONFIGURED', 'Falta configuración de Supabase en el servidor.');
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, 'AUTH_INVALID', 'Tu sesión expiró. Inicia sesión de nuevo.');
  }
  return data.user;
}

export interface SessionMerchant {
  userId: string;
  userName: string;
  merchantId: string;
  restaurantName: string;
}

/** Resolves the authenticated user's business (role b2b) from the database. */
export async function requireMerchant(req: Request): Promise<SessionMerchant> {
  const user = await requireUser(req);
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.nombre AS user_name, u.rol, r.id AS merchant_id, r.nombre AS restaurant_name
       FROM users u
       LEFT JOIN restaurants r ON r.owner_id = u.id
      WHERE u.id = $1
      LIMIT 1;`,
    [user.id]
  );
  const row = rows[0];
  if (!row) throw new HttpError(403, 'NO_PROFILE', 'Tu perfil no existe todavía.');
  if (row.rol !== 'b2b' || !row.merchant_id) {
    throw new HttpError(403, 'NOT_MERCHANT', 'Esta acción es solo para cuentas de negocio.');
  }
  return {
    userId: row.user_id,
    userName: row.user_name,
    merchantId: row.merchant_id,
    restaurantName: row.restaurant_name,
  };
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json(
      { success: false, error_code: error.code, message: error.message, user_message: error.message },
      { status: error.status }
    );
  }
  console.error('[API error]', error);
  const message = error instanceof Error ? error.message : 'Error inesperado.';
  return Response.json({ success: false, error_code: 'INTERNAL', message, user_message: message }, { status: 500 });
}
