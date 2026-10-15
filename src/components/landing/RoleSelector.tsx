import React from 'react';

interface RoleSelectorProps {
  onSelectRole: (role: 'b2c' | 'b2b') => void;
}

export function RoleSelector({ onSelectRole }: RoleSelectorProps) {
  return (
    <div className="max-w-2xl mx-auto grid sm:grid-cols-2 gap-4">
      <button
        id="role-b2c"
        onClick={() => onSelectRole('b2c')}
        className="card card-interactive text-left p-6 flex flex-col justify-between group cursor-pointer"
      >
        <div>
          <div className="w-11 h-11 rounded-xl bg-accent-soft text-accent flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-fg">Quiero rescatar comida</h2>
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
        onClick={() => onSelectRole('b2b')}
        className="card card-interactive text-left p-6 flex flex-col justify-between group cursor-pointer"
      >
        <div>
          <div className="w-11 h-11 rounded-xl bg-amber-soft text-amber-fg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
              <path d="M2 7h20" />
            </svg>
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
  );
}
