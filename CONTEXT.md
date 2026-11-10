# Buen Bocado — Contexto Integral del Sistema (CONTEXT.md)

> **Proyecto:** Buen Bocado — Plataforma AI-Native de Rescate de Alimentos  
> **Programa Académico:** Maestría en Negocios Digitales — EGADE Business School  
> **Ubicación Piloto:** Monterrey, Nuevo León (DistritoTec, San Pedro, Centro, Cumbres, Contry)  
> **Versión:** MVP v1 (autenticación real, IA de visión real, métricas desde base de datos)

---

## 1. Misión, Visión y Tesis de Negocio

### El Problema
En México se desperdician más de **20 millones de toneladas de alimentos al año** (38% de la producción nacional). Para panaderías, cafeterías, fondas y restaurantes locales, desechar excedentes al cierre representa:
* Pérdida económica directa del 10% al 18% del costo de insumos.
* Fricción operativa severa: los empleados al cierre no tienen tiempo de registrar inventarios manuales en plataformas complejas.
* Emisiones de gas metano y huella de carbono evitables.

### La Solución: Buen Bocado
Buen Bocado es un marketplace bilateral (B2B y B2C) de rescate de excedentes de comida fresca que se distingue por dos pilares:
1. **Zero-Friction Vision AI para Comercios (B2B):** El comerciante solo toma **1 foto de su vitrina o mostrador** al final de su jornada. Un modelo de visión clasifica los productos, valida que sean alimentos aptos, estima el valor original y sugiere un precio de remate dinámico con **precio piso garantizado** para publicación en 1 solo clic.
2. **Paquetes Visibles y Transparentes para Clientes (B2C):** Supera la fricción de las plataformas tradicionales (como *Too Good To Go* basadas en "bolsas sorpresa") mostrando exactamente qué incluye el lote y reduciendo la incertidumbre del consumidor, lo que incrementa la conversión y la retención.

---

## 2. Comparativa de Mercado: Buen Bocado vs Modelos Tradicionales

| Dimensión | Modelo Tradicional (Desecho) | Too Good To Go (Internacional) | Buen Bocado (Nuestra Solución) |
| :--- | :--- | :--- | :--- |
| **Tiempo de Publicación para el Comercio** | 0 min (se tira a la basura) | 5 - 8 minutos (inventario manual en app) | **< 30 segundos** (1 foto con Visión AI) |
| **Experiencia del Consumidor** | N/A | "Bolsa Sorpresa" a ciegas (ansiedad/alergias) | **Paquete Visible** (foto real y desglose de piezas) |
| **Protección de Margen B2B** | 100% de pérdida | Descuento fijo obligatorio | **Precio Piso Dinámico Garantizado** |
| **Pronóstico de Operación** | Inexistente | Nula retroalimentación | **AI Flywheel:** Sugerencias de producción para mañana |
| **Filtro de Seguridad** | N/A | N/A | **Verificación automática de comida apta** |

---

## 3. Alcance del MVP v1 y evidencia

**Caso de uso único:** un negocio publica su excedente del cierre con 1 foto; la IA propone el lote y el negocio lo confirma; un comprador lo reserva y lo recoge con un código.

* **Paso central con IA real:** `/api/vision` (Gemini) compara la foto contra el catálogo del negocio. No hay resultados simulados: si el modelo falla, se muestra el error.
* **Control humano:** el negocio revisa y edita cantidades, producto y precio (siempre dentro del precio piso). El servidor revalida los precios.
* **Pago:** en efectivo en el local, al recoger. No hay pasarela de pago.
* **Métricas:** `/admin/piloto` (solo correos en `ADMIN_EMAILS`) muestra datos calculados desde la base y solo de cuentas reales de Supabase Auth. Sin datos, muestra vacío.
* **Evaluación de la IA:** `scripts/eval-vision.mjs` manda fotos reales etiquetadas a mano por el mismo endpoint y genera `results.csv`.
* Las hipótesis de cohorte (H1 hábito en 10 negocios, H2 A/B de conversión y retención a 14 días) **no se miden en este MVP**; se estudian por separado.

---

## 4. Arquitectura y Stack Tecnológico

El sistema fue concebido con arquitectura modular, desacoplada y de máxima velocidad:

```
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│  Next.js 16 (App Router) + React 19 + TypeScript 5     │
│  Tailwind CSS v4 (Design System Tokens HSL, Dark/Light)│
│  Zustand (Global Store con persistencia local y sync)  │
│  PWA / Service Workers (Next-PWA)                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND & APIS                       │
│  Next.js Server Actions & API Routes (/api/vision)     │
│  Filtro Inteligente de Seguridad y Validación de Fotos │
│  Inferencia Multimodal (Gemini Vision AI, sin simulación)│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   PERSISTENCIA & ORM                   │
│  PostgreSQL (Supabase Pooler / Direct Connection)      │
│  Supabase Auth + Row Level Security por dueño          │
│  Eventos en analytics_events (latencia, tokens, edición)│
└────────────────────────────────────────────────────────┘
```

