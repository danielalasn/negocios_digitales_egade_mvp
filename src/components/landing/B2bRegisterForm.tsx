'use client';

import { useState } from 'react';

const CATEGORIES = [
  'Mexicana',
  'Italiana',
  'Japonesa',
  'Hamburguesas',
  'Café & Pastelería',
  'Tailandesa',
  'China',
  'Vegana',
  'Mariscos',
  'Otra',
];

interface B2bRegisterFormProps {
  onBack: () => void;
  onSubmit: (data: {
    nombre: string;
    email: string;
    restaurantName: string;
    categoria: string;
    descripcion: string;
    horario: string;
    direccion: string;
  }) => void;
  isEmailTaken: (email: string) => boolean;
}

export function B2bRegisterForm({ onBack, onSubmit, isEmailTaken }: B2bRegisterFormProps) {
  const [f, setF] = useState({
    nombre: '',
    email: '',
    restName: '',
    cat: 'Mexicana',
    desc: '',
    horario: '09:00 - 22:00',
    dir: '',
  });
  const [error, setError] = useState('');

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nombre.trim() || !f.email.trim() || !f.restName.trim() || !f.dir.trim()) {
      return setError('Completa los campos obligatorios.');
    }
    if (isEmailTaken(f.email)) return setError('Ese correo ya está registrado.');
    onSubmit({
      nombre: f.nombre.trim(),
      email: f.email.trim(),
      restaurantName: f.restName.trim(),
      categoria: f.cat,
      descripcion: f.desc.trim(),
      horario: f.horario.trim(),
      direccion: f.dir.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-lg mx-auto p-8 fade-in space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-2 transition-colors cursor-pointer"
      >
        <span>←</span> Volver al inicio
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registra tu comercio</h1>
        <p className="text-sm text-muted mt-1">Comienza a monetizar tus excedentes hoy mismo.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Tu nombre</label>
          <input
            id="b2b-nombre"
            placeholder="Carlos López"
            className="input"
            value={f.nombre}
            onChange={set('nombre')}
          />
        </div>
        <div>
          <label className="label">Correo de contacto</label>
          <input
            id="b2b-email"
            type="email"
            placeholder="contacto@negocio.com"
            className="input"
            value={f.email}
            onChange={set('email')}
          />
        </div>
      </div>

      <div>
        <label className="label">Nombre del restaurante / local</label>
        <input
          id="b2b-rest"
          placeholder="Ej. Panadería Artesanal Miga"
          className="input"
          value={f.restName}
          onChange={set('restName')}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Categoría</label>
          <select id="b2b-cat" className="input" value={f.cat} onChange={set('cat')}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Horario de atención</label>
          <input
            id="b2b-horario"
            placeholder="09:00 - 21:00"
            className="input"
            value={f.horario}
            onChange={set('horario')}
          />
        </div>
      </div>

      <div>
        <label className="label">Dirección o colonia</label>
        <input
          id="b2b-dir"
          placeholder="Ej. Col. DistritoTec, Monterrey"
          className="input"
          value={f.dir}
          onChange={set('dir')}
        />
      </div>

      <div>
        <label className="label">Breve descripción del concepto</label>
        <textarea
          id="b2b-desc"
          rows={2}
          placeholder="Especialidad en panes de masa madre y repostería fina..."
          className="input"
          value={f.desc}
          onChange={set('desc')}
        />
      </div>

      {error && <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{error}</p>}

      <button id="b2b-submit" className="btn btn-primary w-full !py-3 font-semibold cursor-pointer">
        Activar mi restaurante en Buen Bocado →
      </button>
    </form>
  );
}
