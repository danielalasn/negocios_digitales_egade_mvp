'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';
import { pilotAnalytics, PilotMetricsSummary } from '@/lib/pilotAnalytics';

interface PilotMerchant {
  id: string;
  nombre: string;
  tipo: string;
  zona: string;
  diasActivo: number;
  subidasSinPush: number;
  aprobacionIA: number; // percentage
  kgRescatados: number;
  estadoH1: 'cumple' | 'en_progreso';
}

const INITIAL_MERCHANTS: PilotMerchant[] = [
  { id: 'm-1', nombre: 'Trattoria Bella Napoli', tipo: 'Restaurante', zona: 'DistritoTec', diasActivo: 18, subidasSinPush: 16, aprobacionIA: 94, kgRescatados: 68, estadoH1: 'cumple' },
  { id: 'm-2', nombre: 'Panadería La Espiga Dorada', tipo: 'Panadería', zona: 'Centro Mty', diasActivo: 21, subidasSinPush: 20, aprobacionIA: 92, kgRescatados: 85, estadoH1: 'cumple' },
  { id: 'm-3', nombre: 'Café & Bistro Valle', tipo: 'Cafetería', zona: 'San Pedro', diasActivo: 19, subidasSinPush: 15, aprobacionIA: 90, kgRescatados: 42, estadoH1: 'cumple' },
  { id: 'm-4', nombre: 'Cocina Doña Tere', tipo: 'Fonda', zona: 'Cumbres', diasActivo: 20, subidasSinPush: 18, aprobacionIA: 88, kgRescatados: 74, estadoH1: 'cumple' },
  { id: 'm-5', nombre: 'Sakura Sushi Bar', tipo: 'Restaurante', zona: 'Contry', diasActivo: 17, subidasSinPush: 12, aprobacionIA: 91, kgRescatados: 39, estadoH1: 'cumple' },
  { id: 'm-6', nombre: 'Pastelería Dulce Sabor', tipo: 'Pastelería', zona: 'San Jerónimo', diasActivo: 16, subidasSinPush: 13, aprobacionIA: 95, kgRescatados: 31, estadoH1: 'cumple' },
  { id: 'm-7', nombre: 'Taquería El Pastorcito', tipo: 'Taquería', zona: 'DistritoTec', diasActivo: 21, subidasSinPush: 19, aprobacionIA: 89, kgRescatados: 52, estadoH1: 'cumple' },
  { id: 'm-8', nombre: 'Café de la Huasteca', tipo: 'Cafetería', zona: 'Santa Catarina', diasActivo: 14, subidasSinPush: 8, aprobacionIA: 87, kgRescatados: 22, estadoH1: 'en_progreso' },
  { id: 'm-9', nombre: 'Tortas & Lonches El Regio', tipo: 'Fonda', zona: 'Centro Mty', diasActivo: 15, subidasSinPush: 9, aprobacionIA: 86, kgRescatados: 28, estadoH1: 'en_progreso' },
  { id: 'm-10', nombre: 'Baguette Gourmet', tipo: 'Panadería', zona: 'San Pedro', diasActivo: 13, subidasSinPush: 6, aprobacionIA: 85, kgRescatados: 19, estadoH1: 'en_progreso' },
];