### Tecnologías Clave:
* **Next.js 16 & React 19:** Renderizado híbrido (SSR para vitrinas, Client Components para reactividad instantánea de subida y compra).
* **Zustand (`src/store/useStore.ts`):** Estado global reactivo para usuarios, comercios, órdenes, favoritos y catálogo con soporte de hidratación segura (`useHydrated`).
* **Tailwind CSS v4:** Paleta semántica (`--color-surface`, `--color-fg`, `--color-emerald-500`, etc.) sin dependencias de librerías CSS pesadas.
* **Filtro de Visión Artificial (`/api/vision`):** Endpoint encargado de verificar la imagen, rechazar fotos que no contengan alimentos, y generar la propuesta de lote y precio.

---

## 5. Mapa del Código

```
src/
├── app/
│   ├── page.tsx                    # Landing, registro e inicio de sesión (correo y contraseña)
│   ├── b2b/page.tsx                # Panel del negocio: paquetes, pedidos, publicar con IA, "Mi catálogo"
│   ├── b2c/page.tsx                # Marketplace del comprador y reservas
│   ├── admin/piloto/page.tsx       # Métricas reales (solo ADMIN_EMAILS)
│   ├── restaurante/[id]/, perfil/
│   └── api/
│       ├── vision/route.ts         # Foto -> Gemini -> canasta propuesta (precios solo del catálogo)
│       ├── basket/confirm/route.ts # Revalida precios, guarda canasta y paquete, registra evento
│       ├── orders/route.ts         # Reserva con descuento de stock atómico (bloqueo de fila)
│       └── admin/metrics/route.ts  # Métricas agregadas desde Postgres
├── components/
│   ├── VisionUploader.tsx          # Foto (comprimida en el navegador) -> análisis -> revisión
│   ├── b2b/BasketReview.tsx        # Revisión editable de la canasta propuesta por la IA
│   ├── b2b/CatalogManager.tsx      # Alta de productos del catálogo (precio, piso, descriptor visual)
│   └── landing/                    # Secciones y formularios de acceso
├── lib/
│   ├── gemini.ts                   # Prompt, esquema y llamada a Gemini (devuelve latencia y tokens)
│   ├── serverAuth.ts               # Verifica el JWT de Supabase y resuelve el negocio desde la base
│   ├── supabase.ts                 # Cliente Supabase + authHeaders()
│   └── image.ts                    # Compresión de imágenes en el navegador
└── store/useStore.ts               # Estado (Zustand) que refleja la base; sin datos semilla
prisma/migrations/                  # Esquema y migración de RLS/Auth (20261110_auth_rls)
scripts/eval-vision.mjs             # Evaluación de la IA con fotos reales etiquetadas
```

---

## 6. Flujos Principales

### Negocio (B2B)
1. Se registra (correo, contraseña, datos del local). Un trigger de base de datos crea su perfil y su negocio.
2. En **Mi catálogo** carga sus productos: foto, precio regular, descuento máximo (define el precio piso) y cómo se ve en la vitrina.
3. Al cierre toma 1 foto en **Publicar nuevo paquete**. Gemini cuenta las piezas contra el catálogo; lo que no reconoce queda como "fuera de catálogo".
4. Revisa, ajusta y confirma. Se registra si aprobó sin editar. El lote aparece en el marketplace.
5. Cuando llega el comprador, valida su código en el panel.

### Comprador (B2C)
1. Se registra, filtra por zona o tipo de comida y ve el lote con foto real y desglose.
2. Reserva (descuento de stock atómico) y recibe un código. Paga en efectivo al recoger.

### Seguridad
* La identidad siempre sale del token de sesión verificado en el servidor, nunca del cuerpo de la petición.
* RLS: cada usuario solo edita lo suyo; los precios del lote se calculan y revalidan en el servidor.

---

## 7. Datos legados

La base conserva filas de una demostración anterior (6 restaurantes ficticios y 19 paquetes, estos últimos con `disponible = false`). No pertenecen a ninguna cuenta real, son de solo lectura y no cuentan en las métricas.

---

## 8. Comandos de Operación Local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo
npm run dev

# Compilación y verificación estricta de tipos
npm run build

# Evaluar la IA con fotos reales (ver cabecera del script)
node scripts/eval-vision.mjs <carpeta> <correo> <contraseña> [urlBase]

# Ejecución en producción
npm start
```

---

*Documento generado y mantenido como referencia central para desarrolladores, evaluadores de proyecto y directores académicos de EGADE.*
