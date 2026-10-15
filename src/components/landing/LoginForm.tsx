'use client';

import { useState } from 'react';
import { User } from '@/store/useStore';

interface LoginFormProps {
  onBack: () => void;
  onSubmit: (email: string) => boolean | void;
  error?: string;
}

export function LoginForm({ onBack, onSubmit, error: externalError }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return setLocalError('Ingresa un correo electrónico.');
    }
    setLocalError('');
    onSubmit(email.trim());
  };

  const currentError = externalError || localError;

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
        <p className="text-sm text-muted mt-1">Ingresa el correo de tu cuenta ya creada.</p>
      </div>

      <div>
        <label className="label">Correo electrónico</label>
        <input
          id="login-email"
          type="email"
          placeholder="tu@correo.com"
          className="input"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (localError) setLocalError('');
          }}
          autoFocus
          required
        />
      </div>

      <div className="p-3.5 rounded-xl bg-subtle border border-line text-xs space-y-2">
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
          Cuentas rápidas de demostración:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEmail('sofia@demo.com')}
            className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-accent hover:text-accent cursor-pointer transition-colors"
          >
            sofia@demo.com (Cliente)
          </button>
          <button
            type="button"
            onClick={() => setEmail('marco@trattoria.com')}
            className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-accent hover:text-accent cursor-pointer transition-colors"
          >
            marco@trattoria.com (B2B)
          </button>
        </div>
      </div>

      {currentError && (
        <p className="text-sm font-medium text-danger bg-danger-soft p-3 rounded-xl">{currentError}</p>
      )}

      <button id="login-submit" className="btn btn-primary w-full !py-3 font-semibold cursor-pointer">
        Iniciar sesión →
      </button>
    </form>
  );
}
