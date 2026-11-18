'use client';

import { useState } from 'react';
import { useMerchant, type RedeemResult } from '@/components/b2b/MerchantContext';
import { QrScanner } from '@/components/b2b/QrScanner';
import { PageTitle } from '@/components/b2b/ui';

/** Counter screen: scan the customer's QR or type the pickup code. Nothing else competes for attention. */
export default function RedeemPage() {
  const { orders, stats, redeemCode } = useMerchant();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<RedeemResult | null>(null);

  const run = (raw: string) => {
    if (!raw.trim()) return;
    setResult(redeemCode(raw));
    setCode('');
  };

  const recent = orders.filter((o) => o.estado === 'completada').slice(0, 5);

  return (
    <div className="max-w-xl mx-auto">
      <PageTitle
        title="Canjear pedido"
        sub={`${stats.pendingOrders} ${stats.pendingOrders === 1 ? 'pedido espera' : 'pedidos esperan'} ser entregados.`}
      />

      {scannerOpen && (
        <QrScanner
          onClose={() => setScannerOpen(false)}
          onCode={(scanned) => {
            setScannerOpen(false);
            run(scanned);
          }}
        />
      )}

      <div className="card p-6 space-y-5">
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="btn btn-primary w-full !py-4 text-base font-semibold cursor-pointer"
        >
          Escanear QR del cliente
        </button>

        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="flex-1 h-px bg-line" />o escribe el código
          <span className="flex-1 h-px bg-line" />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(code);
          }}
          className="flex gap-2"
        >
          <input
            id="quick-redeem-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="#A1B2"
            aria-label="Código de recolección"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input flex-1 text-center text-lg font-mono font-semibold tracking-widest uppercase"
          />
          <button type="submit" className="btn btn-ghost !px-5 font-semibold cursor-pointer">
            Validar
          </button>
        </form>

        {result && (
          <p
            role="status"
            className={`text-sm font-medium p-3 rounded-xl ${
              result.ok ? 'bg-accent-soft text-accent' : 'bg-danger-soft text-danger'
            }`}
          >
            {result.message}
          </p>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-3">Últimos canjes</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">Todavía no has entregado pedidos.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((o) => (
              <li key={o.id} className="card px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <span className="font-mono font-semibold tracking-widest">{o.codigo_recoleccion}</span>
                <span className="text-muted truncate flex-1 text-right">{o.cliente ?? 'Cliente'}</span>
                <span className="text-accent text-xs font-semibold shrink-0">Entregado</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
