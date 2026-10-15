'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './ThemeProvider';
import { useHydrated } from './useHydrated';
import { useStore } from '@/store/useStore';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);
  const pathname = usePathname();
  const router = useRouter();
  const user = hydrated ? currentUser : null;

  const homeHref = user ? (user.rol === 'b2b' ? '/b2b' : '/b2c') : '/';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/80 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <Link href={homeHref} className="flex items-center gap-2 group">
          <span className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </span>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight leading-none">
              Buen <span className="text-accent">Bocado</span>
            </span>
            <span className="text-[10px] text-muted font-medium tracking-wide uppercase">Rescata comida</span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">

          {user && (
            <Link
              href="/perfil"
              id="nav-profile-btn"
              className="flex items-center gap-2 bg-subtle hover:bg-subtle/80 py-1 px-3 rounded-full border border-line text-xs transition-colors group cursor-pointer"
              title="Ver mi perfil"
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="font-semibold text-fg group-hover:text-accent transition-colors">
                {user.nombre.split(' ')[0]}
              </span>
              <span className="text-muted text-[11px] uppercase tracking-wider font-semibold hidden sm:inline">
                {user.rol === 'b2b' ? 'Restaurante' : 'Perfil'}
              </span>
            </Link>
          )}

          <button
            id="theme-toggle"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="w-9 h-9 rounded-xl border border-line flex items-center justify-center text-muted hover:text-fg hover:bg-subtle transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            )}
          </button>

          {user ? (
            <button
              id="logout-btn"
              onClick={() => { logout(); router.push('/'); }}
              className="btn btn-ghost !py-1.5 !px-3 text-xs"
            >
              Salir
            </button>
          ) : (
            <Link href="/?login=true" className="btn btn-primary !py-1.5 !px-3.5 text-xs font-semibold">
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
