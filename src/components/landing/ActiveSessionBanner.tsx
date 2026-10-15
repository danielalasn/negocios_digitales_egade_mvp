'use client';

import Link from 'next/link';
import { User } from '@/store/useStore';

interface ActiveSessionBannerProps {
  currentUser: User;
  onLogout: () => void;
}

export function ActiveSessionBanner({ currentUser, onLogout }: ActiveSessionBannerProps) {
  return (
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
          onClick={onLogout}
          className="btn btn-ghost !py-1.5 !px-3 text-xs text-muted hover:text-danger cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
