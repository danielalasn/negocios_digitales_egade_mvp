'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, Package, Restaurant } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';
import { pilotAnalytics } from '@/lib/pilotAnalytics';

type PkgWithRest = Package & { restaurant: Restaurant };

const disc = (o: number, r: number) => Math.round(((o - r) / o) * 100);

const CAT_EMOJIS: Record<string, string> = {
  'Italiana': '🍕',
  'Japonesa': '🍱',
  'Mexicana': '🌮',
  'Hamburguesas': '🍔',
  'Café & Pastelería': '☕',
  'Tailandesa': '🍜',
  'Vegana': '🥑',
  'China': '🥟',
  'Mariscos': '🦐',
};

const MONTERREY_ZONAS = [
  'Todas las zonas',
  'DistritoTec',
  'San Pedro',
  'Centro',
  'Cumbres',
  'Contry',
  'San Jerónimo',
];

export default function B2CPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);
  const packages = useStore((s) => s.packages);
  const restaurants = useStore((s) => s.restaurants);
  const orders = useStore((s) => s.orders);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const createOrder = useStore((s) => s.createOrder);

  const [cat, setCat] = useState('Todas');
  const [zona, setZona] = useState('Todas las zonas');
  const [search, setSearch] = useState('');
  const [onlyUnder100, setOnlyUnder100] = useState(false);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [selected, setSelected] = useState<PkgWithRest | null>(null);
  const [confirmed, setConfirmed] = useState<{ codigo: string; pkg: PkgWithRest } | null>(null);
  const [showOrders, setShowOrders] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'efectivo'>('mercadopago');
  const [isProcessing, setIsProcessing] = useState(false);

  const available = useMemo<PkgWithRest[]>(
    () =>
      packages
        .filter((p) => p.disponible && p.cantidad_disponible > 0)
        .map((p) => ({ ...p, restaurant: restaurants.find((r) => r.id === p.restaurant_id)! }))
        .filter((p) => p.restaurant),
    [packages, restaurants]
  );

  const categories = ['Todas', ...Array.from(new Set(available.map((p) => p.restaurant.categoria)))];
  const favs = currentUser?.restaurantes_favoritos ?? [];

  const filtered = useMemo(() => {
    return available.filter((p) => {
      if (cat !== 'Todas' && p.restaurant.categoria !== cat) return false;
      if (zona !== 'Todas las zonas') {
        const zClean = zona.toLowerCase().replace(' / valle', '');
        if (!p.restaurant.direccion.toLowerCase().includes(zClean)) return false;
      }
      if (onlyUnder100 && p.precio_remate > 100) return false;
      if (onlyFavs && !favs.includes(p.restaurant.id)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = p.titulo.toLowerCase().includes(q);
        const matchRest = p.restaurant.nombre.toLowerCase().includes(q);
        const matchCat = p.restaurant.categoria.toLowerCase().includes(q);
        const matchDesc = p.descripcion.toLowerCase().includes(q);
        const matchZone = p.restaurant.direccion.toLowerCase().includes(q);
        if (!matchTitle && !matchRest && !matchCat && !matchDesc && !matchZone) return false;
      }
      return true;
    });
  }, [available, cat, zona, onlyUnder100, onlyFavs, search, favs]);

  const myOrders = useMemo(
    () =>
      orders
        .filter((o) => o.user_id === currentUser?.id)
        .map((o) => ({
          ...o,
          pkg: packages.find((p) => p.id === o.package_id),
          rest: restaurants.find((r) => r.id === o.restaurant_id),
        }))
        .reverse(),
    [orders, packages, restaurants, currentUser]
  );

  if (!hydrated) return null;

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-lg">Inicia sesión para explorar</p>
        <p className="text-sm text-muted mt-1.5">Descubre y rescata excedentes deliciosos cerca de ti.</p>
        <Link href="/" className="btn btn-primary mt-6 text-xs font-bold inline-flex items-center gap-1.5">
          Ir a iniciar sesión →
        </Link>
      </div>
    );
  }

  if (currentUser.rol !== 'b2c') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-lg">Esta sección es para clientes</p>
        <p className="text-sm text-muted mt-1.5">Actualmente estás con una cuenta de comercio ({currentUser.nombre}).</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/b2b" className="btn btn-primary text-xs font-bold">Ir a mi restaurante (B2B)</Link>
          <Link href="/" className="btn btn-ghost text-xs font-semibold">Cambiar de cuenta</Link>
        </div>
      </div>
    );
  }

  const confirm = async () => {
    if (!selected) return;
    setIsProcessing(true);
    await new Promise((r) => setTimeout(r, 600));
    const o = createOrder(selected.id);
    pilotAnalytics.trackConversion(Boolean(selected.foto_vitrina), true);
    pilotAnalytics.trackSurplusRescued(1.8, 2.5, selected.precio_remate);
    setConfirmed({ codigo: o.codigo_recoleccion, pkg: selected });
    setSelected(null);
    setIsProcessing(false);
  };

  // User impact calculations
  const totalSavedOrders = myOrders.length;
  const totalMoneySaved = myOrders.reduce((acc, o) => {
    const orig = o.pkg?.precio_original ?? (o.precio_pagado * 2.5);
    return acc + Math.max(0, orig - o.precio_pagado);
  }, 0);
  const co2AvoidedKg = ((totalSavedOrders + 2) * 2.5).toFixed(1);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-24">
      {/* Welcome header & Impact widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ¡Hola, {currentUser.nombre.split(' ')[0]}!
          </h1>
          <p className="text-sm text-muted mt-1">
            Hoy hay <strong className="text-fg">{filtered.length} paquetes disponibles</strong> esperando ser rescatados en tu zona.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/perfil"
            id="view-profile-btn"
            className="btn btn-ghost !py-2 !px-3.5 text-xs font-semibold flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Mi perfil</span>
          </Link>
          <button
            id="my-orders-btn"
            onClick={() => setShowOrders(true)}
            className="btn btn-ghost !py-2 !px-4 text-xs font-semibold relative flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <span>Mis pedidos</span>
            {myOrders.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-accent-fg text-[10px] font-bold">
                {myOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Eco Impact Banner */}
      <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent text-accent-fg flex items-center justify-center shrink-0 shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-accent uppercase tracking-wider">Tu impacto ecológico acumulado</p>
            <p className="text-sm font-semibold text-fg">
              Has evitado aprox. <span className="text-accent underline font-bold">{co2AvoidedKg} kg de CO₂</span> en alimentos rescatados
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-right">
            <span className="text-muted block text-[10px] uppercase font-bold">Ahorro total</span>
            <span className="font-extrabold text-accent text-sm">${totalMoneySaved + 380} MXN</span>
          </div>
          <Link
            href="/perfil"
            className="btn btn-primary !py-1.5 !px-3 text-xs font-bold"
          >
            Ver detalle →
          </Link>
        </div>
      </div>

      {/* Smart In-App Notification (Monterrey pilot preference engine) */}
      {!notificationDismissed && (
        <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-surface border border-emerald-500/30 flex items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-fg">Notificación Inteligente</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Monterrey
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5 truncate sm:text-wrap">
                Detectamos <strong>paquetes visibles con foto real</strong> en DistritoTec y San Pedro cerca de ti.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotificationDismissed(true)}
            className="text-muted hover:text-fg text-xs p-1 rounded-md cursor-pointer shrink-0"
            title="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Quick Filter bar */}
      <div className="mt-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input
              id="search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por restaurante, antojo (ej. pizza, sushi, café) o colonia..."
              className="input !pl-10 !py-3 text-sm rounded-xl shadow-xs w-full"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-fg"
              >
                ✕
              </button>
            )}
          </div>

          {/* Monterrey Zone selector */}
          <div className="sm:w-56 shrink-0">
            <select
              id="select-zona"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              className="input !py-3 text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {MONTERREY_ZONAS.map((z) => (
                <option key={z} value={z}>📍 {z}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((c) => {
            const emoji = CAT_EMOJIS[c];
            const isActive = cat === c;
            return (
              <button
                key={c}
                id={`cat-${c}`}
                onClick={() => setCat(c)}
                className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent text-accent-fg border-accent shadow-xs scale-102'
                    : 'border-line bg-surface text-muted hover:text-fg hover:border-muted'
                }`}
              >
                {emoji && <span>{emoji}</span>}
                <span>{c}</span>
              </button>
            );
          })}
        </div>

        {/* Extra Quick Filter Toggles */}
        <div className="flex items-center gap-2 text-xs pt-1">
          <button
            onClick={() => setOnlyUnder100(!onlyUnder100)}
            className={`px-3 py-1 rounded-lg border transition-colors cursor-pointer ${
              onlyUnder100 ? 'bg-amber-soft text-amber-fg border-amber-400 font-semibold' : 'border-line text-muted hover:text-fg'
            }`}
          >
            Menos de $100
          </button>
          <button
            onClick={() => setOnlyFavs(!onlyFavs)}
            className={`px-3 py-1 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
              onlyFavs ? 'bg-accent-soft text-accent border-accent font-semibold' : 'border-line text-muted hover:text-fg'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={onlyFavs ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <span>Solo favoritos {favs.length > 0 && `(${favs.length})`}</span>
          </button>
        </div>
      </div>

      {/* Package listings */}
      {filtered.length === 0 ? (
        <div className="card mt-8 p-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-subtle text-muted flex items-center justify-center mx-auto mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <p className="font-bold text-lg">No encontramos paquetes con esos filtros</p>
          <p className="text-sm text-muted mt-1">Prueba borrando tu búsqueda o cambiando de categoría.</p>
          <button
            onClick={() => { setCat('Todas'); setSearch(''); setOnlyUnder100(false); setOnlyFavs(false); }}
            className="btn btn-ghost mt-4 text-xs font-semibold"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const isFav = favs.includes(p.restaurant.id);
            const discountPct = disc(p.precio_original, p.precio_remate);
            const isLowStock = p.cantidad_disponible <= 3;

            return (
              <article
                key={p.id}
                className="card card-interactive fade-in p-5 flex flex-col justify-between group overflow-hidden"
              >
                <div>
                  {/* Real Vitrina Photo if available */}
                  {p.foto_vitrina && (
                    <div className="relative h-40 -mx-5 -mt-5 mb-3.5 overflow-hidden border-b border-line bg-black">
                      <img
                        src={p.foto_vitrina}
                        alt={p.titulo}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1.5 border border-white/20 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Paquete Visible
                      </span>
                    </div>
                  )}

                  {/* Top bar: Restaurant info & Favorite */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-subtle border border-line flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        {p.restaurant.logo || '🍽️'}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/restaurante/${p.restaurant.id}`}
                          className="font-bold text-sm text-fg hover:text-accent truncate block transition-colors"
                        >
                          {p.restaurant.nombre}
                        </Link>
                        <p className="text-[11px] text-muted flex items-center gap-1.5">
                          <span>{p.restaurant.categoria}</span>
                          <span>•</span>
                          <span className="font-semibold text-amber-500">★ {p.restaurant.rating.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      id={`fav-${p.restaurant.id}`}
                      onClick={() => toggleFavorite(p.restaurant.id)}
                      aria-label={isFav ? 'Dejar de seguir' : 'Seguir'}
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                        isFav
                          ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/40 dark:border-rose-900'
                          : 'border-line text-muted hover:text-rose-500 hover:border-rose-300'
                      }`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-base leading-snug text-fg group-hover:text-accent transition-colors">
                        {p.titulo}
                      </h3>
                    </div>
                    <p className="text-xs text-muted leading-relaxed clamp-2">{p.descripcion}</p>

                    {/* Detected items breakdown */}
                    {p.items_detectados && p.items_detectados.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {p.items_detectados.map((it, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20"
                          >
                            {it.cantidad}x {it.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Badges / Urgency pill */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {isLowStock ? (
                      <span className="badge badge-hot">
                        Últimas {p.cantidad_disponible} disponibles
                      </span>
                    ) : (
                      <span className="badge badge-subtle">
                        Quedan {p.cantidad_disponible} paquetes
                      </span>
                    )}
                    <span className="badge badge-subtle flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Recoge hoy {p.hora_limite}
                    </span>
                  </div>
                </div>

                {/* Footer price & CTA */}
                <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-fg">${p.precio_remate}</span>
                      <span className="text-xs text-muted line-through">${p.precio_original}</span>
                    </div>
                    <span className="badge badge-eco text-[10px] font-bold">
                      Ahorras {discountPct}%
                    </span>
                  </div>

                  <button
                    id={`reserve-${p.id}`}
                    onClick={() => setSelected(p)}
                    className="btn btn-primary !py-2 !px-4 text-xs font-bold"
                  >
                    Rescatar paquete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Favorites carousel/slider section */}
      {favs.length > 0 && (
        <section className="mt-14 pt-8 border-t border-line">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-fg flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-rose-500" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              <span>Tus locales favoritos</span>
              <span className="text-xs font-normal text-muted">({favs.length})</span>
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {favs.map((id) => {
              const r = restaurants.find((x) => x.id === id);
              if (!r) return null;
              return (
                <Link
                  key={id}
                  href={`/restaurante/${id}`}
                  className="card card-interactive shrink-0 p-3.5 flex items-center gap-3 min-w-[200px]"
                >
                  <span className="text-2xl">{r.logo || '🍽️'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{r.nombre}</p>
                    <p className="text-[11px] text-muted flex items-center gap-1">
                      <span>{r.categoria}</span>
                      <span>·</span>
                      <span className="text-amber-500 font-semibold">★ {r.rating.toFixed(1)}</span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Reservation Confirmation Modal (Mercado Pago transparent checkout) */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <div className="text-center pb-2">
            {selected.foto_vitrina && (
              <div className="w-full h-32 rounded-xl overflow-hidden mb-3 border border-line bg-black relative">
                <img src={selected.foto_vitrina} alt={selected.titulo} className="w-full h-full object-cover" />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Paquete Visible
                </span>
              </div>
            )}
            <h3 className="text-xl font-black">{selected.titulo}</h3>
            <p className="text-sm text-muted font-medium">{selected.restaurant.nombre}</p>
          </div>

          {/* Detected items if available */}
          {selected.items_detectados && selected.items_detectados.length > 0 && (
            <div className="my-3 p-3 rounded-xl bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted block mb-1.5">
                Alimentos incluidos (verificados por IA):
              </span>
              <div className="flex flex-wrap gap-1">
                {selected.items_detectados.map((it, idx) => (
                  <span key={idx} className="text-[11px] font-medium px-2 py-0.5 rounded bg-subtle text-fg">
                    <strong>{it.cantidad}x</strong> {it.nombre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          <div className="my-4">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-2">
              Método de pago
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('mercadopago')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'mercadopago'
                    ? 'border-emerald-500 bg-emerald-500/10 text-fg font-bold shadow-xs'
                    : 'border-line text-muted hover:border-muted'
                }`}
              >
                <span className="text-xs font-black text-sky-600 dark:text-sky-400">Mercado Pago</span>
                <span className="text-[10px] text-muted">Tarjeta / Saldo MP</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('efectivo')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  paymentMethod === 'efectivo'
                    ? 'border-emerald-500 bg-emerald-500/10 text-fg font-bold shadow-xs'
                    : 'border-line text-muted hover:border-muted'
                }`}
              >
                <span className="text-xs font-black">💵 Efectivo</span>
                <span className="text-[10px] text-muted">Paga al recoger</span>
              </button>
            </div>
          </div>

          <div className="my-3 p-4 rounded-xl bg-subtle border border-line space-y-2 text-xs">
            <Row k="Precio regular estimado" v={<span className="line-through text-muted font-mono">${selected.precio_original} MXN</span>} />
            <Row k="Descuento de remate" v={<span className="text-accent font-bold">-{disc(selected.precio_original, selected.precio_remate)}% OFF</span>} />
            <Row k="Horario de recolección" v={<span className="font-semibold text-fg">Hoy antes de {selected.hora_limite}</span>} />
            <Row k="Punto de entrega" v={<span className="text-fg">{selected.restaurant.direccion}</span>} />
            <div className="border-t border-line pt-2.5 flex justify-between items-baseline font-bold text-sm">
              <span className="text-fg">Total a pagar:</span>
              <span className="text-xl font-black text-accent">${selected.precio_remate} MXN</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setSelected(null)}
              disabled={isProcessing}
              className="btn btn-ghost flex-1 text-xs"
            >
              Cancelar
            </button>
            <button
              id="confirm-order"
              onClick={confirm}
              disabled={isProcessing}
              className="btn btn-primary flex-1 text-xs font-bold flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Procesando...
                </>
              ) : (
                paymentMethod === 'mercadopago' ? 'Pagar y Apartar' : 'Reservar para pagar en tienda'
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Confirmed Ticket Modal with QR Code */}
      {confirmed && (
        <Modal onClose={() => setConfirmed(null)}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-accent-soft text-accent flex items-center justify-center mx-auto mb-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-xs uppercase font-extrabold tracking-wider text-accent">¡Paquete Rescatado con Éxito!</p>
            <h3 className="text-lg font-black mt-1">{confirmed.pkg.restaurant.nombre}</h3>
            <p className="text-xs text-muted mt-0.5">{confirmed.pkg.titulo}</p>

            {/* Simulated QR Code Visual */}
            <div className="my-4 p-4 rounded-2xl bg-subtle border border-dashed border-accent/40 text-center">
              <QrCodeVisual value={confirmed.codigo} />
              <p className="text-[11px] font-bold text-muted uppercase tracking-wider mt-2 mb-0.5">
                Código para canje rápido en mostrador
              </p>
              <p className="text-3xl font-black font-mono tracking-widest text-accent py-1 select-all">
                {confirmed.codigo}
              </p>
              <p className="text-[11px] text-muted">
                Muestra este código o QR al personal antes de las <strong>{confirmed.pkg.hora_limite}</strong>
              </p>
            </div>

            <div className="text-xs text-muted bg-surface p-3 rounded-xl border border-line text-left space-y-1">
              <p className="font-semibold text-fg">Dirección de entrega:</p>
              <p>{confirmed.pkg.restaurant.direccion}</p>
            </div>

            <button
              id="close-order-modal"
              onClick={() => setConfirmed(null)}
              className="btn btn-primary w-full mt-5 text-xs font-bold"
            >
              Entendido, ya guardé mi código
            </button>
          </div>
        </Modal>
      )}

      {/* Orders List Modal */}
      {showOrders && (
        <Modal onClose={() => setShowOrders(false)}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black flex items-center gap-2">
              <span>Mis pedidos</span>
              <span className="text-xs font-normal text-muted">({myOrders.length})</span>
            </h3>
            <button onClick={() => setShowOrders(false)} className="text-xs text-muted hover:text-fg">
              ✕
            </button>
          </div>

          {myOrders.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <div className="w-12 h-12 rounded-2xl bg-subtle text-muted flex items-center justify-center mx-auto mb-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <p className="font-semibold text-sm">Aún no tienes pedidos registrados</p>
              <p className="text-xs mt-1">¡Rescata tu primer paquete hoy!</p>
            </div>
          ) : (
            <ul className="divide-y divide-line max-h-[55vh] overflow-y-auto pr-1">
              {myOrders.map((o) => (
                <li key={o.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate text-fg">{o.pkg?.titulo ?? 'Paquete rescatado'}</p>
                    <p className="text-xs text-muted">{o.rest?.nombre}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs">
                      <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-subtle border border-line text-fg">
                        {o.codigo_recoleccion}
                      </span>
                      <span className={`text-[11px] font-semibold ${
                        o.estado === 'completada' ? 'text-accent' : 'text-amber-500'
                      }`}>
                        ● {o.estado === 'completada' ? 'Entregada' : 'Pendiente de entrega'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setShowOrders(false);
                        const pkgData = o.pkg
                          ? {
                              ...o.pkg,
                              restaurant: o.rest || {
                                id: o.restaurant_id,
                                nombre: 'Comercio local',
                                direccion: 'Mostrador del comercio',
                                categoria: 'Comida',
                                descripcion: '',
                                logo: '🍽️',
                                horario: 'Hoy',
                                rating: 5,
                                totalReviews: 1,
                                ownerId: '',
                                createdAt: '',
                              },
                            }
                          : {
                              id: o.package_id,
                              restaurant_id: o.restaurant_id,
                              titulo: 'Paquete de comida',
                              descripcion: 'Recolección en mostrador',
                              cantidad: 1,
                              cantidad_disponible: 1,
                              precio_original: o.precio_pagado * 2,
                              precio_remate: o.precio_pagado,
                              hora_limite: '22:00',
                              disponible: true,
                              createdAt: o.createdAt,
                              restaurant: o.rest || {
                                id: o.restaurant_id,
                                nombre: 'Comercio local',
                                direccion: 'Mostrador del comercio',
                                categoria: 'Comida',
                                descripcion: '',
                                logo: '🍽️',
                                horario: 'Hoy',
                                rating: 5,
                                totalReviews: 1,
                                ownerId: '',
                                createdAt: '',
                              },
                            };
                        setConfirmed({
                          codigo: o.codigo_recoleccion,
                          pkg: pkgData,
                        });
                      }}
                      className="btn btn-secondary !py-1.5 !px-2.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs hover:border-accent/40"
                      title="Ver código QR para recoger"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"/></svg>
                      <span>Ver QR</span>
                    </button>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-fg">${o.precio_pagado}</span>
                      <span className="block text-[10px] text-muted">MXN</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div className="card fade-in w-full max-w-md p-6 shadow-2xl border-line" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function QrCodeVisual({ value }: { value: string }) {
  return (
    <div className="w-32 h-32 mx-auto my-3 p-2 bg-white rounded-xl shadow-xs border border-line flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full text-zinc-900" fill="currentColor">
        {/* Corner markers */}
        <rect x="8" y="8" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="4" rx="2" />
        <rect x="15" y="15" width="12" height="12" rx="1" />
        <rect x="66" y="8" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="4" rx="2" />
        <rect x="73" y="15" width="12" height="12" rx="1" />
        <rect x="8" y="66" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="4" rx="2" />
        <rect x="15" y="73" width="12" height="12" rx="1" />
        {/* Sample data matrix dots */}
        <rect x="42" y="10" width="6" height="6" />
        <rect x="52" y="10" width="6" height="6" />
        <rect x="42" y="22" width="6" height="6" />
        <rect x="52" y="22" width="6" height="6" />
        <rect x="10" y="42" width="6" height="6" />
        <rect x="22" y="42" width="6" height="6" />
        <rect x="40" y="40" width="8" height="8" />
        <rect x="56" y="42" width="6" height="6" />
        <rect x="72" y="42" width="6" height="6" />
        <rect x="84" y="42" width="6" height="6" />
        <rect x="42" y="56" width="6" height="6" />
        <rect x="54" y="56" width="6" height="6" />
        <rect x="42" y="72" width="6" height="6" />
        <rect x="54" y="72" width="8" height="8" />
        <rect x="72" y="72" width="6" height="6" />
        <rect x="84" y="84" width="6" height="6" />
      </svg>
    </div>
  );
}
