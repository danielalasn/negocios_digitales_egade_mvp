'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';

export default function ConsumerProfilePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);
  const updateUserProfile = useStore((s) => s.updateUserProfile);
  const orders = useStore((s) => s.orders);
  const packages = useStore((s) => s.packages);
  const restaurants = useStore((s) => s.restaurants);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hydrated || !currentUser) return;
    setNombre(currentUser.nombre);
    setEmail(currentUser.email);
  }, [hydrated, currentUser]);

  if (!hydrated) return null;

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-lg">Inicia sesión para ver tu perfil</p>
        <p className="text-sm text-muted mt-1.5">Accede a tus pedidos y métricas de impacto.</p>
        <Link href="/" className="btn btn-primary mt-6 text-xs font-bold inline-flex items-center gap-1.5">
          Ir a iniciar sesión →
        </Link>
      </div>
    );
  }

  const myOrders = orders
    .filter((o) => o.user_id === currentUser.id)
    .map((o) => ({
      ...o,
      pkg: packages.find((p) => p.id === o.package_id),
      rest: restaurants.find((r) => r.id === o.restaurant_id),
    }))
    .reverse();

  // Calculations
  const totalBags = myOrders.length;
  const moneySaved = myOrders.reduce((acc, o) => {
    const orig = o.pkg?.precio_original ?? (o.precio_pagado * 2.5);
    return acc + Math.max(0, orig - o.precio_pagado);
  }, 0) + 380; // Baseline demo savings
  const kgFoodSaved = ((totalBags + 3) * 1.6).toFixed(1);
  const co2Avoided = ((totalBags + 3) * 2.5).toFixed(1);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setError('');
    updateUserProfile({ nombre: nombre.trim(), email: email.trim() });
    setToast('¡Perfil actualizado correctamente!');
    setTimeout(() => setToast(''), 3000);
  };

  const favRestaurants = (currentUser.restaurantes_favoritos || [])
    .map((id) => restaurants.find((r) => r.id === id))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href={currentUser.rol === 'b2b' ? '/b2b' : '/b2c'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors"
        >
          <span>←</span> Volver al explorador
        </Link>
      </div>

      {/* Profile Header Card */}
      <div className="card p-6 border-line bg-gradient-to-r from-surface via-subtle to-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center text-2xl font-black shadow-md shrink-0">
            {currentUser.nombre ? currentUser.nombre[0].toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">{currentUser.nombre}</h1>
              <span className="badge badge-eco text-[10px]">
                {currentUser.rol === 'b2b' ? 'Partner B2B' : 'Rescatador'}
              </span>
            </div>
            <p className="text-xs text-muted mt-1">{currentUser.email}</p>
            <p className="text-[11px] text-muted mt-0.5">
              Miembro de Buen Bocado desde {new Date(currentUser.createdAt || Date.now()).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right self-stretch sm:self-auto justify-end">
          <div className="bg-surface border border-line px-4 py-2.5 rounded-xl text-center shadow-2xs">
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block">Bolsas Salvadas</span>
            <span className="text-xl font-black text-accent">{totalBags}</span>
          </div>
        </div>
      </div>

      {/* Impact & Savings Dashboard */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-fg uppercase tracking-wider mb-3">
          Tu impacto & ahorros acumulados
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Dinero Ahorrado"
            value={`$${moneySaved}`}
            unit="MXN"
            color="text-accent"
          />
          <StatCard
            label="Comida Rescatada"
            value={`${kgFoodSaved}`}
            unit="kg"
            color="text-emerald-600"
          />
          <StatCard
            label="CO₂ Prevenido"
            value={`${co2Avoided}`}
            unit="kg"
            color="text-teal-600"
          />
          <StatCard
            label="Locales Apoyados"
            value={myOrders.length > 0 ? Array.from(new Set(myOrders.map(o => o.restaurant_id))).length : 2}
            unit="locales"
            color="text-amber-500"
          />
        </div>
      </div>

      {/* Two columns: Edit Info & Orders */}
      <div className="mt-8 grid md:grid-cols-5 gap-8">
        {/* Left: Edit Personal Info Form */}
        <div className="md:col-span-2">
          <div className="card p-6 border-line space-y-4">
            <div>
              <h3 className="text-base font-bold">Datos personales</h3>
              <p className="text-xs text-muted mt-0.5">Modifica tu nombre o correo de contacto.</p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="label">Nombre completo</label>
                <input
                  id="profile-name"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input text-xs"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="label">Correo electrónico</label>
                <input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input text-xs"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              {error && (
                <p className="text-xs text-danger font-medium bg-danger-soft p-2.5 rounded-lg">
                  {error}
                </p>
              )}

              <button
                id="save-profile-btn"
                type="submit"
                className="btn btn-primary w-full text-xs font-bold !py-2.5"
              >
                Guardar cambios
              </button>
            </form>
          </div>

          {/* Favorite places snippet */}
          {favRestaurants.length > 0 && (
            <div className="card p-5 border-line mt-4">
              <h4 className="text-xs font-bold text-fg uppercase tracking-wider mb-3">
                Tus restaurantes favoritos ({favRestaurants.length})
              </h4>
              <div className="space-y-2">
                {favRestaurants.map((r) => r && (
                  <Link
                    key={r.id}
                    href={`/restaurante/${r.id}`}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-subtle transition-colors text-xs"
                  >
                    <span className="text-lg">{r.logo || '🍽️'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-fg">{r.nombre}</p>
                      <p className="text-[11px] text-muted">{r.categoria} · ★ {r.rating.toFixed(1)}</p>
                    </div>
                    <span className="text-muted text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Order History */}
        <div className="md:col-span-3">
          <div className="card p-6 border-line">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">
                Historial de pedidos ({myOrders.length})
              </h3>
              {myOrders.length > 0 && (
                <span className="text-xs text-muted">Más recientes primero</span>
              )}
            </div>

            {myOrders.length === 0 ? (
              <div className="py-16 text-center text-muted">
                <div className="w-12 h-12 rounded-2xl bg-subtle text-muted flex items-center justify-center mx-auto mb-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <p className="font-bold text-sm text-fg">Todavía no has hecho pedidos</p>
                <p className="text-xs mt-1 max-w-xs mx-auto">
                  Explora las bolsas sorpresa del día y rescata comida deliciosa con hasta 70% de descuento.
                </p>
                <Link href="/b2c" className="btn btn-primary mt-5 text-xs font-bold">
                  Ver bolsas disponibles hoy
                </Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {myOrders.map((o) => {
                  const isPending = o.estado === 'pendiente';
                  return (
                    <div
                      key={o.id}
                      className="p-4 rounded-xl border border-line bg-surface hover:border-accent/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="text-2xl mt-0.5 shrink-0">
                          {o.rest?.logo || '🍽️'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-fg truncate">
                            {o.pkg?.titulo || 'Bolsa Sorpresa'}
                          </p>
                          <Link
                            href={`/restaurante/${o.restaurant_id}`}
                            className="text-xs text-muted hover:text-accent font-medium transition-colors"
                          >
                            {o.rest?.nombre || 'Restaurante'}
                          </Link>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-subtle border border-line text-fg tracking-wider">
                              {o.codigo_recoleccion}
                            </span>
                            <span
                              className={`text-[11px] font-bold ${
                                isPending ? 'text-amber-500' : 'text-accent'
                              }`}
                            >
                              ● {isPending ? 'Listo para recoger' : 'Entregado'}
                            </span>
                            <span className="text-[11px] text-muted">
                              {new Date(o.createdAt).toLocaleDateString('es-MX', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line">
                        <span className="text-lg font-black text-fg">${o.precio_pagado}</span>
                        <span className="text-xs text-muted block">MXN pagados</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="fade-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-fg text-bg text-xs font-bold shadow-2xl flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: React.ReactNode;
  unit: string;
  color: string;
}) {
  return (
    <div className="card p-4 flex flex-col justify-between">
      <div className="mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      </div>
      <div>
        <span className={`text-2xl font-black ${color}`}>{value}</span>
        <span className="text-[11px] text-muted ml-1 font-semibold">{unit}</span>
      </div>
    </div>
  );
}
