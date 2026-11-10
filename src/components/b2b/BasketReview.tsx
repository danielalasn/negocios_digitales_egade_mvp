'use client';

import React, { useState } from 'react';

export interface BasketItemState {
  productId: string;
  name: string;
  photoUrl: string;
  quantity: number;
  regularPriceCents: number;
  unitPriceCents: number;
  floorPriceCents: number;
  maxDiscountPct: number;
  subtotalCents: number;
  confidence?: number;
  source: 'ai' | 'manual';
  edited: boolean;
}

export interface CatalogItem {
  id: string;
  name: string;
  photoUrl: string;
  regularPriceCents: number;
  maxDiscountPct: number;
  visualDescriptor?: string | null;
}

interface BasketReviewProps {
  initialItems: BasketItemState[];
  unmatched: { description: string; quantity: number }[];
  catalog: CatalogItem[];
  sourcePhoto: string;
  userMessage?: string;
  overallConfidence?: number;
  onConfirmPublish: (payload: {
    items: BasketItemState[];
    horaLimite: string;
    sourcePhotoRef: string;
    hadRemovals: boolean;
  }) => Promise<void>;
  onCancel: () => void;
}

export function BasketReview({
  initialItems,
  unmatched: initialUnmatched,
  catalog,
  sourcePhoto,
  userMessage,
  overallConfidence = 0.9,
  onConfirmPublish,
  onCancel,
}: BasketReviewProps) {
  const [items, setItems] = useState<BasketItemState[]>(initialItems);
  const [unmatched, setUnmatched] = useState(initialUnmatched);
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [horaLimite, setHoraLimite] = useState('21:30');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Totales
  const totalRegular = items.reduce((acc, i) => acc + (i.regularPriceCents * i.quantity) / 100, 0);
  const totalRemate = items.reduce((acc, i) => acc + (i.unitPriceCents * i.quantity) / 100, 0);
  const totalPieces = items.reduce((acc, i) => acc + i.quantity, 0);
  const avgDiscount = totalRegular > 0 ? Math.round(((totalRegular - totalRemate) / totalRegular) * 100) : 0;

  // Actualizar cantidad
  const handleUpdateQty = (idx: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((item, i) => {
          if (i !== idx) return item;
          const newQty = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQty,
            subtotalCents: item.unitPriceCents * newQty,
            edited: true,
          };
        })
    );
  };

  // Eliminar producto
  const handleDeleteItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Actualizar precio de remate dentro del piso garantizado
  const handleUpdatePrice = (idx: number, newPriceMXN: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const newPriceCents = Math.round(newPriceMXN * 100);
        // Validar límites
        const boundedPriceCents = Math.max(
          item.floorPriceCents,
          Math.min(item.regularPriceCents - 500, newPriceCents)
        );
        return {
          ...item,
          unitPriceCents: boundedPriceCents,
          subtotalCents: boundedPriceCents * item.quantity,
          edited: true,
        };
      })
    );
  };

  // Cambiar producto por otro del catálogo
  const handleChangeProduct = (idx: number, newProductId: string) => {
    const prod = catalog.find((c) => c.id === newProductId);
    if (!prod) return;

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const floorPriceCents = Math.round(prod.regularPriceCents * (1 - prod.maxDiscountPct / 100));
        let rematePriceCents = floorPriceCents;
        const remainder = rematePriceCents % 500;
        if (remainder !== 0) rematePriceCents += 500 - remainder;

        return {
          ...item,
          productId: prod.id,
          name: prod.name,
          photoUrl: prod.photoUrl,
          regularPriceCents: prod.regularPriceCents,
          unitPriceCents: rematePriceCents,
          floorPriceCents: floorPriceCents,
          maxDiscountPct: prod.maxDiscountPct,
          subtotalCents: rematePriceCents * item.quantity,
          edited: true,
        };
      })
    );
  };

  // Agregar producto manualmente desde el catálogo
  const handleAddFromCatalog = (product: CatalogItem, quantity = 1) => {
    const floorPriceCents = Math.round(product.regularPriceCents * (1 - product.maxDiscountPct / 100));
    let rematePriceCents = floorPriceCents;
    const remainder = rematePriceCents % 500;
    if (remainder !== 0) rematePriceCents += 500 - remainder;

    const newItem: BasketItemState = {
      productId: product.id,
      name: product.name,
      photoUrl: product.photoUrl,
      quantity,
      regularPriceCents: product.regularPriceCents,
      unitPriceCents: rematePriceCents,
      floorPriceCents: floorPriceCents,
      maxDiscountPct: product.maxDiscountPct,
      subtotalCents: rematePriceCents * quantity,
      source: 'manual',
      edited: true,
    };

    setItems((prev) => [...prev, newItem]);
    setShowAddModal(false);
  };

  // Asignar ítem no identificado
  const handleAssignUnmatched = (unmatchedIdx: number, targetProductId: string) => {
    const prod = catalog.find((c) => c.id === targetProductId);
    if (!prod) return;

    const un = unmatched[unmatchedIdx];
    handleAddFromCatalog(prod, Math.max(1, un.quantity));
    // Descartar de la lista de unmatched
    setUnmatched((prev) => prev.filter((_, i) => i !== unmatchedIdx));
  };

  // Confirmar y publicar
  const handleConfirm = async () => {
    if (items.length === 0) return;
    setIsPublishing(true);
    try {
      await onConfirmPublish({
        items,
        horaLimite,
        sourcePhotoRef: sourcePhoto,
        hadRemovals: items.filter((i) => i.source === 'ai').length < initialItems.length,
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Revisión de Canasta al Cierre
          </span>
          <h2 className="text-lg font-bold text-fg mt-0.5">
            Lote Sugerido a Partir de tu Catálogo
          </h2>
          {userMessage && (
            <p className="text-xs text-muted mt-1">{userMessage}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-line text-muted hover:text-fg self-start sm:self-auto cursor-pointer"
        >
          Descartar y tomar otra foto
        </button>
      </div>

      {/* Alerta de confianza moderada si aplica */}
      {overallConfidence < 0.8 && (
        <div className="p-3.5 rounded-xl bg-subtle border border-line flex items-center justify-between text-xs text-muted">
          <span>La IA sugiere revisar las cantidades estimadas antes de confirmar la publicación.</span>
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-surface border border-line">
            Confianza: {Math.round(overallConfidence * 100)}%
          </span>
        </div>
      )}

      {/* Lista de productos de la canasta */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-fg uppercase tracking-wider">
            Productos Identificados ({totalPieces} piezas)
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            + Agregar producto del catálogo
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-line rounded-xl text-xs text-muted">
            No hay productos en la canasta. Haz clic en "Agregar producto del catálogo" para comenzar.
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={`${item.productId}-${idx}`}
                className="p-3.5 sm:p-4 rounded-xl bg-subtle border border-line flex flex-col gap-3 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Miniatura y nombre */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={item.photoUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover border border-line shrink-0"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-fg text-sm truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted">
                          Reg. ${(item.regularPriceCents / 100).toFixed(2)} MXN
                        </span>
                        {item.source === 'manual' && (
                          <span className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-surface border border-line text-muted">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Controles: Cantidad, Precios y Acciones agrupados limpiamente */}
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/40">
                    {/* Cantidad */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted">Cant:</span>
                      <div className="flex items-center border border-line rounded-lg bg-surface">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          className="px-2 py-1 text-xs hover:bg-subtle text-fg font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-fg text-xs min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          className="px-2 py-1 text-xs hover:bg-subtle text-fg font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Precio Unitario */}
                    <div className="text-right min-w-[65px]">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          ${(item.unitPriceCents / 100).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-muted">c/u</span>
                      </div>
                      <span className="text-[10px] text-muted block">
                        Piso: ${(item.floorPriceCents / 100).toFixed(2)}
                      </span>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right min-w-[80px]">
                      <span className="text-[10px] text-muted uppercase block">Subtotal</span>
                      <span className="text-xs font-bold text-fg">
                        ${(item.subtotalCents / 100).toFixed(2)} MXN
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 pl-1 sm:border-l sm:border-line/50">
                      <button
                        type="button"
                        onClick={() => setEditingItemIdx(editingItemIdx === idx ? null : idx)}
                        className="px-2.5 py-1 rounded border border-line text-xs font-semibold text-fg hover:bg-surface cursor-pointer"
                      >
                        {editingItemIdx === idx ? 'Cerrar' : 'Editar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(idx)}
                        className="px-2 py-1 text-xs text-rose-500 hover:text-rose-700 cursor-pointer"
                        title="Eliminar producto de la canasta"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel de Edición Desplegable */}
                {editingItemIdx === idx && (
                  <div className="w-full pt-3 mt-1 border-t border-line/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface p-3 rounded-lg">
                    <div>
                      <label className="text-[11px] font-bold text-muted block mb-1">
                        Cambiar por otro producto del catálogo:
                      </label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleChangeProduct(idx, e.target.value)}
                        className="w-full text-xs p-1.5 rounded border border-line bg-surface text-fg"
                      >
                        {catalog.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Reg. ${(c.regularPriceCents / 100).toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-muted block mb-1">
                        Ajustar precio de remate (Mínimo: ${(item.floorPriceCents / 100).toFixed(2)}):
                      </label>
                      <input
                        type="number"
                        min={item.floorPriceCents / 100}
                        max={(item.regularPriceCents - 500) / 100}
                        step="5"
                        value={item.unitPriceCents / 100}
                        onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                        className="w-full text-xs p-1.5 rounded border border-line bg-surface text-fg font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sección "Sin identificar" si Gemini vio artículos fuera de catálogo */}
      {unmatched && unmatched.length > 0 && (
        <div className="p-4 rounded-xl border border-line bg-subtle space-y-2 text-xs">
          <span className="font-bold text-muted uppercase text-[10px] tracking-wider block">
            Artículos fuera de catálogo identificados en la vitrina
          </span>
          <div className="space-y-2">
            {unmatched.map((un, uIdx) => (
              <div
                key={uIdx}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-surface border border-line"
              >
                <div>
                  <span className="font-semibold text-fg">{un.description}</span>
                  <span className="text-muted ml-2">({un.quantity} pieza{un.quantity > 1 ? 's' : ''})</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleAssignUnmatched(uIdx, e.target.value);
                    }}
                    className="text-xs p-1 rounded border border-line bg-surface text-fg"
                  >
                    <option value="" disabled>
                      Asignar a producto del catálogo...
                    </option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setUnmatched((prev) => prev.filter((_, i) => i !== uIdx))}
                    className="text-[11px] text-muted hover:text-fg px-1.5 py-0.5 rounded border border-line cursor-pointer"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumen Final y Publicación */}
      <div className="p-4 rounded-xl bg-subtle border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-muted uppercase block">Valor Regular</span>
            <span className="text-sm font-semibold text-muted line-through">
              ${totalRegular.toFixed(2)} MXN
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Precio del Lote</span>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              ${totalRemate.toFixed(2)} MXN
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted uppercase block">Descuento</span>
            <span className="text-sm font-bold text-fg">
              -{avgDiscount}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Hora límite:</span>
            <input
              type="time"
              value={horaLimite}
              onChange={(e) => setHoraLimite(e.target.value)}
              className="text-xs p-1 rounded border border-line bg-surface text-fg font-mono font-semibold"
            />
          </div>

          <button
            type="button"
            disabled={items.length === 0 || isPublishing}
            onClick={handleConfirm}
            className="btn btn-primary px-5 py-2.5 text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            {isPublishing ? 'Publicando...' : 'Confirmar y publicar'}
          </button>
        </div>
      </div>

      {/* Modal / Popover para agregar producto del catálogo */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-bold text-sm text-fg">Agregar Producto del Catálogo</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-muted hover:text-fg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {catalog.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleAddFromCatalog(c)}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-line hover:border-emerald-500 bg-subtle/50 cursor-pointer transition-colors"
                >
                  <img
                    src={c.photoUrl}
                    alt={c.name}
                    className="w-10 h-10 rounded-lg object-cover border border-line"
                  />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-fg">{c.name}</h4>
                    <span className="text-[11px] text-muted">
                      Reg. ${(c.regularPriceCents / 100).toFixed(2)} MXN
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    + Agregar
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
