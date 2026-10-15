import React from 'react';

export function HeroSection() {
  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Plataforma AI-Native · Monterrey, N.L.
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] text-balance">
          Lo que sobra hoy,<br />
          <span className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
            se vende hoy.
          </span>
        </h1>

        <p className="mt-5 text-base sm:text-lg text-muted text-pretty max-w-xl mx-auto">
          Panaderías, cafeterías y cocinas de  Monterrey rescatan su comida excedente con IA.
          Toma 1 sola foto al cierre y véndelo con <strong>hasta 70% de descuento</strong>.
        </p>
      </div>

      {/* Value props & live badges */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto text-center">
        <div className="card p-4">
          <p className="text-2xl sm:text-3xl font-extrabold text-accent">1 Foto</p>
          <p className="text-xs text-muted font-medium mt-0.5">Publica con IA al cierre</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl sm:text-3xl font-extrabold text-fg">+200k t</p>
          <p className="text-xs text-muted font-medium mt-0.5">Merma en NL / año</p>
        </div>
        <div className="card p-4">
          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">70%</p>
          <p className="text-xs text-muted font-medium mt-0.5">Descuento promedio</p>
        </div>
      </div>
    </div>
  );
}
