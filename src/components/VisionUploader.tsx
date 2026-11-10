'use client';

import React, { useState, useRef } from 'react';
import { BasketReview, BasketItemState, CatalogItem } from '@/components/b2b/BasketReview';
import { authHeaders } from '@/lib/supabase';
import { compressImage } from '@/lib/image';

interface VisionBasketData {
  overall_confidence: number;
  user_message?: string;
  unmatched: { description: string; quantity: number }[];
  items: BasketItemState[];
  catalog: CatalogItem[];
}

interface ValidationErrorData {
  message: string;
  reason?: string;
  rejected: boolean;
}

interface VisionUploaderProps {
  /** Called after the basket was confirmed and stored in the database. */
  onPublished: () => void | Promise<void>;
  onCancel?: () => void;
}

export function VisionUploader({ onPublished, onCancel }: VisionUploaderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [basket, setBasket] = useState<VisionBasketData | null>(null);
  const [error, setError] = useState<ValidationErrorData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSelectedImage(null);
    setBasket(null);
    setError(null);
  };

  const handleImageFile = async (file: File) => {
    setError(null);
    setBasket(null);
    let dataUrl: string;
    try {
      dataUrl = await compressImage(file);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'No se pudo leer la imagen.',
        rejected: false,
      });
      return;
    }
    setSelectedImage(dataUrl);
    await runVisionAnalysis(dataUrl);
  };

  const runVisionAnalysis = async (imageUrl: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ imageUrl }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        setBasket(json.data);
      } else {
        setError({
          message: json.user_message || json.message || 'No pudimos analizar la foto. Intenta de nuevo.',
          reason: json.rejection_reason,
          rejected: json.is_food === false,
        });
      }
    } catch (err) {
      console.error('[VisionUploader] Error de comunicación:', err);
      setError({
        message: 'No pudimos contactar al servicio de análisis. Revisa tu conexión e intenta de nuevo.',
        rejected: false,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Publicación con IA
          </span>
          <h3 className="text-base font-bold text-fg mt-1">Sube 1 foto de tu vitrina al cierre</h3>
          <p className="text-xs text-muted">
            La IA compara la foto contra tu catálogo, cuenta las piezas y calcula precios respetando tu
            precio piso. Tú revisas y confirmas.
          </p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-muted hover:text-fg text-xs font-semibold px-2.5 py-1 rounded-lg border border-line cursor-pointer"
          >
            Publicar de forma manual
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = '';
        }}
      />

      {!selectedImage && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-line hover:border-emerald-500/60 transition-colors rounded-2xl p-8 text-center cursor-pointer bg-subtle/50 hover:bg-emerald-500/5"
        >
          <p className="text-sm font-bold text-fg">Tomar foto o seleccionar de galería</p>
          <p className="text-xs text-muted mt-1">
            Una sola foto amplia de los productos sobrantes en vitrina, con buena luz
          </p>
        </div>
      )}

      {selectedImage && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-line bg-black max-h-64 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selectedImage} alt="Vitrina analizada" className="w-full h-64 object-cover" />

            {analyzing && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center p-4">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-400 border-t-transparent animate-spin mb-3" />
                <p className="text-sm font-bold text-white">Comparando tu vitrina contra el catálogo...</p>
              </div>
            )}

            {!analyzing && (
              <button
                type="button"
                onClick={reset}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cambiar foto
              </button>
            )}
          </div>

          {error && !analyzing && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3 fade-in">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {error.rejected ? 'Foto no válida' : 'No se pudo analizar'}
                </span>
                <p className="text-sm text-fg mt-1 leading-relaxed">{error.message}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setTimeout(() => fileInputRef.current?.click(), 100);
                  }}
                  className="flex-1 btn btn-primary py-3 text-xs font-bold cursor-pointer"
                >
                  Subir otra foto
                </button>
                {!error.rejected && selectedImage && (
                  <button
                    type="button"
                    onClick={() => runVisionAnalysis(selectedImage)}
                    className="btn btn-secondary text-xs px-4 py-3 font-semibold cursor-pointer"
                  >
                    Reintentar análisis
                  </button>
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary text-xs px-4 py-3 font-semibold cursor-pointer"
                  >
                    Publicar de forma manual
                  </button>
                )}
              </div>
            </div>
          )}

          {basket && !analyzing && (
            <BasketReview
              initialItems={basket.items}
              unmatched={basket.unmatched || []}
              catalog={basket.catalog || []}
              sourcePhoto={selectedImage}
              userMessage={basket.user_message}
              overallConfidence={basket.overall_confidence}
              onConfirmPublish={async (payload) => {
                const res = await fetch('/api/basket/confirm', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                  body: JSON.stringify(payload),
                });
                const json = await res.json();
                if (json.success) {
                  reset();
                  await onPublished();
                } else {
                  alert(json.user_message || json.message || 'Error al confirmar la canasta');
                }
              }}
              onCancel={reset}
            />
          )}
        </div>
      )}
    </div>
  );
}