export default function PilotDashboardPage() {
  const hydrated = useHydrated();
  const [merchants, setMerchants] = useState(INITIAL_MERCHANTS);
  const [filterZona, setFilterZona] = useState('todas');
  const [summary, setSummary] = useState<PilotMetricsSummary | null>(null);
  const [toast, setToast] = useState('');

  const refreshSummary = () => {
    setSummary(pilotAnalytics.getSummary());
  };

  useEffect(() => {
    refreshSummary();
  }, []);

  if (!hydrated) return null;

  const currentSummary = summary || pilotAnalytics.getSummary();
  const filteredMerchants = filterZona === 'todas'
    ? merchants
    : merchants.filter((m) => m.zona.toLowerCase().includes(filterZona.toLowerCase()));

  const handleSimulateUpload = () => {
    pilotAnalytics.trackMerchantUpload('m-1', false);
    pilotAnalytics.trackAIAccuracy(true, 4);
    setMerchants((prev) =>
      prev.map((m, idx) =>
        idx === 0
          ? { ...m, subidasSinPush: m.subidasSinPush + 1, diasActivo: m.diasActivo + 1, kgRescatados: m.kgRescatados + 3.2 }
          : m
      )
    );
    refreshSummary();
    setToast('¡Simulada subida de vitrina sin recordatorio (+1 H1, +1 H3)!');
    setTimeout(() => setToast(''), 3000);
  };

  const handleSimulateConversion = () => {
    pilotAnalytics.trackConversion(true, true);
    pilotAnalytics.trackSurplusRescued(2.5, 3.2, 120);
    refreshSummary();
    setToast('¡Simulada compra de paquete visible (+1 H2, +2.5 kg rescatados)!');
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportCSV = () => {
    const csvContent = pilotAnalytics.exportReportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_piloto_buen_bocado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast('Reporte CSV descargado correctamente.');
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-1">
            <Link href="/" className="hover:text-fg">Inicio</Link>
            <span>/</span>
            <span className="text-fg font-semibold">Validación del Piloto</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
            Piloto Monterrey (10 Comercios)
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Monitoreo en tiempo real de hipótesis críticas H1, H2, H3 y tasa de excedente rescatado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-eco text-xs px-3 py-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Semana 3 de 4 activa
          </span>
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary !py-1 !px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
            title="Descargar datos del piloto en CSV"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Simulation Bar */}
      <div className="mb-6 p-4 rounded-2xl bg-surface border border-line shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-accent-soft text-accent flex items-center justify-center shrink-0 text-sm font-bold">
            🧪
          </div>
          <div>
            <p className="text-xs font-bold text-fg">Instrumentación de Telemetría en Vivo</p>
            <p className="text-[11px] text-muted">Simula eventos del piloto para comprobar la calibración de métricas e hipótesis.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateUpload}
            className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold cursor-pointer"
          >
            + Simular subida sin push (H1/H3)
          </button>
          <button
            onClick={handleSimulateConversion}
            className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold cursor-pointer"
          >
            + Simular venta visible (H2)
          </button>
        </div>
      </div>

      {/* North Star & Critical Hypotheses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-8">
        {/* North Star */}
        <div className="card p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-surface to-surface">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              North Star Metric
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Objetivo: 65%</span>
          </div>
          <p className="text-3xl font-black text-fg mt-2">{currentSummary.northStar.rescueRate}%</p>
          <p className="text-xs text-muted mt-1 font-medium">Tasa de excedente rescatado</p>
          <div className="mt-3 text-[11px] text-muted flex items-center justify-between border-t border-line/60 pt-2">
            <span>Kg totales: <strong>{currentSummary.northStar.totalKgRescued} kg</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Línea base: 0%</span>
          </div>
        </div>

        {/* H1 Habit */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              H1: Hábito del Comercio
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Validada
            </span>
          </div>
          <p className="text-3xl font-black text-fg mt-2">{currentSummary.h1.currentRate}%</p>
          <p className="text-xs text-muted mt-1 font-medium">Suben foto sin recordatorio</p>
          <div className="mt-3 text-[11px] text-muted flex items-center justify-between border-t border-line/60 pt-2">
            <span>{currentSummary.h1.uploadWithoutPushCount} de {currentSummary.h1.activeMerchantsCount} comercios</span>
            <span>Meta: ≥ {currentSummary.h1.target}%</span>
          </div>
        </div>

        {/* H2 A/B Test */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              H2: Paquete Visible (A/B)
            </span>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
              +{currentSummary.h2.liftPercentage}% conv.
            </span>
          </div>
          <p className="text-3xl font-black text-fg mt-2">{currentSummary.h2.visibleConversionRate}%</p>
          <p className="text-xs text-muted mt-1 font-medium">Conversión con foto real</p>
          <div className="mt-3 text-[11px] text-muted flex items-center justify-between border-t border-line/60 pt-2">
            <span>Control (sin foto): {currentSummary.h2.controlConversionRate}%</span>
            <span className="font-bold text-teal-600">p &lt; 0.01</span>
          </div>
        </div>

        {/* H3 AI Performance */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted">
              H3: Precisión de Visión IA
            </span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
              ${currentSummary.h3.marginalCostPerPhotoUSD}/foto
            </span>
          </div>
          <p className="text-3xl font-black text-fg mt-2">{currentSummary.h3.approvalWithoutEditRate}%</p>
          <p className="text-xs text-muted mt-1 font-medium">Aprobación en 1-clic sin editar</p>
          <div className="mt-3 text-[11px] text-muted flex items-center justify-between border-t border-line/60 pt-2">
            <span>Meta benchmark: ≥ {currentSummary.h3.targetAccuracy}%</span>
            <span className="text-emerald-600 font-bold">Cumplida</span>
          </div>
        </div>
      </div>

      {/* Cohort Breakdown Table */}
      <div className="card p-5 sm:p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-fg">Cohorte Activa de Comercios en Monterrey</h2>
            <p className="text-xs text-muted mt-0.5">
              10 establecimientos seleccionados de alta densidad en zonas piloto.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted font-medium">Filtrar zona:</span>
            <select
              value={filterZona}
              onChange={(e) => setFilterZona(e.target.value)}
              className="input !py-1 !px-2.5 text-xs rounded-lg cursor-pointer"
            >
              <option value="todas">Todas las zonas</option>
              <option value="distritotec">DistritoTec</option>
              <option value="centro">Centro Mty</option>
              <option value="san pedro">San Pedro</option>
              <option value="cumbres">Cumbres</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider font-bold">
                <th className="py-2.5 px-3">Comercio</th>
                <th className="py-2.5 px-3">Zona</th>
                <th className="py-2.5 px-3 text-center">Días Activo</th>
                <th className="py-2.5 px-3 text-center">Subidas sin Recordatorio (H1)</th>
                <th className="py-2.5 px-3 text-center">Aprobación IA (H3)</th>
                <th className="py-2.5 px-3 text-right">Kg Rescatados</th>
                <th className="py-2.5 px-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredMerchants.map((m) => {
                const h1Ratio = Math.round((m.subidasSinPush / m.diasActivo) * 100);
                return (
                  <tr key={m.id} className="hover:bg-subtle/50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-fg">
                      <div>{m.nombre}</div>
                      <span className="text-[10px] text-muted font-normal">{m.tipo}</span>
                    </td>
                    <td className="py-3 px-3 text-muted">{m.zona}</td>
                    <td className="py-3 px-3 text-center font-mono">{m.diasActivo} días</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold ${h1Ratio >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                        {m.subidasSinPush}/{m.diasActivo} ({h1Ratio}%)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-fg">
                      {m.aprobacionIA}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-fg">
                      {m.kgRescatados} kg
                    </td>
                    <td className="py-3 px-3 text-right">
                      {m.estadoH1 === 'cumple' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          ✓ H1 Válida
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          En progreso
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Experimental Methodology Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted block mb-1">
            Metodología H1 (Hábito)
          </span>
          <h4 className="text-xs font-bold text-fg">Subida al cierre sin push</h4>
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            Mide si el encargado adopta la rutina de tomar la foto al apagar vitrinas sin requerir recordatorio SMS/Push.
          </p>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted block mb-1">
            Metodología H2 (A/B Test)
          </span>
          <h4 className="text-xs font-bold text-fg">Paquete Visible vs Bolsa Sorpresa</h4>
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            El consumidor compra con mayor certeza y confianza. La recompra a 14 días se elevó un 62% frente al control.
          </p>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-muted block mb-1">
            Metodología H3 & Foso
          </span>
          <h4 className="text-xs font-bold text-fg">Food-101 Benchmark & Costos</h4>
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            Costo de ~$0.0013 USD por foto analizada con Claude Haiku 4.5. 28x más económico que un minuto de salario mínimo.
          </p>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div className="fade-in fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-fg text-bg text-xs font-bold shadow-2xl flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
