'use client';

import Link from 'next/link';
import { useMerchant } from '@/components/b2b/MerchantContext';
import { Empty, OrderRow, Stat } from '@/components/b2b/ui';

/** Home: the numbers, the two main actions and the orders waiting to be delivered. */
export default function B2BHomePage() {
  const { stats, orders } = useMerchant();
  const pending = orders.filter((o) => o.estado === 'pendiente');

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Indicadores">
        <Stat label="Lotes activos" value={stats.activeLots} />
        <Stat label="Pedidos pendientes" value={stats.pendingOrders} />
        <Stat label="Ingresos recuperados" value={`$${stats.recoveredRevenue}`} hint="Pedidos entregados" />
        <Stat label="Piezas rescatadas" value={stats.rescuedPieces} hint={`${stats.deliveredOrders} pedidos entregados`} />
      </section>

      <section className="grid sm:grid-cols-2 gap-3" aria-label="Acciones principales">
        <Link href="/b2b/canjear" className="card card-interactive p-5 flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-accent text-accent-fg flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
            </svg>
          </span>
          <span>
            <span className="block font-semibold">Canjear pedido</span>
            <span className="block text-sm text-muted">Escanea el QR del cliente o escribe su código.</span>
          </span>
        </Link>
        <Link href="/b2b/publicar" className="card card-interactive p-5 flex items-center gap-4">
          <span className="w-11 h-11 rounded-xl bg-subtle border border-line text-fg flex items-center justify-center shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v12H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </span>
          <span>
            <span className="block font-semibold">Publicar el cierre del día</span>
            <span className="block text-sm text-muted">Una foto de tu vitrina y la IA propone el lote.</span>
          </span>
        </Link>
      </section>

      <section aria-label="Pedidos pendientes">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Por entregar</h2>
          <Link href="/b2b/pedidos" className="text-xs font-semibold text-accent hover:underline">
            Ver todos los pedidos
          </Link>
        </div>
        {pending.length === 0 ? (
          <Empty title="No hay pedidos pendientes" sub="Cuando un cliente reserve uno de tus lotes aparecerá aquí." />
        ) : (
          <ul className="space-y-3">
            {pending.slice(0, 5).map((o) => (
              <OrderRow key={o.id} order={o} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
