// Dynamic closing-time pricing. Pure functions, shared by server and client.
//
// The discount grows linearly from the merchant's MIN discount to the MAX discount over the
// last WINDOW_MINUTES before closing. Before the window the price sits at the minimum discount;
// at or after closing it sits at the maximum discount (the floor). Prices are whole pesos and
// can never leave [floor, regular - 1 peso].

export const WINDOW_MINUTES = 120;
export const DEFAULT_MIN_DISCOUNT_PCT = 20;
const PESO = 100;

export interface PricedItem {
  quantity: number;
  regularPriceCents: number;
  minDiscountPct: number;
  maxDiscountPct: number;
  /** AI-advised urgency in [-0.5, 0.5]: positive moves the discount earlier (lots left, low demand). */
  urgency?: number;
}

/** How much live demand (fraction of the lot already reserved) holds the price up. */
export const HOT_DEMAND_WEIGHT = 0.3;

export function clampUrgency(u: number): number {
  return Math.min(0.5, Math.max(-0.5, Number.isFinite(u) ? u : 0));
}

/** Discount percentage (float) at a given moment. */
export function discountPctAt(
  minPct: number,
  maxPct: number,
  closesAt: Date,
  now: Date = new Date(),
  windowMinutes: number = WINDOW_MINUTES,
  adjust: number = 0
): number {
  const lo = Math.min(minPct, maxPct);
  const hi = Math.max(minPct, maxPct);
  const minutesLeft = (closesAt.getTime() - now.getTime()) / 60000;
  const progress = Math.min(1, Math.max(0, 1 - minutesLeft / windowMinutes + adjust));
  return lo + (hi - lo) * progress;
}

export function floorPriceCents(regularPriceCents: number, maxDiscountPct: number): number {
  return Math.round(regularPriceCents * (1 - maxDiscountPct / 100));
}

/** Unit price in cents at a given moment, whole pesos, clamped to the merchant's limits. */
export function unitPriceCentsAt(
  regularPriceCents: number,
  minPct: number,
  maxPct: number,
  closesAt: Date,
  now: Date = new Date(),
  adjust: number = 0
): number {
  const pct = discountPctAt(minPct, maxPct, closesAt, now, WINDOW_MINUTES, adjust);
  const floor = floorPriceCents(regularPriceCents, Math.max(minPct, maxPct));
  const raw = regularPriceCents * (1 - pct / 100);
  const rounded = Math.round(raw / PESO) * PESO;
  const ceiling = Math.max(floor, regularPriceCents - PESO);
  return Math.min(ceiling, Math.max(floor, rounded));
}

/**
 * Totals of a lot at a given moment. `soldFraction` (0..1) is the share of the lot already reserved:
 * hot demand slows the discount, AI urgency speeds it up. Both only shift the curve; the result always
 * stays inside the merchant's [min, max] discount range.
 */
export function packageTotals(items: PricedItem[], closesAt: Date, now: Date = new Date(), soldFraction = 0) {
  let regular = 0;
  let current = 0;
  for (const it of items) {
    regular += it.regularPriceCents * it.quantity;
    const adjust = clampUrgency(it.urgency ?? 0) - HOT_DEMAND_WEIGHT * Math.min(1, Math.max(0, soldFraction));
    current += unitPriceCentsAt(it.regularPriceCents, it.minDiscountPct, it.maxDiscountPct, closesAt, now, adjust) * it.quantity;
  }
  const discountPct = regular > 0 ? Math.round(((regular - current) / regular) * 100) : 0;
  return { regularCents: regular, currentCents: current, discountPct };
}

/** Time of the next price step, for UI copy ("sube el descuento en X min"). Returns null after closing. */
export function minutesToClose(closesAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((closesAt.getTime() - now.getTime()) / 60000));
}

const MTY_OFFSET = '-06:00'; // Monterrey has no DST since 2022.

/** Builds today's closing instant in Monterrey from "HH:MM". */
export function closingInstantToday(hhmm: string, now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Monterrey',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // YYYY-MM-DD
  return new Date(`${parts}T${hhmm}:00${MTY_OFFSET}`);
}
