import React from 'react';

export function AiFlowSteps() {
  return (
    <section className="max-w-3xl mx-auto my-12 text-left">
      <div className="text-center mb-8">
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          Flujo Zero-Friction
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-fg mt-2">
          1 sola foto reemplaza todo el trabajo operativo
        </h2>
        <p className="text-xs sm:text-sm text-muted mt-1">
          La visión por computadora reconoce vitrinas al 90% de precisión y fija precios dinámicos al instante.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="card p-4 text-center">
          <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">1</span>
          <h3 className="font-bold text-xs text-fg">Foto de Vitrina</h3>
          <p className="text-[11px] text-muted mt-1">1 foto al apagar vitrinas al cierre.</p>
        </div>

        <div className="card p-4 text-center">
          <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">2</span>
          <h3 className="font-bold text-xs text-fg">Visión por IA</h3>
          <p className="text-[11px] text-muted mt-1">Reconoce piezas, conteo y precios base.</p>
        </div>

        <div className="card p-4 text-center">
          <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">3</span>
          <h3 className="font-bold text-xs text-fg">Precio Piso</h3>
          <p className="text-[11px] text-muted mt-1">Remate dinámico que protege costos.</p>
        </div>

        <div className="card p-4 text-center">
          <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">4</span>
          <h3 className="font-bold text-xs text-fg">Paquete Visible</h3>
          <p className="text-[11px] text-muted mt-1">Avisos hiper-locales con foto real.</p>
        </div>

        <div className="card p-4 text-center col-span-2 sm:col-span-1">
          <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">5</span>
          <h3 className="font-bold text-xs text-fg">Predicción</h3>
          <p className="text-[11px] text-muted mt-1">Optimiza la producción de mañana.</p>
        </div>
      </div>
    </section>
  );
}
