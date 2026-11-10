'use client';

import { useState } from 'react';

interface B2cRegisterFormProps {
  onBack: () => void;
  onSubmit: (data: { nombre: string; email: string; password: string }) => Promise<void>;
}

export function B2cRegisterForm({ onBack, onSubmit }: B2cRegisterFormProps) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim() || !password) return setError('Completa todos los campos.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setError('');
    setLoading(true);
    try {
      await onSubmit({ nombre: nombre.trim(), email: email.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
      setLoading(false);
    }
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
          autoComplete="email"
        />
      </div>

      <div>
        <label className="label">Contraseña (mínimo 6 caracteres)</label>
        <input
          id="b2c-password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{error}</p>}

      <button
        id="b2c-submit"
        disabled={loading}
        className="btn btn-primary w-full !py-3 font-semibold cursor-pointer disabled:opacity-60"
      >
        {loading ? 'Creando cuenta...' : 'Empezar a rescatar comida →'}
      </button>
    </form>
  );
}
