'use client';

import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { useHydrated } from '@/components/useHydrated';
import { MerchantProvider } from '@/components/b2b/MerchantContext';
import { MerchantNav } from '@/components/b2b/MerchantNav';

function Notice({ title, text, children }: { title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-bold text-lg">{title}</p>
      <p className="text-sm text-muted mt-1.5">{text}</p>
      <div className="mt-6 flex justify-center gap-3">{children}</div>
    </div>
  );
}

export default function B2BLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const currentUser = useStore((s) => s.currentUser);
  const restaurants = useStore((s) => s.restaurants);

  if (!hydrated) return null;

  if (!currentUser) {
    return (
      <Notice title="Inicia sesión para entrar" text="Esta sección requiere una cuenta de restaurante (B2B).">
        <Link href="/" className="btn btn-primary text-xs font-bold inline-flex items-center gap-1.5">
          Ir a iniciar sesión →
        </Link>
      </Notice>
    );
  }

  if (currentUser.rol !== 'b2b') {
    return (
      <Notice
        title="Esta sección es para comercios"
        text={`Actualmente estás con una cuenta de cliente (${currentUser.nombre}).`}
      >
        <Link href="/b2c" className="btn btn-primary text-xs font-bold">Ir a compras (B2C)</Link>
        <Link href="/" className="btn btn-ghost text-xs font-semibold">Cambiar de cuenta</Link>
      </Notice>
    );
  }

  const rest = restaurants.find((r) => r.ownerId === currentUser.id);
  if (!rest) {
    return (
      <Notice title="Sin restaurante asociado" text={`Tu cuenta (${currentUser.email}) no tiene un restaurante registrado.`}>
        <Link href="/" className="btn btn-primary text-xs font-bold">Volver al inicio</Link>
      </Notice>
    );
  }

  return (
    <MerchantProvider rest={rest}>
      <div className="mx-auto max-w-5xl px-4 pt-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight leading-tight">{rest.nombre}</h1>
          <p className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="badge badge-eco text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Activo
            </span>
            <span>
              {rest.categoria} · {rest.direccion}
            </span>
          </p>
        </div>
        <Link href={`/restaurante/${rest.id}`} className="btn btn-ghost text-xs !py-2 !px-3 font-semibold shrink-0">
          Perfil público
        </Link>
      </div>

      <div className="mt-4">
        <MerchantNav />
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-28 md:pb-12">{children}</div>
    </MerchantProvider>
  );
}
