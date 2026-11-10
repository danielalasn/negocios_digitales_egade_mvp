'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { authHeaders } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

interface Metrics {
  generatedAt: string;
  accounts: { b2b?: number; b2c?: number };
  merchants: {
    id: string;
    nombre: string;
    products: number;
    baskets: number;
    approved_clean: number;
    orders: number;
    completed: number;
  }[];
  ai: {
    analyses: number;
    rejected: number;
    avgLatencyMs: number | null;
    promptTokens: number;
    outputTokens: number;
    costUsd: number | null;
    costPerPhotoUsd: number | null;
    basketsConfirmed: number;
    approvedWithoutEdit: number;
  };
  orders: { created: number; completed: number; revenue: number };
}

const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : 'sin datos');

export default function PilotDashboardPage() {
  const currentUser = useStore((s) => s.currentUser);
  const authReady = useStore((s) => s.authReady);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (!currentUser) {
      setError('Inicia sesión con una cuenta de administrador.');
      return;
    }
    (async () => {
      const res = await fetch('/api/admin/metrics', { headers: await authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) return setError(json.message || 'No se pudieron cargar las métricas.');
      setMetrics(json);
    })();
  }, [authReady, currentUser]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-medium">{error}</p>
        <Link href="/?login=true" className="btn btn-primary mt-6 inline-flex">Iniciar sesión</Link>
      </div>
    );
  }
  if (!metrics) return <div className="mx-auto max-w-4xl px-4 py-24 text-center text-muted text-sm">Cargando...</div>;

  const { ai, orders } = metrics;

  const exportCsv = () => {
    const rows = [
      ['metric', 'value'],
      ['merchant_accounts', metrics.accounts.b2b ?? 0],
      ['buyer_accounts', metrics.accounts.b2c ?? 0],
      ['photos_analyzed', ai.analyses],
      ['photos_rejected', ai.rejected],
      ['baskets_confirmed', ai.basketsConfirmed],
      ['baskets_approved_without_edit', ai.approvedWithoutEdit],
      ['avg_latency_ms', ai.avgLatencyMs ?? ''],
      ['prompt_tokens', ai.promptTokens],
      ['output_tokens', ai.outputTokens],
      ['cost_per_photo_usd', ai.costPerPhotoUsd ?? ''],
      ['orders_created', orders.created],
      ['orders_completed', orders.completed],
      ['revenue_mxn', orders.revenue],
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `buen_bocado_metrics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const Stat = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
    <div className="card p-4">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <p className="text-2xl font-black mt-2">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Métricas reales del piloto</h1>
          <p className="text-sm text-muted">
            Solo cuentas registradas en Supabase Auth. Actualizado {new Date(metrics.generatedAt).toLocaleString('es-MX')}
          </p>
        </div>
        <button onClick={exportCsv} className="btn btn-ghost text-xs cursor-pointer">Exportar CSV</button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Usuarios</h2>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Negocios registrados" value={metrics.accounts.b2b ?? 0} />
          <Stat label="Compradores registrados" value={metrics.accounts.b2c ?? 0} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">IA de visión</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Fotos analizadas" value={ai.analyses} sub={`${ai.rejected} rechazadas`} />
          <Stat
            label="Lotes aprobados sin editar"
            value={pct(ai.approvedWithoutEdit, ai.basketsConfirmed)}
            sub={`${ai.approvedWithoutEdit} de ${ai.basketsConfirmed} confirmados`}
          />
          <Stat label="Latencia promedio" value={ai.avgLatencyMs ? `${(ai.avgLatencyMs / 1000).toFixed(1)} s` : 'sin datos'} />
          <Stat
            label="Costo por foto"
            value={ai.costPerPhotoUsd !== null ? `$${ai.costPerPhotoUsd.toFixed(4)} USD` : 'sin datos'}
            sub={`${ai.promptTokens + ai.outputTokens} tokens en total`}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Reservas</h2>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Reservas creadas" value={orders.created} />
          <Stat label="Entregadas" value={orders.completed} sub={pct(orders.completed, orders.created)} />
          <Stat label="Ingreso recuperado" value={`$${orders.revenue.toFixed(0)} MXN`} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Por negocio</h2>
        {metrics.merchants.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">Aún no hay negocios registrados.</div>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted text-left">
                <tr>
                  <th className="p-3">Negocio</th>
                  <th className="p-3">Productos</th>
                  <th className="p-3">Lotes</th>
                  <th className="p-3">Sin editar</th>
                  <th className="p-3">Reservas</th>
                  <th className="p-3">Entregadas</th>
                </tr>
              </thead>
              <tbody>
                {metrics.merchants.map((m) => (
                  <tr key={m.id} className="border-t border-line">
                    <td className="p-3 font-medium">{m.nombre}</td>
                    <td className="p-3">{m.products}</td>
                    <td className="p-3">{m.baskets}</td>
                    <td className="p-3">{pct(m.approved_clean, m.baskets)}</td>
                    <td className="p-3">{m.orders}</td>
                    <td className="p-3">{m.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
