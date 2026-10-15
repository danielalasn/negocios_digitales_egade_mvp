'use client';

interface QuickDemoBarProps {
  onQuickDemoB2C: () => void;
  onQuickDemoB2B: () => void;
  onGoLogin: () => void;
}

export function QuickDemoBar({ onQuickDemoB2C, onQuickDemoB2B, onGoLogin }: QuickDemoBarProps) {
  return (
    <div className="space-y-4">
      <div className="max-w-xl mx-auto rounded-2xl bg-subtle/80 border border-line p-5 text-center">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
          Acceso rápido para probar el prototipo
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            id="demo-client-btn"
            onClick={onQuickDemoB2C}
            className="btn btn-ghost !py-2 !px-4 text-xs font-semibold hover:border-accent hover:text-accent"
          >
            Entrar como Sofía (Cliente Demo)
          </button>
          <button
            id="demo-b2b-btn"
            onClick={onQuickDemoB2B}
            className="btn btn-ghost !py-2 !px-4 text-xs font-semibold hover:border-accent hover:text-accent"
          >
            Entrar como Chef Marco (Trattoria Roma)
          </button>
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-sm text-muted">
          ¿Ya tienes cuenta creada?{' '}
          <button
            id="go-login"
            onClick={onGoLogin}
            className="font-semibold text-fg hover:text-accent underline underline-offset-4 cursor-pointer"
          >
            Inicia sesión aquí
          </button>
        </p>
      </div>
    </div>
  );
}
