'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { parsePickupCode } from '@/lib/qrPayload';

interface QrScannerProps {
  /** Called once with the pickup code found in the QR (for example "#A1B2"). */
  onCode: (code: string) => void;
  onClose: () => void;
}

/** Camera scanner (any browser with camera access) with a "upload a photo of the QR" fallback. */
export function QrScanner({ onCode, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const onCodeRef = useRef(onCode);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  const finish = (raw: string): boolean => {
    const code = parsePickupCode(raw);
    if (!code) {
      setError('Ese QR no es un código de recolección de Buen Bocado.');
      return false;
    }
    if (doneRef.current) return true;
    doneRef.current = true;
    onCodeRef.current(code);
    return true;
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const tick = () => {
      if (stopped || doneRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const result = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
            if (result?.data) finish(result.data);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Este navegador no permite usar la cámara. Sube una foto del QR o escribe el código.');
        setStarting(false);
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStarting(false);
        raf = requestAnimationFrame(tick);
      } catch {
        setError('No se pudo abrir la cámara (permiso denegado o sin cámara). Sube una foto del QR o escribe el código.');
        setStarting(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const readImage = (file: File) => {
    setError('');
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!canvas || !ctx) return;
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const result = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      if (!result?.data) setError('No se encontró un QR en la imagen. Intenta con una foto más nítida.');
      else finish(result.data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('No se pudo leer la imagen.');
    };
    img.src = url;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-label="Escanear QR"
    >
      <div className="bg-surface border border-line rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-fg">Escanear QR del cliente</h3>
          <button type="button" onClick={onClose} className="text-xs text-muted hover:text-fg cursor-pointer">
            Cerrar
          </button>
        </div>

        <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {starting && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-white/80">Abriendo cámara...</p>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <p className="text-xs font-medium text-danger bg-danger-soft p-2.5 rounded-lg" role="alert">
            {error}
          </p>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readImage(f);
            e.target.value = '';
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost w-full text-xs cursor-pointer">
          Subir foto del QR
        </button>
      </div>
    </div>
  );
}
