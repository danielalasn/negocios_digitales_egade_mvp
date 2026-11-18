import { packageTotals, minutesToClose, type PricedItem } from '@/lib/pricing';

interface PackageLike {
  cantidad?: number;
  cantidad_disponible?: number;
  precio_original: number;
  precio_remate: number;
  closes_at?: string;
  items_detectados?: {
    cantidad: number;
    regular_cents?: number;
    min_pct?: number;
    max_pct?: number;
    urgency?: number;
  }[];
}

export interface LivePrice {
  price: number;
  original: number;
  pct: number;
  minutesLeft: number | null;
}

/** Current price of a package. Legacy packages without closing data keep their stored price. */
export function livePrice(pkg: PackageLike, now: Date): LivePrice {
  if (pkg.closes_at && pkg.items_detectados?.length) {
    const priced: PricedItem[] = pkg.items_detectados
      .filter((i) => typeof i.regular_cents === 'number')
      .map((i) => ({
        quantity: i.cantidad,
        regularPriceCents: i.regular_cents as number,
        minDiscountPct: i.min_pct ?? 0,
        maxDiscountPct: i.max_pct ?? 0,
        urgency: i.urgency ?? 0,
      }));
    if (priced.length > 0) {
      const closes = new Date(pkg.closes_at);
      const sold = pkg.cantidad && pkg.cantidad_disponible !== undefined ? (pkg.cantidad - pkg.cantidad_disponible) / pkg.cantidad : 0;
      const t = packageTotals(priced, closes, now, sold);
      return {
        price: t.currentCents / 100,
        original: t.regularCents / 100,
        pct: t.discountPct,
        minutesLeft: minutesToClose(closes, now),
      };
    }
  }
  const pct = pkg.precio_original > 0 ? Math.round(((pkg.precio_original - pkg.precio_remate) / pkg.precio_original) * 100) : 0;
  return { price: pkg.precio_remate, original: pkg.precio_original, pct, minutesLeft: null };
}
