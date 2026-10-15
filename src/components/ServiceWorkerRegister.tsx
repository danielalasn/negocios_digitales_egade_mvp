'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function ServiceWorkerRegister() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed / standalone
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            console.log('[PWA] Service Worker registrado con éxito:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] Nueva versión disponible. Recarga para actualizar.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Error al registrar Service Worker:', err);
          });
      });
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt banner after a brief delay if not dismissed recently
      const dismissed = localStorage.getItem('bb-pwa-banner-dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aplicación Buen Bocado instalada');
      setShowInstallBanner(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Opción del usuario:', outcome);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    localStorage.setItem('bb-pwa-banner-dismissed', 'true');
  };

  if (!showInstallBanner || isInstalled) return null;

  const isLanding = pathname === '/';
  const positionClass = isLanding
    ? 'bottom-4 left-4 right-4 sm:left-auto sm:right-6'
    : 'bottom-22 left-4 right-4 sm:left-auto sm:right-6';

  return (
    <aside
      aria-label="Instalar aplicación Buen Bocado"
      className={`fixed ${positionClass} sm:w-96 z-50 p-4 rounded-2xl bg-surface/95 backdrop-blur-md border border-accent/30 shadow-xl flex items-center justify-between gap-3 animate-slide-up`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-soft text-accent border border-accent/20 flex items-center justify-center shrink-0 shadow-xs">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-bold text-fg">Instala Buen Bocado</p>
          <p className="text-[11px] text-muted">Accede más rápido y rescata comida sin conexión.</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="btn btn-primary !py-1.5 !px-3 text-xs font-bold"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Cerrar banner de instalación"
          className="p-1.5 text-muted hover:text-fg rounded-lg transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>
    </aside>
  );
}
