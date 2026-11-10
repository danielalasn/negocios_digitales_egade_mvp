import { NextResponse } from 'next/server';
import { pool, requireUser, errorResponse, HttpError } from '@/lib/serverAuth';

/**
 * Real metrics computed from the database. Only accounts that exist in Supabase Auth are
 * counted, so legacy demo rows never enter the numbers. Restricted to ADMIN_EMAILS.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const admins = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (!user.email || !admins.includes(user.email.toLowerCase())) {
      throw new HttpError(403, 'FORBIDDEN', 'No tienes acceso a este panel.');
    }

    const realMerchants = `
      SELECT r.id, r.nombre, r.created_at
        FROM restaurants r
        JOIN auth.users a ON a.id::text = r.owner_id`;

    const [accounts, merchants, vision, baskets, orders] = await Promise.all([
      pool.query(`
        SELECT u.rol, count(*)::int AS n
          FROM users u JOIN auth.users a ON a.id::text = u.id
         GROUP BY u.rol`),
      pool.query(`
        SELECT m.id, m.nombre,
               (SELECT count(*)::int FROM products p WHERE p.merchant_id = m.id AND p.active) AS products,
               (SELECT count(*)::int FROM baskets b WHERE b.merchant_id = m.id AND b.status = 'published') AS baskets,
               (SELECT count(*)::int FROM analytics_events e
                 WHERE e.merchant_id = m.id AND e.type = 'basket_confirmation'
                   AND (e.payload->>'approvedWithoutEdit')::boolean) AS approved_clean,
               (SELECT count(*)::int FROM orders o WHERE o.restaurant_id = m.id) AS orders,
               (SELECT count(*)::int FROM orders o WHERE o.restaurant_id = m.id AND o.estado = 'completada') AS completed
          FROM (${realMerchants}) m
         ORDER BY m.created_at`),
      pool.query(`
        SELECT count(*)::int AS analyses,
               count(*) FILTER (WHERE (e.payload->>'is_food')::boolean = false)::int AS rejected,
               avg((e.payload->>'latencyMs')::numeric) AS avg_latency_ms,
               sum((e.payload->>'promptTokens')::numeric) AS prompt_tokens,
               sum((e.payload->>'outputTokens')::numeric) AS output_tokens
          FROM analytics_events e
         WHERE e.type = 'vision_analysis' AND e.merchant_id IN (SELECT id FROM (${realMerchants}) m)`),
      pool.query(`
        SELECT count(*)::int AS confirmed,
               count(*) FILTER (WHERE (e.payload->>'approvedWithoutEdit')::boolean)::int AS clean
          FROM analytics_events e
         WHERE e.type = 'basket_confirmation' AND e.merchant_id IN (SELECT id FROM (${realMerchants}) m)`),
      pool.query(`
        SELECT count(*)::int AS created,
               count(*) FILTER (WHERE o.estado = 'completada')::int AS completed,
               coalesce(sum(o.precio_pagado) FILTER (WHERE o.estado = 'completada'), 0)::float AS revenue
          FROM orders o
          JOIN auth.users a ON a.id::text = o.user_id`),
    ]);

    const v = vision.rows[0];
    const promptTokens = Number(v.prompt_tokens || 0);
    const outputTokens = Number(v.output_tokens || 0);
    const priceIn = parseFloat(process.env.GEMINI_PRICE_INPUT_USD_PER_M || '');
    const priceOut = parseFloat(process.env.GEMINI_PRICE_OUTPUT_USD_PER_M || '');
    const costUsd =
      !isNaN(priceIn) && !isNaN(priceOut)
        ? (promptTokens / 1e6) * priceIn + (outputTokens / 1e6) * priceOut
        : null;

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      accounts: Object.fromEntries(accounts.rows.map((r) => [r.rol, r.n])),
      merchants: merchants.rows,
      ai: {
        analyses: v.analyses,
        rejected: v.rejected,
        avgLatencyMs: v.avg_latency_ms ? Math.round(Number(v.avg_latency_ms)) : null,
        promptTokens,
        outputTokens,
        costUsd,
        costPerPhotoUsd: costUsd !== null && v.analyses > 0 ? costUsd / v.analyses : null,
        basketsConfirmed: baskets.rows[0].confirmed,
        approvedWithoutEdit: baskets.rows[0].clean,
      },
      orders: orders.rows[0],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
