'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore, User } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';

type Step = 'role' | 'b2c' | 'b2b' | 'login';

const CATEGORIES = ['Mexicana', 'Italiana', 'Japonesa', 'Hamburguesas', 'Café & Pastelería', 'Tailandesa', 'China', 'Vegana', 'Mariscos', 'Otra'];

export default function HomePage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { currentUser, users, login, logout, registerUser, registerRestaurant } = useStore();

  const [step, setStep] = useState<Step>('role');
  const [error, setError] = useState('');
  const [f, setF] = useState({ nombre: '', email: '', restName: '', cat: 'Mexicana', desc: '', horario: '09:00 - 22:00', dir: '' });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const go = (s: Step) => { setStep(s); setError(''); };
  const exists = (email: string) => users.some((u) => u.email.toLowerCase() === email.toLowerCase());

  const submitB2C = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nombre || !f.email) return setError('Completa todos los campos.');
    if (exists(f.email)) return setError('Ese correo ya está registrado.');
    registerUser({ nombre: f.nombre, email: f.email, rol: 'b2c' });
    router.push('/b2c');
  };

  const submitB2B = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nombre || !f.email || !f.restName || !f.dir) return setError('Completa los campos obligatorios.');
    if (exists(f.email)) return setError('Ese correo ya está registrado.');
    registerRestaurant({ nombre: f.nombre, email: f.email, restaurantName: f.restName, categoria: f.cat, descripcion: f.desc, horario: f.horario, direccion: f.dir });
    router.push('/b2b');
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let u = users.find((x) => x.email.toLowerCase() === f.email.toLowerCase());
    if (!u) {
      if (f.email.toLowerCase() === 'marco@trattoria.com') {
        u = {
          id: 'user-b2b-1',
          nombre: 'Chef Marco',
          email: 'marco@trattoria.com',
          rol: 'b2b',
          restaurantes_favoritos: [],
          createdAt: '2024-01-01T00:00:00Z',
        };
      } else if (f.email.toLowerCase() === 'sofia@demo.com') {
        u = {
          id: 'demo-client',
          nombre: 'Sofía Martínez',
          email: 'sofia@demo.com',
          rol: 'b2c',
          restaurantes_favoritos: ['rest-1', 'rest-3'],
          createdAt: '2024-01-01T00:00:00Z',
        };
      }
    }
    if (!u) return setError('No encontramos esa cuenta.');
    login(u);
    router.push(u.rol === 'b2b' ? '/b2b' : '/b2c');
  };

  const quickDemoB2C = () => {
    const demo: User = {
      id: 'demo-client',
      nombre: 'Sofía Martínez',
      email: 'sofia@demo.com',
      rol: 'b2c',
      restaurantes_favoritos: ['rest-1', 'rest-3'],
      createdAt: '2024-01-01T00:00:00Z',
    };
    login(demo);
    router.push('/b2c');
  };

  const quickDemoB2B = () => {
    const demo: User = {
      id: 'user-b2b-1',
      nombre: 'Chef Marco',
      email: 'marco@trattoria.com',
      rol: 'b2b',
      restaurantes_favoritos: [],
      createdAt: '2024-01-01T00:00:00Z',
    };
    login(demo);
    router.push('/b2b');
  };

  const Back = () => (
    <button type="button" onClick={() => go('role')} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-6 transition-colors">
      <span>←</span> Volver al inicio
    </button>
  );
  const Err = () => error ? <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{error}</p> : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      {step === 'role' && (
        <div className="fade-in space-y-12">
          {hydrated && currentUser && (
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-accent-soft/40 border border-accent/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="text-xs">
                <span className="text-muted block">Sesión activa:</span>
                <span className="font-bold text-fg text-sm">{currentUser.nombre}</span>{' '}
                <span className="badge badge-eco text-[10px] ml-1">
                  {currentUser.rol === 'b2b' ? 'Partner B2B' : 'Cliente'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={currentUser.rol === 'b2b' ? '/b2b' : '/b2c'}
                  className="btn btn-primary !py-1.5 !px-3.5 text-xs font-bold"
                >
                  Ir a mi panel →
                </Link>
                <button
                  onClick={() => logout()}
                  className="btn btn-ghost !py-1.5 !px-3 text-xs text-muted hover:text-danger cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

          {/* Hero Section */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-soft text-accent text-xs font-semibold mb-6">
              <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
              Iniciativa contra el desperdicio de alimentos
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-balance">
              Salva comida,<br />
              <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                paga una fracción.
              </span>
            </h1>

            <p className="mt-5 text-lg text-muted text-pretty max-w-xl mx-auto">
              Restaurantes, panaderías y cafeterías locales empacan sus excedentes del día en <strong>Bolsas Sorpresa</strong> con hasta 70% de descuento.
            </p>
          </div>

          {/* Value props & live badges */}
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
            <div className="card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-accent">70%</p>
              <p className="text-xs text-muted font-medium mt-0.5">Descuento promedio</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-fg">+2,400</p>
              <p className="text-xs text-muted font-medium mt-0.5">Comidas salvadas</p>
            </div>
            <div className="card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-500">5.8 t</p>
              <p className="text-xs text-muted font-medium mt-0.5">CO₂ evitado</p>
            </div>
          </div>

          {/* Role selector cards */}
          <div className="max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
            <button
              id="role-b2c"
              onClick={() => go('b2c')}
              className="card card-interactive text-left p-6 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-fg">Quiero comprar bolsas</h2>
                  <span className="badge badge-eco text-[10px]">Cliente</span>
                </div>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  Descubre pizzas, sushi, panadería y comida artesanal cerca de ti a precios simbólicos.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-accent">
                <span>Registrarme como cliente</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            <button
              id="role-b2b"
              onClick={() => go('b2b')}
              className="card card-interactive text-left p-6 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-amber-soft text-amber-fg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-fg">Tengo un negocio</h2>
                  <span className="badge badge-hot text-[10px]">Partner B2B</span>
                </div>
                <p className="text-sm text-muted mt-1.5 leading-relaxed">
                  Recupera el costo de tus excedentes, reduce tu merma a cero y atrae clientes nuevos a tu local.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <span>Dar de alta mi comercio</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="max-w-xl mx-auto rounded-2xl bg-subtle/80 border border-line p-5 text-center">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
              Acceso rápido para probar el prototipo
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="demo-client-btn"
                onClick={quickDemoB2C}
                className="btn btn-ghost !py-2 !px-4 text-xs font-semibold hover:border-accent hover:text-accent"
              >
                Entrar como Sofía (Cliente Demo)
              </button>
              <button
                id="demo-b2b-btn"
                onClick={quickDemoB2B}
                className="btn btn-ghost !py-2 !px-4 text-xs font-semibold hover:border-accent hover:text-accent"
              >
                Entrar como Chef Marco (Trattoria Roma)
              </button>
            </div>
          </div>

          {/* Already have account */}
          <div className="text-center pt-2">
            <p className="text-sm text-muted">
              ¿Ya tienes cuenta creada?{' '}
              <button id="go-login" onClick={() => go('login')} className="font-semibold text-fg hover:text-accent underline underline-offset-4 cursor-pointer">
                Inicia sesión aquí
              </button>
            </p>
          </div>
        </div>
      )}

      {step === 'b2c' && (
        <form onSubmit={submitB2C} className="card max-w-md mx-auto p-8 fade-in space-y-5">
          <Back />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Crear cuenta de cliente</h1>
            <p className="text-sm text-muted mt-1">Regístrate para rescatar bolsas sorpresa cerca de ti.</p>
          </div>
          <div>
            <label className="label">Tu nombre completo</label>
            <input id="b2c-nombre" placeholder="Ej. Ana García" className="input" value={f.nombre} onChange={set('nombre')} />
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input id="b2c-email" type="email" placeholder="ana@ejemplo.com" className="input" value={f.email} onChange={set('email')} />
          </div>
          <Err />
          <button id="b2c-submit" className="btn btn-primary w-full !py-3 font-semibold">
            Empezar a rescatar comida →
          </button>
        </form>
      )}

      {step === 'b2b' && (
        <form onSubmit={submitB2B} className="card max-w-lg mx-auto p-8 fade-in space-y-5">
          <Back />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registra tu comercio</h1>
            <p className="text-sm text-muted mt-1">Comienza a monetizar tus excedentes hoy mismo.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Tu nombre</label>
              <input id="b2b-nombre" placeholder="Carlos López" className="input" value={f.nombre} onChange={set('nombre')} />
            </div>
            <div>
              <label className="label">Correo de contacto</label>
              <input id="b2b-email" type="email" placeholder="contacto@negocio.com" className="input" value={f.email} onChange={set('email')} />
            </div>
          </div>
          <div>
            <label className="label">Nombre del restaurante / local</label>
            <input id="b2b-rest" placeholder="Ej. Panadería Artesanal Miga" className="input" value={f.restName} onChange={set('restName')} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Categoría</label>
              <select id="b2b-cat" className="input" value={f.cat} onChange={set('cat')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Horario de atención</label>
              <input id="b2b-horario" placeholder="09:00 - 21:00" className="input" value={f.horario} onChange={set('horario')} />
            </div>
          </div>
          <div>
            <label className="label">Dirección o colonia</label>
            <input id="b2b-dir" placeholder="Col. Roma Norte, CDMX" className="input" value={f.dir} onChange={set('dir')} />
          </div>
          <div>
            <label className="label">Breve descripción del concepto</label>
            <textarea id="b2b-desc" rows={2} placeholder="Especialidad en panes de masa madre y repostería fina..." className="input" value={f.desc} onChange={set('desc')} />
          </div>
          <Err />
          <button id="b2b-submit" className="btn btn-primary w-full !py-3 font-semibold">
            Activar mi restaurante en 2g2g →
          </button>
        </form>
      )}

      {step === 'login' && (
        <form onSubmit={submitLogin} className="card max-w-md mx-auto p-8 fade-in space-y-5">
          <Back />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bienvenido de vuelta</h1>
            <p className="text-sm text-muted mt-1">Ingresa el correo con el que te registraste.</p>
          </div>
          <div>
            <label className="label">Correo electrónico</label>
            <input id="login-email" type="email" placeholder="tu@correo.com" className="input" value={f.email} onChange={set('email')} />
          </div>
          <Err />
          <button id="login-submit" className="btn btn-primary w-full !py-3 font-semibold">
            Iniciar sesión →
          </button>
        </form>
      )}
    </div>
  );
}
