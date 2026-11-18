'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { livePrice } from '@/lib/livePrice';
import { useMerchant } from '@/components/b2b/MerchantContext';
import { Empty, PageTitle } from '@/components/b2b/ui';

export default function LotsPage() {
  const { packages, now } = useMerchant();
  const deletePackage = useStore((s) => s.deletePackage);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (packages.length === 0) {
    return (
      <div>
        <PageTitle title="Mis lotes" />
        <Empty title="Aún no publicas lotes" sub="Publica tu primer cierre del día.">
          <Link href="/b2b/publicar" className="btn btn-primary mt-5 inline-flex">Publicar un lote</Link>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      <PageTitle title="Mis lotes" sub="El precio se actualiza solo conforme se acerca la hora de cierre." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((p) => {
          const sold = p.cantidad - p.cantidad_disponible;
          const lp = livePrice(p, now);
          return (
            <article key={p.id} className="card fade-in p-5 overflow-hidden flex flex-col justify-between">
              <div>
                {p.foto_vitrina && (
                  <div className="relative h-36 -mx-5 -mt-5 mb-4 overflow-hidden border-b border-line bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.foto_vitrina} alt={p.titulo} className="w-full h-full object-cover" />
                    {p.aprobado_sin_edicion && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-bold text-white">
                        Publicado con IA
                      </span>
                    )}
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <h3 className="font-bold leading-snug">{p.titulo}</h3>
                  <span className={`text-xs font-bold ${p.disponible ? 'text-accent' : 'text-danger'}`}>
                    {p.disponible ? 'Activo' : 'Agotado'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1 clamp-2 min-h-8">{p.descripcion || 'Sin descripción'}</p>

                {p.items_detectados && p.items_detectados.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {p.items_detectados.map((it, idx) => (
                      <span key={idx} className="text-[10px] bg-subtle px-1.5 py-0.5 rounded text-muted font-medium border border-line/60">
                        {it.cantidad}x {it.nombre}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-xl font-black text-fg">${lp.price}</span>
                  <span className="text-sm text-muted line-through">${lp.original}</span>
                  <span className="text-xs text-accent font-bold">-{lp.pct}%</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line/50">
                <div className="flex justify-between text-xs text-muted mb-1.5">
                  <span>Vendidos {sold}/{p.cantidad}</span>
                  <span>Hasta {p.hora_limite}</span>
                </div>
                <div className="h-1 rounded-full bg-subtle overflow-hidden">
                  <div className="h-full bg-accent" style={{ width: `${p.cantidad ? (sold / p.cantidad) * 100 : 0}%` }} />
                </div>

                {confirmId === p.id ? (
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <button
                      id={`delete-pkg-${p.id}`}
                      type="button"
                      onClick={() => {
                        deletePackage(p.id);
                        setConfirmId(null);
                      }}
                      className="font-semibold text-danger cursor-pointer"
                    >
                      Sí, eliminar lote
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-muted hover:text-fg cursor-pointer">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(p.id)}
                    className="mt-3 text-xs text-muted hover:text-danger transition-colors cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
