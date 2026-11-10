'use client';

export function LoginPrompt({ onGoLogin }: { onGoLogin: () => void }) {
  return (
    <div className="text-center pt-2">
      <p className="text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <button
          id="go-login"
          onClick={onGoLogin}
          className="font-semibold text-fg hover:text-accent underline underline-offset-4 cursor-pointer"
        >
          Inicia sesión aquí
        </button>
      </p>
    </div>
  );
}
