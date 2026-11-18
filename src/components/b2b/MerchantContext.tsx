'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useStore, type Order, type Package, type Restaurant } from '@/store/useStore';
import { useNow } from '@/components/useNow';
import { parsePickupCode } from '@/lib/qrPayload';

export interface MerchantOrder extends Order {
  titulo?: string;
  cliente?: string;
  /** Pieces included in the lot of this order (0 if the lot no longer exists). */
  piezas: number;
}

export interface RedeemResult {
  ok: boolean;
  code: string;
  message: string;
}

interface MerchantStats {
  activeLots: number;
  pendingOrders: number;
  deliveredOrders: number;
  recoveredRevenue: number;
  rescuedPieces: number;
}

interface MerchantContextValue {
  rest: Restaurant;
  packages: Package[];
  orders: MerchantOrder[];
  stats: MerchantStats;
  now: Date;
  flash: (message: string) => void;
  /** Completes a pending order of this business using its pickup code. */
  redeemCode: (raw: string) => RedeemResult;
}

const MerchantContext = createContext<MerchantContextValue | null>(null);

export function useMerchant(): MerchantContextValue {
  const ctx = useContext(MerchantContext);
  if (!ctx) throw new Error('useMerchant must be used inside MerchantProvider');
  return ctx;
}

export function MerchantProvider({ rest, children }: { rest: Restaurant; children: React.ReactNode }) {
  const now = useNow();
  const allPackages = useStore((s) => s.packages);
  const allOrders = useStore((s) => s.orders);
  const users = useStore((s) => s.users);
  const updateOrderStatus = useStore((s) => s.updateOrderStatus);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const packages = useMemo(() => allPackages.filter((p) => p.restaurant_id === rest.id), [allPackages, rest.id]);

  const orders = useMemo<MerchantOrder[]>(
    () =>
      allOrders
        .filter((o) => o.restaurant_id === rest.id)
        .map((o) => {
          const pkg = allPackages.find((p) => p.id === o.package_id);
          return {
            ...o,
            titulo: pkg?.titulo,
            cliente: users.find((u) => u.id === o.user_id)?.nombre,
            piezas: pkg?.items_detectados?.reduce((acc, it) => acc + it.cantidad, 0) ?? 0,
          };
        })
        .reverse(),
    [allOrders, allPackages, users, rest.id]
  );

  const stats = useMemo<MerchantStats>(() => {
    const delivered = orders.filter((o) => o.estado === 'completada');
    return {
      activeLots: packages.filter((p) => p.disponible && p.cantidad_disponible > 0).length,
      pendingOrders: orders.filter((o) => o.estado === 'pendiente').length,
      deliveredOrders: delivered.length,
      recoveredRevenue: delivered.reduce((acc, o) => acc + o.precio_pagado, 0),
      rescuedPieces: delivered.reduce((acc, o) => acc + o.piezas, 0),
    };
  }, [orders, packages]);

  const redeemCode = useCallback(
    (raw: string): RedeemResult => {
      const clean = raw.trim().toUpperCase();
      const code = parsePickupCode(raw) ?? (clean.startsWith('#') ? clean : `#${clean}`);
      const target = orders.find((o) => o.codigo_recoleccion === code && o.estado === 'pendiente');
      if (!target) {
        return { ok: false, code, message: 'Código no encontrado o ya entregado' };
      }
      updateOrderStatus(target.id, 'completada');
      return { ok: true, code, message: `¡Pedido ${code} validado y entregado!` };
    },
    [orders, updateOrderStatus]
  );

  const value = useMemo<MerchantContextValue>(
    () => ({ rest, packages, orders, stats, now, flash, redeemCode }),
    [rest, packages, orders, stats, now, flash, redeemCode]
  );

  return (
    <MerchantContext.Provider value={value}>
      {children}
      {toast && (
        <div
          role="status"
          className="fade-in fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-lg bg-fg text-bg text-sm shadow-lg max-w-[90vw] text-center"
        >
          {toast}
        </div>
      )}
    </MerchantContext.Provider>
  );
}
