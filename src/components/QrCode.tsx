'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { encodePickupCode } from '@/lib/qrPayload';

/** Real, scannable QR that encodes the pickup code. */
export function QrCode({ code, size = 144 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(encodePickupCode(code), { width: size * 2, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, size]);

  return (
    <div
      className="mx-auto my-3 p-2 bg-white rounded-xl shadow-xs border border-line flex items-center justify-center"
      style={{ width: size + 16, height: size + 16 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Código QR ${code}`} width={size} height={size} />
      ) : (
        <span className="text-[11px] text-zinc-500">Generando QR...</span>
      )}
    </div>
  );
}
