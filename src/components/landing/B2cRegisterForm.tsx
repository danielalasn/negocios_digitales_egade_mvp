'use client';

import { useState } from 'react';

interface B2cRegisterFormProps {
  onBack: () => void;
  onSubmit: (data: { nombre: string; email: string }) => void;
  isEmailTaken: (email: string) => boolean;
}

export function B2cRegisterForm({ onBack, onSubmit, isEmailTaken }: B2cRegisterFormProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return setError('Completa todos los campos.');
    if (isEmailTaken(email)) return setError('Ese correo ya está registrado.');
    onSubmit({ nombre: nombre.trim(), email: email.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="card max-w-md mx-auto p-8 fade-in space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-2 transition-colors cursor-pointer"
      >
        <span>←</span> Volver al inicio
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Crear cuenta de cliente</h1>
        <p className="text-sm text-muted mt-1">Regístrate para rescatar comida deliciosa cerca de ti.</p>
      </div>

      <div>
        <label className="label">Tu nombre completo</label>
        <input
          id="b2c-nombre"
          placeholder="Ej. Ana García"
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Correo electrónico</label>
        <input
          id="b2c-email"
          type="email"
          placeholder="ana@ejemplo.com"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{error}</p>}

      <button id="b2c-submit" className="btn btn-primary w-full !py-3 font-semibold cursor-pointer">
        Empezar a rescatar comida →
      </button>
    </form>
  );
}
