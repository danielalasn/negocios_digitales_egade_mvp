import React from 'react';

export function ComparisonTable() {
  return (
    <section className="max-w-3xl mx-auto my-12 text-left">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-fg">
          ¿Por qué Buen Bocado vs Bolsas Sorpresa tradicionales?
        </h2>
        <p className="text-xs text-muted mt-1">
          Diseñado para comercios de barrio en Monterrey (el 98% de los restaurantes en México son PyMEs).
        </p>
      </div>

      <div className="card p-5 overflow-x-auto no-scrollbar shadow-xs border-line">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider font-bold">
              <th className="py-2.5 px-3">Característica</th>
              <th className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-black">Buen Bocado (AI-Native)</th>
              <th className="py-2.5 px-3 text-muted">Bolsas Sorpresa tradicionales</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            <tr>
              <td className="py-3.5 px-3 font-semibold text-fg">Experiencia del Cliente</td>
              <td className="py-3.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">👁️ Paquete Visible con foto real</td>
              <td className="py-3.5 px-3 text-muted">Bolsa a ciegas (quejas por porciones)</td>
            </tr>
            <tr>
              <td className="py-3.5 px-3 font-semibold text-fg">Carga para el Dueño</td>
              <td className="py-3.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">⚡ 1 sola foto (15 seg al cierre)</td>
              <td className="py-3.5 px-3 text-muted">Armado manual e inventario (4-6 min)</td>
            </tr>
            <tr>
              <td className="py-3.5 px-3 font-semibold text-fg">Protección del Negocio</td>
              <td className="py-3.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">🛡️ Precio piso dinámico garantizado</td>
              <td className="py-3.5 px-3 text-muted">Precio fijo sin considerar costo de insumos</td>
            </tr>
            <tr>
              <td className="py-3.5 px-3 font-semibold text-fg">Inteligencia y Foso</td>
              <td className="py-3.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">📈 Predice producción por producto y colonia</td>
              <td className="py-3.5 px-3 text-muted">Cero registro de qué producto sobró</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
