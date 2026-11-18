import Link from 'next/link';
import type { MerchantOrder } from '@/components/b2b/MerchantContext';

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4 flex flex-col justify-between">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <p className="text-2xl font-bold mt-2 text-fg">{value}</p>
      {hint && <span className="text-[11px] text-muted mt-1">{hint}</span>}
    </div>
  );
}

export function Empty({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="card p-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted mt-1">{sub}</p>
      {children}
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {sub && <p className="text-sm text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente de entrega',
  completada: 'Entregado',
  cancelada: 'Cancelado',
};

export function OrderRow({ order, showAction = true }: { order: MerchantOrder; showAction?: boolean }) {
  return (
    <li className="card fade-in p-4 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 sm:gap-4">
      <span className="font-mono text-base sm:text-lg font-semibold tracking-widest px-2.5 sm:px-3 py-2 rounded-lg bg-subtle border border-line shrink-0">
        {order.codigo_recoleccion}
      </span>
      <div className="flex-1 min-w-[9rem]">
        <p className="font-medium truncate">{order.titulo ?? 'Paquete eliminado'}</p>
        <p className="text-xs text-muted truncate">
          {order.cliente ?? 'Cliente'} ·{' '}
          {new Date(order.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · $
          {order.precio_pagado}
        </p>
      </div>
      {order.estado === 'pendiente' ? (
        <div className="text-right shrink-0 ml-auto">
          <span className="text-xs font-semibold text-muted block">{STATUS_LABEL[order.estado]}</span>
          {showAction && (
            <Link href="/b2b/canjear" className="text-xs font-semibold text-accent hover:underline">
              Canjear con código o QR
            </Link>
          )}
        </div>
      ) : (
        <span className={`text-xs font-semibold shrink-0 ml-auto ${order.estado === 'completada' ? 'text-accent' : 'text-danger'}`}>
          {STATUS_LABEL[order.estado] ?? order.estado}
        </span>
      )}
    </li>
  );
}
