'use client';

import { useState } from 'react';
import { useMerchant } from '@/components/b2b/MerchantContext';
import { Empty, OrderRow, PageTitle } from '@/components/b2b/ui';

type Filter = 'pendiente' | 'completada' | 'todos';

export default function OrdersPage() {
  const { orders } = useMerchant();
  const [filter, setFilter] = useState<Filter>('pendiente');

  const counts = {
    pendiente: orders.filter((o) => o.estado === 'pendiente').length,
    completada: orders.filter((o) => o.estado === 'completada').length,
    todos: orders.length,
  };
  const visible = filter === 'todos' ? orders : orders.filter((o) => o.estado === filter);

  const filters: [Filter, string][] = [
    ['pendiente', 'Pendientes'],
    ['completada', 'Entregados'],
    ['todos', 'Todos'],
  ];

  return (
    <div>
      <PageTitle title="Pedidos" sub="Para entregar un pedido necesitas el código o el QR del cliente." />

      <div className="flex gap-2 mb-4" role="tablist" aria-label="Filtro de pedidos">
        {filters.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={`px-3.5 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
              filter === id ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg hover:bg-subtle'
            }`}
          >
            {label} ({counts[id]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Empty
          title={filter === 'pendiente' ? 'No hay pedidos pendientes' : 'Sin pedidos en esta lista'}
          sub="Los pedidos de tus clientes aparecerán aquí."
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}
