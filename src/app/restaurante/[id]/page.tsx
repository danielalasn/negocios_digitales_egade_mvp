'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';

const disc = (o: number, r: number) => Math.round(((o - r) / o) * 100);

export default function RestaurantProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);
  const restaurants = useStore((s) => s.restaurants);
  const packages = useStore((s) => s.packages);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const createOrder = useStore((s) => s.createOrder);
  const [code, setCode] = useState<{ codigo: string; titulo: string } | null>(null);

  if (!hydrated) return null;

  const rest = restaurants.find((r) => r.id === id);
  if (!rest)
    return <div className="mx-auto max-w-md px-4 py-24 text-center text-muted">Comercio no encontrado.</div>;

  const items = packages.filter((p) => p.restaurant_id === rest.id);
  const isClient = currentUser?.rol === 'b2c';
  const isFav = currentUser ? currentUser.restaurantes_favoritos.includes(rest.id) : false;
  const back = currentUser ? (currentUser.rol === 'b2b' ? '/b2b' : '/b2c') : '/';

  return (
    <div className="mx-auto max-w-5xl pb-24">
      <div className="px-4 pt-6">
        <Link href={back} className="text-sm text-muted hover:text-fg">← Volver</Link>
      </div>

      <div className="relative mt-4 h-48 sm:h-60 sm:mx-4 sm:rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 border-y sm:border border-line flex items-center justify-center p-6 text-white text-center shadow-inner">
        <div className="absolute inset-0 bg-black/15" />
        <div className="relative z-10 max-w-md">
          <span className="text-5xl sm:text-6xl drop-shadow-md inline-block mb-2">
            {rest.logo || '🍽️'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-sm">{rest.nombre}</h2>
          <p className="text-xs sm:text-sm font-medium opacity-90 mt-1">{rest.categoria} · {rest.direccion}</p>
        </div>
      </div>

      <div className="px-4">
        <div className="-mt-10 relative flex items-end justify-between gap-4 z-20">
          <div className="w-20 h-20 rounded-2xl bg-surface border-2 border-surface flex items-center justify-center text-4xl shadow-md">
            {rest.logo || '🍽️'}
          </div>
          {isClient && (
            <button
              id={`profile-fav-${rest.id}`}
              onClick={() => toggleFavorite(rest.id)}
              className={`btn text-xs font-bold !py-2.5 !px-4 flex items-center gap-1.5 ${isFav ? 'btn-ghost' : 'btn-primary'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>{isFav ? 'Siguiendo' : 'Seguir restaurante'}</span>
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{rest.nombre}</h1>
          <span className="badge badge-eco text-xs">Comercio Verificado</span>
        </div>

        <p className="text-xs text-muted mt-1 flex items-center gap-2">
          <span>{rest.categoria}</span>
          {rest.totalReviews > 0 && (
            <>
              <span>·</span>
              <span className="text-amber-500 font-bold">★ {rest.rating.toFixed(1)}</span>
              <span>({rest.totalReviews} reseñas verificadas)</span>
            </>
          )}
        </p>
        {rest.descripcion && <p className="mt-3 text-sm text-muted max-w-xl leading-relaxed">{rest.descripcion}</p>}

        {/* Feature Pills */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="badge badge-subtle">{rest.direccion}</span>
          <span className="badge badge-subtle">{rest.horario}</span>
          <span className="badge badge-eco">Empaque ecológico</span>
          <span className="badge badge-hot">Recoge hoy</span>
        </div>

        <h2 className="text-base font-bold text-fg mt-10 mb-4 flex items-center gap-2">
          <span>Bolsas Sorpresa Disponibles</span>
          <span className="text-xs font-normal text-muted">({items.length})</span>
        </h2>

        {items.length === 0 ? (
          <div className="card p-12 text-center text-sm text-muted">
            <div className="w-12 h-12 rounded-2xl bg-subtle text-muted flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            Este comercio no tiene productos publicados en este momento.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => {
              const out = !p.disponible || p.cantidad_disponible <= 0;
              return (
                <article key={p.id} className={`card card-interactive p-5 flex flex-col justify-between ${out ? 'opacity-60' : ''}`}>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base leading-snug">{p.titulo}</h3>
                      <span className={`badge text-[10px] ${out ? 'badge-hot' : 'badge-eco'}`}>
                        {out ? 'Agotada' : `Quedan ${p.cantidad_disponible}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-2 clamp-2">{p.descripcion}</p>
                    <p className="text-[11px] text-muted mt-3">
                      Recoger hoy antes de las <strong>{p.hora_limite}</strong>
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-black">${p.precio_remate}</span>
                        <span className="text-xs text-muted line-through">${p.precio_original}</span>
                      </div>
                      <span className="badge badge-eco text-[10px] font-bold">-{disc(p.precio_original, p.precio_remate)}%</span>
                    </div>

                    {isClient ? (
                      <button
                        id={`profile-reserve-${p.id}`}
                        disabled={out}
                        onClick={() => setCode({ codigo: createOrder(p.id).codigo_recoleccion, titulo: p.titulo })}
                        className="btn btn-primary !py-2 !px-4 text-xs font-bold disabled:opacity-40"
                      >
                        {out ? 'Agotada' : 'Rescatar bolsa'}
                      </button>
                    ) : !currentUser ? (
                      <Link href="/" className="btn btn-primary !py-2 !px-3 text-xs font-bold">
                        Entrar para rescatar
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {code && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setCode(null)}>
          <div className="card fade-in w-full max-w-sm p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-muted">Reserva confirmada</p>
            <p className="font-medium mt-1">{code.titulo}</p>
            <div className="my-6 rounded-xl bg-subtle border border-line py-6">
              <p className="text-xs text-muted mb-1">Código de recolección</p>
              <p className="text-4xl font-semibold font-mono tracking-widest">{code.codigo}</p>
            </div>
            <button onClick={() => setCode(null)} className="btn btn-primary w-full">Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}
