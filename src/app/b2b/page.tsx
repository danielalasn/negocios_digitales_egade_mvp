'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';
import { VisionUploader, VisionData } from '@/components/VisionUploader';

type Tab = 'paquetes' | 'ordenes' | 'nuevo';

const disc = (o: number, r: number) => Math.round(((o - r) / o) * 100);

export default function B2BPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);
  const restaurants = useStore((s) => s.restaurants);
  const packages = useStore((s) => s.packages);
  const orders = useStore((s) => s.orders);
  const users = useStore((s) => s.users);
  const createPackage = useStore((s) => s.createPackage);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const deletePackage = useStore((s) => s.deletePackage);

  const [tab, setTab] = useState<Tab>('paquetes');
  const [creationMode, setCreationMode] = useState<'vision' | 'manual'>('vision');
  const [toast, setToast] = useState('');
  const [f, setF] = useState({ titulo: '', desc: '', cantidad: '5', orig: '', rem: '', hora: '22:00' });
  const [err, setErr] = useState('');
  const [quickCode, setQuickCode] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const rest =
    restaurants.find((r) => r.ownerId === currentUser?.id || (r as any).owner_id === currentUser?.id) ||
    (currentUser?.id === 'user-b2b-1' || currentUser?.email === 'marco@trattoria.com'
      ? restaurants.find((r) => r.id === 'rest-1') || restaurants[0]
      : (currentUser?.rol === 'b2b' ? restaurants[0] : undefined));

  const myPkgs = useMemo(() => packages.filter((p) => p.restaurant_id === rest?.id), [packages, rest]);
  const myOrders = useMemo(
    () =>
      orders
        .filter((o) => o.restaurant_id === rest?.id)
        .map((o) => ({
          ...o,
          titulo: packages.find((p) => p.id === o.package_id)?.titulo,
          cliente: users.find((u) => u.id === o.user_id)?.nombre,
        }))
        .reverse(),
    [orders, packages, users, rest]
  );

  if (!hydrated) return null;

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-lg">Inicia sesión para entrar</p>
        <p className="text-sm text-muted mt-1.5">Esta sección requiere una cuenta de restaurante (B2B).</p>
        <Link href="/" className="btn btn-primary mt-6 text-xs font-bold inline-flex items-center gap-1.5">
          Ir a iniciar sesión →
        </Link>
      </div>
    );
  }

  if (currentUser.rol !== 'b2b') {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-lg">Esta sección es para comercios</p>
        <p className="text-sm text-muted mt-1.5">Actualmente estás con una cuenta de cliente ({currentUser.nombre}).</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/b2c" className="btn btn-primary text-xs font-bold">Ir a compras (B2C)</Link>
          <Link href="/" className="btn btn-ghost text-xs font-semibold">Cambiar de cuenta</Link>
        </div>
      </div>
    );
  }

  if (!rest) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="font-bold text-lg">Sin restaurante asociado</p>
        <p className="text-sm text-muted mt-1.5">Tu cuenta ({currentUser.email}) no tiene un restaurante registrado.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary text-xs font-bold">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const pending = myOrders.filter((o) => o.estado === 'pendiente').length;
  const earnings = myOrders.filter((o) => o.estado === 'completada').reduce((a, o) => a + o.precio_pagado, 0);
  const active = myPkgs.filter((p) => p.disponible).length;

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    const o = parseFloat(f.orig), r = parseFloat(f.rem);
    if (!f.titulo || !o || !r) return setErr('Completa los campos requeridos.');
    if (r >= o) return setErr('El precio de remate debe ser menor al original.');
    createPackage({ restaurant_id: rest.id, titulo: f.titulo, descripcion: f.desc, cantidad: parseInt(f.cantidad) || 1, precio_original: o, precio_remate: r, hora_limite: f.hora });
    setF({ titulo: '', desc: '', cantidad: '5', orig: '', rem: '', hora: '22:00' });
    setErr(''); setTab('paquetes'); flash('Paquete publicado');
  };

  const handleVisionPublish = (data: VisionData) => {
    createPackage({
      restaurant_id: rest.id,
      titulo: data.titulo,
      descripcion: data.descripcion,
      cantidad: 5,
      precio_original: data.precio_original_total,
      precio_remate: data.precio_remate_sugerido,
      hora_limite: data.hora_limite_sugerida,
      foto_vitrina: data.foto_vitrina,
      items_detectados: data.items,
      aprobado_sin_edicion: data.aprobado_sin_edicion,
    });
    setTab('paquetes');
    flash('¡Paquete publicado en 1 clic con IA!');
  };

  const validateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = quickCode.trim().toUpperCase();
    const formatted = clean.startsWith('#') ? clean : `#${clean}`;
    const target = myOrders.find((o) => o.codigo_recoleccion === formatted && o.estado === 'pendiente');
    if (!target) {
      flash('Código no encontrado o ya entregado');
      return;
    }
    updateOrderStatus(target.id, 'completada');
    setQuickCode('');
    flash(`¡Pedido ${formatted} validado y entregado!`);
  };

  const tabs: [Tab, string][] = [
    ['paquetes', 'Mis paquetes activos'],
    ['ordenes', `Pedidos por entregar${pending ? ` (${pending})` : ''}`],
    ['nuevo', '+ Publicar nuevo paquete'],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-24">
      {/* Restaurant Header */}
      <div className="card p-6 border-line bg-gradient-to-r from-surface via-subtle to-surface flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-accent-soft text-accent border border-accent/20 flex items-center justify-center text-3xl shadow-xs shrink-0">
            {rest.logo || '🍽️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight">{rest.nombre}</h1>
              <span className="badge badge-eco text-[10px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Activo
              </span>
            </div>
            <p className="text-xs text-muted mt-1 flex flex-wrap items-center gap-2">
              <span>{rest.categoria}</span>
              <span>·</span>
              <span>{rest.direccion}</span>
              <span>·</span>
              <span>{rest.horario}</span>
            </p>
          </div>
        </div>

        <Link
          href={`/restaurante/${rest.id}`}
          className="btn btn-ghost text-xs !py-2 !px-3 font-semibold shrink-0"
        >
          Ver perfil público →
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
        <Stat label="Paquetes activos" value={active} color="text-accent" />
        <Stat label="Pedidos pendientes" value={pending} color={pending > 0 ? "text-amber-500 font-black animate-pulse" : "text-fg"} />
        <Stat label="Ingresos recuperados" value={`$${earnings}`} color="text-emerald-600" />
        <Stat label="Merma evitada" value={`${(myOrders.length * 1.8 + 8).toFixed(0)} kg`} color="text-teal-600" />
      </div>

      {/* Quick redemption code input box */}
      <div className="mt-6 card p-4 bg-accent-soft/30 border border-accent/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-fg">Canje rápido en mostrador</p>
            <p className="text-[11px] text-muted">Ingresa el código que te muestra el cliente para marcarlo como entregado.</p>
          </div>
        </div>
        <form onSubmit={validateCode} className="flex gap-2 shrink-0">
          <input
            id="quick-redeem-input"
            type="text"
            placeholder="#A1B2"
            value={quickCode}
            onChange={(e) => setQuickCode(e.target.value)}
            className="input !py-1.5 !px-3 text-xs font-mono font-bold w-28 uppercase text-center"
          />
          <button type="submit" className="btn btn-primary !py-1.5 !px-3.5 text-xs font-bold shrink-0">
            Validar
          </button>
        </form>
      </div>

      <div className="mt-8 flex gap-2 border-b border-line pb-1 overflow-x-auto no-scrollbar">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              tab === id
                ? 'bg-accent text-accent-fg shadow-xs'
                : 'text-muted hover:text-fg hover:bg-subtle'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'paquetes' &&
          (myPkgs.length === 0 ? (
            <Empty title="Aún no publicas paquetes" sub="Publica tu primer paquete de comida.">
              <button onClick={() => setTab('nuevo')} className="btn btn-primary mt-5">Publicar paquete</button>
            </Empty>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myPkgs.map((p) => {
                const sold = p.cantidad - p.cantidad_disponible;
                return (
                  <article key={p.id} className="card fade-in p-5 overflow-hidden flex flex-col justify-between">
                    <div>
                      {p.foto_vitrina && (
                        <div className="relative h-36 -mx-5 -mt-5 mb-4 overflow-hidden border-b border-line bg-black">
                          <img src={p.foto_vitrina} alt={p.titulo} className="w-full h-full object-cover" />
                          {p.aprobado_sin_edicion && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                              ⚡ Publicado con IA (1-clic)
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between gap-2">
                        <h3 className="font-bold leading-snug">{p.titulo}</h3>
                        <span className={`text-xs font-bold ${p.disponible ? 'text-accent' : 'text-danger'}`}>{p.disponible ? 'Activa' : 'Agotada'}</span>
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
                        <span className="text-xl font-black text-fg">${p.precio_remate}</span>
                        <span className="text-sm text-muted line-through">${p.precio_original}</span>
                        <span className="text-xs text-accent font-bold">-{disc(p.precio_original, p.precio_remate)}%</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/50">
                      <div className="flex justify-between text-xs text-muted mb-1.5">
                        <span>Vendidas {sold}/{p.cantidad}</span><span>Hasta {p.hora_limite}</span>
                      </div>
                      <div className="h-1 rounded-full bg-subtle overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${p.cantidad ? (sold / p.cantidad) * 100 : 0}%` }} />
                      </div>
                      <button id={`delete-pkg-${p.id}`} onClick={() => deletePackage(p.id)} className="mt-3 text-xs text-muted hover:text-danger transition-colors cursor-pointer">
                        Eliminar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}

        {tab === 'ordenes' &&
          (myOrders.length === 0 ? (
            <Empty title="Sin pedidos todavía" sub="Los pedidos de tus clientes aparecerán aquí." />
          ) : (
            <ul className="space-y-3">
              {myOrders.map((o) => (
                <li key={o.id} className="card fade-in p-4 flex items-center gap-4">
                  <span className="font-mono text-lg font-semibold tracking-widest px-3 py-2 rounded-lg bg-subtle border border-line">{o.codigo_recoleccion}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{o.titulo ?? 'Paquete eliminado'}</p>
                    <p className="text-xs text-muted">
                      {o.cliente ?? 'Cliente'} · {new Date(o.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · ${o.precio_pagado}
                    </p>
                  </div>
                  {o.estado === 'pendiente' ? (
                    <button id={`complete-order-${o.id}`} onClick={() => { updateOrderStatus(o.id, 'completada'); flash('Pedido completado'); }} className="btn btn-primary !py-1.5">
                      Completada
                    </button>
                  ) : (
                    <span className={`text-xs ${o.estado === 'completada' ? 'text-accent' : 'text-danger'}`}>{o.estado}</span>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {tab === 'nuevo' && (
          <div className="max-w-xl mx-auto space-y-4">
            <div className="flex p-1 bg-subtle rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setCreationMode('vision')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  creationMode === 'vision'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-muted hover:text-fg'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Foto con IA (Recomendado 1-Clic)
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('manual')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  creationMode === 'manual'
                    ? 'bg-surface text-fg shadow-xs border border-line'
                    : 'text-muted hover:text-fg'
                }`}
              >
                Formulario Manual
              </button>
            </div>

            {creationMode === 'vision' ? (
              <VisionUploader
                categoryHint={rest?.categoria || 'panaderia'}
                restaurantName={rest?.nombre || 'Mi Comercio'}
                onPublish={handleVisionPublish}
                onCancel={() => setCreationMode('manual')}
              />
            ) : (
              <form onSubmit={publish} className="card fade-in p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Nuevo paquete de comida</h2>
                  <p className="text-sm text-muted">Publica tus excedentes del día de forma manual.</p>
                </div>
                <div><label className="label">Título</label><input id="pkg-titulo" className="input" placeholder="Paquete italiano mixto" value={f.titulo} onChange={set('titulo')} /></div>
                <div><label className="label">Descripción</label><textarea id="pkg-desc" rows={2} className="input" placeholder="¿Qué puede incluir?" value={f.desc} onChange={set('desc')} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label">Cantidad</label><input id="pkg-cantidad" type="number" min="1" className="input" value={f.cantidad} onChange={set('cantidad')} /></div>
                  <div><label className="label">Hora límite</label><input id="pkg-hora" type="time" className="input" value={f.hora} onChange={set('hora')} /></div>
                  <div><label className="label">Precio original</label><input id="pkg-precio-orig" type="number" min="1" className="input" placeholder="350" value={f.orig} onChange={set('orig')} /></div>
                  <div><label className="label">Precio de remate</label><input id="pkg-precio-remate" type="number" min="1" className="input" placeholder="99" value={f.rem} onChange={set('rem')} /></div>
                </div>
                {err && <p className="text-sm text-danger">{err}</p>}
                <button id="publish-pkg" className="btn btn-primary w-full">Publicar paquete</button>
              </form>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div className="fade-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-fg text-bg text-sm shadow-lg">{toast}</div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="card p-4 flex flex-col justify-between">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <p className={`text-2xl font-black mt-2 ${color || 'text-fg'}`}>{value}</p>
    </div>
  );
}

function Empty({ title, sub, children }: { title: string; sub: string; children?: React.ReactNode }) {
  return (
    <div className="card p-14 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted mt-1">{sub}</p>
      {children}
    </div>
  );
}
