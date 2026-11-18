'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMerchant } from '@/components/b2b/MerchantContext';

type IconName = 'home' | 'scan' | 'list' | 'camera' | 'layers' | 'book' | 'more';

const ICONS: Record<IconName, React.ReactNode> = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  scan: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v12H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
  book: <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4zM5 17a3 3 0 0 1 3-3h11" />,
  more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}

export function MerchantNav() {
  const pathname = usePathname();
  const { stats } = useMerchant();
  const [moreOpen, setMoreOpen] = useState(false);

  const items: NavItem[] = [
    { href: '/b2b', label: 'Inicio', icon: 'home' },
    { href: '/b2b/canjear', label: 'Canjear', icon: 'scan' },
    { href: '/b2b/pedidos', label: 'Pedidos', icon: 'list', badge: stats.pendingOrders },
    { href: '/b2b/publicar', label: 'Publicar', icon: 'camera' },
    { href: '/b2b/lotes', label: 'Mis lotes', icon: 'layers' },
    { href: '/b2b/catalogo', label: 'Catálogo', icon: 'book' },
  ];

  const isActive = (href: string) => (href === '/b2b' ? pathname === '/b2b' : pathname.startsWith(href));
  const mobilePrimary = items.slice(0, 4);
  const mobileMore = items.slice(4);
  const moreActive = mobileMore.some((i) => isActive(i.href));

  return (
    <>
      {/* Desktop: tabs under the site header */}
      <nav
        aria-label="Módulos del comercio"
        className="hidden md:block sticky top-16 z-30 bg-bg/90 backdrop-blur-md border-b border-line"
      >
        <div className="mx-auto max-w-5xl px-4 flex gap-1 py-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive(item.href) ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg hover:bg-subtle'
              }`}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
              {item.badge ? (
                <span
                  className={`text-[11px] font-bold px-1.5 rounded-full ${
                    isActive(item.href) ? 'bg-accent-fg/20' : 'bg-amber-500/15 text-amber-600'
                  }`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </nav>

      {/* Mobile: bottom bar */}
      <nav
        aria-label="Módulos del comercio"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5">
          {mobilePrimary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                isActive(item.href) ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="relative">
                <Icon name={item.icon} />
                {item.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-white text-[10px] leading-4 text-center">
                    {item.badge}
                  </span>
                ) : null}
              </span>
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold cursor-pointer ${
              moreActive || moreOpen ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon name="more" />
            Más
          </button>
        </div>

        {moreOpen && (
          <div className="absolute bottom-full inset-x-0 bg-surface border-t border-line p-2 shadow-lg">
            {mobileMore.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${
                  isActive(item.href) ? 'text-accent bg-subtle' : 'text-fg'
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  );
}
