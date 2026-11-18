'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { useMerchant } from '@/components/b2b/MerchantContext';
import { VisionUploader } from '@/components/VisionUploader';
import { PageTitle } from '@/components/b2b/ui';

const emptyForm = { titulo: '', desc: '', cantidad: '5', orig: '', rem: '', hora: '22:00' };

export default function PublishPage() {
  const router = useRouter();
  const { rest, flash } = useMerchant();
  const createPackage = useStore((s) => s.createPackage);
  const syncFromSupabase = useStore((s) => s.syncFromSupabase);

  const [mode, setMode] = useState<'vision' | 'manual'>('vision');
  const [f, setF] = useState(emptyForm);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const publishManual = (e: React.FormEvent) => {
    e.preventDefault();
    const o = parseFloat(f.orig);
    const r = parseFloat(f.rem);
    if (!f.titulo || !o || !r) return setErr('Completa los campos requeridos.');
    if (r >= o) return setErr('El precio de remate debe ser menor al original.');
    createPackage({
      restaurant_id: rest.id,
      titulo: f.titulo,
      descripcion: f.desc,
      cantidad: parseInt(f.cantidad) || 1,
      precio_original: o,
      precio_remate: r,
      hora_limite: f.hora,
    });
    setF(emptyForm);
    setErr('');
    flash('Paquete publicado');
    router.push('/b2b/lotes');
  };

  const handleVisionPublished = async () => {
    await syncFromSupabase();
    flash('Lote confirmado y publicado en el marketplace');
    router.push('/b2b/lotes');
  };

  return (
    <div className={`mx-auto space-y-4 ${mode === 'vision' ? 'max-w-3xl' : 'max-w-xl'}`}>
      <PageTitle title="Publicar el cierre del día" sub="Sube una foto de tu vitrina o captura el paquete a mano." />

      <div className="flex p-1 bg-subtle rounded-xl border border-line" role="tablist" aria-label="Forma de publicar">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'vision'}
          onClick={() => setMode('vision')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            mode === 'vision' ? 'bg-accent text-accent-fg shadow-xs' : 'text-muted hover:text-fg'
          }`}
        >
          Foto con IA (recomendado)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'manual'}
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            mode === 'manual' ? 'bg-surface text-fg shadow-xs border border-line' : 'text-muted hover:text-fg'
          }`}
        >
          Formulario manual
        </button>
      </div>

      {mode === 'vision' ? (
        <VisionUploader onPublished={handleVisionPublished} onCancel={() => setMode('manual')} />
      ) : (
        <form onSubmit={publishManual} className="card fade-in p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold">Nuevo paquete de comida</h3>
            <p className="text-sm text-muted">Publica tus excedentes del día de forma manual, con precio fijo.</p>
          </div>
          <div>
            <label className="label">Título</label>
            <input id="pkg-titulo" className="input" placeholder="Paquete de pan dulce" value={f.titulo} onChange={set('titulo')} />
          </div>
          <div>
            <label className="label">Descripción</label>
            <textarea id="pkg-desc" rows={2} className="input" placeholder="¿Qué puede incluir?" value={f.desc} onChange={set('desc')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cantidad</label>
              <input id="pkg-cantidad" type="number" min="1" className="input" value={f.cantidad} onChange={set('cantidad')} />
            </div>
            <div>
              <label className="label">Hora límite</label>
              <input id="pkg-hora" type="time" className="input" value={f.hora} onChange={set('hora')} />
            </div>
            <div>
              <label className="label">Precio original</label>
              <input id="pkg-precio-orig" type="number" min="1" className="input" placeholder="350" value={f.orig} onChange={set('orig')} />
            </div>
            <div>
              <label className="label">Precio de remate</label>
              <input id="pkg-precio-remate" type="number" min="1" className="input" placeholder="99" value={f.rem} onChange={set('rem')} />
            </div>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <button id="publish-pkg" className="btn btn-primary w-full">Publicar paquete</button>
        </form>
      )}
    </div>
  );
}
