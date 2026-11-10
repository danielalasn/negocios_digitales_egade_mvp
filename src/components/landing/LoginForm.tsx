'use client';

import { useState } from 'react';

interface LoginFormProps {
  onBack: () => void;
  onSubmit: (email: string, password: string) => Promise<void>;
}

export function LoginForm({ onBack, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      return setError('Ingresa tu correo y contraseña.');
    }
    setError('');
    setLoading(true);
    try {
      await onSubmit(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
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
        <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
        <p className="text-sm text-muted mt-1">Ingresa con el correo y la contraseña de tu cuenta.</p>
      </div>

      <div>
        <label className="label">Correo electrónico</label>
        <input
          id="login-email"
          type="email"
          placeholder="tu@correo.com"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="label">Contraseña</label>
        <input
          id="login-password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      {error && <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{error}</p>}

      <button
        id="login-submit"
        disabled={loading}
        className="btn btn-primary w-full !py-3 font-semibold cursor-pointer disabled:opacity-60"
      >
        {loading ? 'Entrando...' : 'Iniciar sesión →'}
      </button>
    </form>
  );
}
