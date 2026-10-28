import React from 'react';

export function WasteStatsSection() {
  return (
    <section className="max-w-3xl mx-auto my-12 text-center p-6 sm:p-8 rounded-3xl bg-subtle border border-line">
      <h2 className="text-xl sm:text-2xl font-black text-fg mb-1">
        El costo del desperdicio de comida en México
      </h2>
      <p className="text-xs text-muted max-w-xl mx-auto mb-6">
        El 98% de los restaurantes en México son PyMEs familiares. Resolver la merma con IA genera impacto económico directo.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-surface border border-line">
          <span className="text-2xl sm:text-3xl font-black text-accent block">20.4M t</span>
          <span className="text-xs font-bold text-fg block mt-1">Desperdicio anual en México</span>
          <span className="text-[10px] text-muted block mt-0.5">34% de la producción total (FAO)</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line">
          <span className="text-2xl sm:text-3xl font-black text-amber-500 block">+200k t</span>
          <span className="text-xs font-bold text-fg block mt-1">Tiradas al año en Nuevo León</span>
          <span className="text-[10px] text-muted block mt-0.5">Reporte del Congreso de NL</span>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line">
          <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 block">7% – 10%</span>
          <span className="text-xs font-bold text-fg block mt-1">Merma diaria de producción</span>
          <span className="text-[10px] text-muted block mt-0.5">No vendida al cierre (Samray / MDPI 2023)</span>
        </div>
      </div>
    </section>
  );
}
