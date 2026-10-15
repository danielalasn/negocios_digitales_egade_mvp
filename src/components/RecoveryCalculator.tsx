'use client';

import React, { useState } from 'react';

const BIZ_TYPES = [
  { name: 'Panadería', avgPrice: 65, icon: '🥐', kgPerPack: 1.5, example: 'Conchas, cuernitos, baguettes' },
  { name: 'Cafetería & Repostería', avgPrice: 75, icon: '☕', kgPerPack: 1.2, example: 'Muffins, galletas, cold brews' },
  { name: 'Cocina Económica', avgPrice: 89, icon: '🍲', kgPerPack: 2.2, example: 'Guisados del día, arroz, frijoles' },
  { name: 'Taquería / Lonchería', avgPrice: 59, icon: '🌮', kgPerPack: 1.8, example: 'Tacos de trompo, gringas, tortas' },
];

export function RecoveryCalculator({ onRegister }: { onRegister?: () => void }) {
  const [selectedBiz, setSelectedBiz] = useState(BIZ_TYPES[0]);
  const [dailyPacks, setDailyPacks] = useState(5);

  const monthlyIncome = dailyPacks * selectedBiz.avgPrice * 26; // 26 days/month
  const monthlyKg = (dailyPacks * selectedBiz.kgPerPack * 26).toFixed(0);
  const annualIncome = monthlyIncome * 12;

  return (
    <div className="card p-6 sm:p-8 border-line bg-gradient-to-br from-surface via-subtle/40 to-surface relative overflow-hidden shadow-sm">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
            Calculadora de Recuperación de Merma
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
            ¿Cuánto dinero tira tu negocio al mes?
          </h3>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Calcula el ingreso adicional que puedes recuperar al cierre con 1 sola foto de tu vitrina.
          </p>
        </div>

        {/* Business Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          {BIZ_TYPES.map((biz) => {
            const isSelected = selectedBiz.name === biz.name;
            return (
              <button
                key={biz.name}
                type="button"
                onClick={() => setSelectedBiz(biz)}
                className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-fg font-bold shadow-xs scale-102'
                    : 'border-line text-muted hover:text-fg hover:border-muted'
                }`}
              >
                <span className="text-2xl block mb-1">{biz.icon}</span>
                <span className="text-xs font-bold block truncate">{biz.name}</span>
                <span className="text-[10px] text-muted block mt-0.5">~${biz.avgPrice} remate</span>
              </button>
            );
          })}
        </div>

        {/* Daily Packs Slider */}
        <div className="p-5 rounded-2xl bg-surface border border-line mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-fg">
              Paquetes que sobran en vitrina al cierre (por día):
            </label>
            <span className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400">
              {dailyPacks} paquetes
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={dailyPacks}
            onChange={(e) => setDailyPacks(Number(e.target.value))}
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-muted font-mono mt-1">
            <span>2 paquetes/día</span>
            <span>10 paquetes</span>
            <span>20 paquetes/día</span>
          </div>
        </div>

        {/* Results Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-center">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-0.5">
              Ingreso Mensual Recuperado
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              ${monthlyIncome.toLocaleString('es-MX')} MXN
            </span>
            <span className="text-[10px] text-muted block mt-1">
              ~${annualIncome.toLocaleString('es-MX')} al año
            </span>
          </div>

          <div className="p-4 rounded-xl bg-subtle border border-line">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted block mb-0.5">
              Comida Rescatada al Mes
            </span>
            <span className="text-2xl sm:text-3xl font-black text-fg">
              {monthlyKg} kg
            </span>
            <span className="text-[10px] text-muted block mt-1">
              Alimentos frescos no tirados
            </span>
          </div>

          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 block mb-0.5">
              Tiempo Operativo
            </span>
            <span className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400">
              15 seg
            </span>
            <span className="text-[10px] text-muted block mt-1">
              1 foto con IA vs 4 min manual
            </span>
          </div>
        </div>

        {onRegister && (
          <div className="text-center">
            <button
              onClick={onRegister}
              className="btn btn-primary !py-3 !px-6 text-xs font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>Empieza a monetizar tu merma hoy</span>
              <span>→</span>
            </button>
            <p className="text-[11px] text-muted mt-2">
              Sin costo fijo mensual · Solo comisión por paquete efectivamente vendido
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
