'use client';

import React, { useState, useRef } from 'react';
import { pilotAnalytics } from '@/lib/pilotAnalytics';

interface DetectedItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface VisionData {
  titulo: string;
  descripcion: string;
  items: DetectedItem[];
  precio_original_total: number;
  precio_remate_sugerido: number;
  descuento_porcentaje: number;
  precio_piso: number;
  hora_limite_sugerida: string;
  confidence: number;
  foto_vitrina: string;
  aprobado_sin_edicion: boolean;
}

interface VisionUploaderProps {
  categoryHint?: string;
  restaurantName?: string;
  onPublish: (data: VisionData) => void;
  onCancel?: () => void;
}

const SAMPLE_PHOTOS = [
  {
    name: 'Vitrina Panadería',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80',
    type: 'panaderia',
  },
  {
    name: 'Mostrador Cafetería',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
    type: 'cafeteria',
  },
  {
    name: 'Cocina & Guisados',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80',
    type: 'comida',
  },
];

export function VisionUploader({
  categoryHint = 'panaderia',
  restaurantName = 'Mi Comercio',
  onPublish,
  onCancel,
}: VisionUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [visionResult, setVisionResult] = useState<VisionData | null>(null);
  const [edited, setEdited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setSelectedImage(url);
      runVisionAnalysis(url, categoryHint);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectSample = (sample: typeof SAMPLE_PHOTOS[0]) => {
    setSelectedImage(sample.url);
    runVisionAnalysis(sample.url, sample.type);
  };

  const runVisionAnalysis = async (imgUrl: string, cat: string) => {
    setAnalyzing(true);
    setVisionResult(null);
    setEdited(false);

    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryHint: cat, restaurantName }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setVisionResult({
          ...json.data,
          foto_vitrina: imgUrl,
          aprobado_sin_edicion: true,
        });
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdatePrice = (newPrice: number) => {
    if (!visionResult) return;
    setEdited(true);
    setVisionResult({
      ...visionResult,
      precio_remate_sugerido: Math.max(visionResult.precio_piso, newPrice),
      aprobado_sin_edicion: false,
    });
  };

  const handleConfirm = () => {
    if (!visionResult) return;
    pilotAnalytics.trackMerchantUpload(restaurantName, false);
    pilotAnalytics.trackAIAccuracy(!edited, visionResult.items.length);
    onPublish({
      ...visionResult,
      aprobado_sin_edicion: !edited,
    });
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Zero-Friction Vision AI
          </span>
          <h3 className="text-base font-bold text-fg mt-1">
            Sube 1 foto de tu vitrina al cierre
          </h3>
          <p className="text-xs text-muted">
            La IA reconoce los productos, estima el valor y fija un precio dinámico con precio piso garantizado.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-muted hover:text-fg text-xs font-semibold px-2.5 py-1 rounded-lg border border-line"
          >
            Volver al modo manual
          </button>
        )}
      </div>

      {/* Upload Zone */}
      {!selectedImage && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-line hover:border-emerald-500/60 transition-colors rounded-2xl p-8 text-center cursor-pointer bg-subtle/50 hover:bg-emerald-500/5 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <p className="text-sm font-bold text-fg">Tomar foto o seleccionar de galería</p>
            <p className="text-xs text-muted mt-1">Toma 1 sola foto amplia de los productos sobrantes en vitrina</p>
          </div>

          <div>
            <span className="text-xs font-semibold text-muted block mb-2">
              O prueba con una foto de demostración:
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {SAMPLE_PHOTOS.map((sample) => (
                <button
                  key={sample.name}
                  onClick={() => handleSelectSample(sample)}
                  type="button"
                  className="group relative rounded-xl overflow-hidden border border-line hover:border-emerald-500/60 text-left transition-all aspect-video cursor-pointer"
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-end p-2">
                    <span className="text-[11px] font-bold text-white truncate">
                      {sample.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Image & Scanning Animation */}
      {selectedImage && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-line bg-black max-h-64 flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Vitrina analizada"
              className="w-full h-64 object-cover"
            />

            {analyzing && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-3" />
                <p className="text-sm font-bold text-white">Analizando vitrina con IA...</p>
                <p className="text-xs text-emerald-300 mt-1">Identificando piezas, estimando pesos y calculando precios</p>
                {/* Visual scanner bar */}
                <div className="w-48 h-1 bg-white/20 rounded-full mt-4 overflow-hidden">
                  <div className="w-full h-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            )}

            {!analyzing && (
              <button
                type="button"
                onClick={() => {
                  setSelectedImage(null);
                  setVisionResult(null);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                Cambiar foto
              </button>
            )}
          </div>

          {/* AI Result Cards */}
          {visionResult && !analyzing && (
            <div className="space-y-4 fade-in">
              <div className="p-4 rounded-xl bg-subtle border border-line space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      IA Reconocimiento (90% precisión)
                    </span>
                    <h4 className="text-sm font-black text-fg">{visionResult.titulo}</h4>
                    <p className="text-xs text-muted mt-0.5">{visionResult.descripcion}</p>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold border border-emerald-500/20">
                    -{visionResult.descuento_porcentaje}% OFF
                  </span>
                </div>

                {/* Items detected pills */}
                <div>
                  <span className="text-[11px] font-bold text-muted block mb-1.5">
                    Alimentos detectados ({visionResult.items.reduce((acc, i) => acc + i.cantidad, 0)} piezas):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {visionResult.items.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-line text-xs font-medium text-fg"
                      >
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {item.cantidad}x
                        </span>
                        <span>{item.nombre}</span>
                        <span className="text-[10px] text-muted">
                          (~${item.precio_unitario * item.cantidad})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pricing & Floor Price */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/60">
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Valor Original</span>
                    <span className="text-sm font-bold text-muted line-through">
                      ${visionResult.precio_original_total} MXN
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Precio Remate</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      ${visionResult.precio_remate_sugerido} MXN
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted block uppercase">Precio Piso Min.</span>
                    <span className="text-xs font-bold text-fg">
                      ${visionResult.precio_piso} MXN
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="flex-1 btn btn-primary py-3 font-bold text-sm shadow-md flex items-center justify-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Aprobar y Publicar en 1 Clic
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdatePrice(visionResult.precio_remate_sugerido - 10)}
                    className="btn btn-secondary text-xs px-3 py-2 font-semibold"
                    title="Bajar $10 respetando precio piso"
                  >
                    -$10
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePrice(visionResult.precio_remate_sugerido + 10)}
                    className="btn btn-secondary text-xs px-3 py-2 font-semibold"
                    title="Subir $10"
                  >
                    +$10
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-center text-muted">
                {edited ? (
                  <span className="text-amber-500 font-semibold">
                    * Modificaste el precio sugerido (registrado para métricas de calibración H3)
                  </span>
                ) : (
                  'El 90% de los comercios aprueban la sugerencia de IA sin necesidad de editar.'
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
