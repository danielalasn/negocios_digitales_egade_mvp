'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image';

interface Product {
  id: string;
  name: string;
  photo_url: string;
  regular_price_cents: number;
  max_discount_pct: number;
  visual_descriptor: string | null;
  active: boolean;
}

const emptyForm = { name: '', price: '', discount: '60', descriptor: '' };

export function CatalogManager({ merchantId }: { merchantId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('products')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: true });
    if (err) setError('No se pudo cargar tu catálogo.');
    setProducts((data as Product[]) || []);
    setLoading(false);
  }, [merchantId]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handlePhoto = async (file: File) => {
    try {
      setPhoto(await compressImage(file, 480, 0.75));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la foto.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(form.price);
    const discount = parseInt(form.discount, 10);
    if (!form.name.trim()) return setError('Escribe el nombre del producto.');
    if (!price || price < 10) return setError('El precio regular debe ser de al menos $10 MXN.');
    if (isNaN(discount) || discount < 0 || discount > 90) {
      return setError('El descuento máximo debe estar entre 0 y 90%.');
    }
    if (!photo) return setError('Agrega una foto de referencia del producto.');

    setError('');
    setSaving(true);
    const { error: err } = await supabase.from('products').insert({
      id: `prod-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      merchant_id: merchantId,
      name: form.name.trim(),
      photo_url: photo,
      regular_price_cents: Math.round(price * 100),
      max_discount_pct: discount,
      visual_descriptor: form.descriptor.trim() || null,
      active: true,
    });
    setSaving(false);
    if (err) {
      console.error('Catalog insert error:', err);
      return setError('No se pudo guardar el producto. Intenta de nuevo.');
    }
    setForm(emptyForm);
    setPhoto(null);
    await load();
  };

  const toggleActive = async (p: Product) => {
    const { error: err } = await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    if (err) return setError('No se pudo actualizar el producto.');
    await load();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Agregar producto al catálogo</h2>
          <p className="text-sm text-muted">
            La IA compara tu foto del cierre contra estos productos. Mientras mejor los describas, mejor los
            reconoce.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Nombre</label>
            <input id="prod-name" className="input" placeholder="Ej. Concha de vainilla" value={form.name} onChange={set('name')} />
          </div>
          <div>
            <label className="label">Precio regular (MXN)</label>
            <input id="prod-price" type="number" min="10" step="1" className="input" placeholder="26" value={form.price} onChange={set('price')} />
          </div>
          <div>
            <label className="label">Descuento máximo (%), define tu precio piso</label>
            <input id="prod-discount" type="number" min="0" max="90" className="input" value={form.discount} onChange={set('discount')} />
          </div>
          <div>
            <label className="label">Foto de referencia</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
                e.target.value = '';
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost w-full text-xs cursor-pointer">
              {photo ? 'Cambiar foto' : 'Elegir foto'}
            </button>
          </div>
        </div>

        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Vista previa" className="w-24 h-24 rounded-xl object-cover border border-line" />
        )}

        <div>
          <label className="label">Cómo se ve en la vitrina (opcional, recomendado)</label>
          <textarea
            id="prod-descriptor"
            rows={2}
            className="input"
            placeholder="Ej. Pan redondo con cubierta de azúcar blanca en forma de concha; se vende en charola."
            value={form.descriptor}
            onChange={set('descriptor')}
          />
        </div>

        {error && <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{error}</p>}

        <button id="prod-submit" disabled={saving} className="btn btn-primary w-full disabled:opacity-60">
          {saving ? 'Guardando...' : 'Guardar producto'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Tu catálogo ({products.filter((p) => p.active).length} activos)
        </h2>
        {loading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : products.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-medium">Aún no tienes productos</p>
            <p className="text-sm text-muted mt-1">
              Agrega al menos uno para poder publicar tu cierre del día con IA.
            </p>
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className={`card p-4 flex items-center gap-4 ${p.active ? '' : 'opacity-50'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo_url} alt={p.name} className="w-16 h-16 rounded-xl object-cover border border-line shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{p.name}</p>
                <p className="text-xs text-muted">
                  ${(p.regular_price_cents / 100).toFixed(2)} MXN, piso $
                  {((p.regular_price_cents * (1 - p.max_discount_pct / 100)) / 100).toFixed(2)} ({p.max_discount_pct}% máx.)
                </p>
                {p.visual_descriptor && <p className="text-xs text-muted truncate">{p.visual_descriptor}</p>}
              </div>
              <button onClick={() => toggleActive(p)} className="text-xs font-semibold text-muted hover:text-fg cursor-pointer shrink-0">
                {p.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
