import { NextResponse } from 'next/server';

interface DetectedItem {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

interface VisionResult {
  titulo: string;
  descripcion: string;
  items: DetectedItem[];
  precio_original_total: number;
  precio_remate_sugerido: number;
  descuento_porcentaje: number;
  precio_piso: number;
  hora_limite_sugerida: string;
  confidence: number;
}

const PRESET_ANALYSES: Record<string, VisionResult> = {
  panaderia: {
    titulo: 'Selección de Panadería y Repostería',
    descripcion: 'Piezas artesanales del día horneadas esta mañana. Empacadas al momento.',
    items: [
      { nombre: 'Concha de mantequilla tradicional', cantidad: 3, precio_unitario: 26 },
      { nombre: 'Cuernito hojaldrado', cantidad: 2, precio_unitario: 32 },
      { nombre: 'Dona rellena de chocolate', cantidad: 2, precio_unitario: 28 },
    ],
    precio_original_total: 198,
    precio_remate_sugerido: 65,
    descuento_porcentaje: 67,
    precio_piso: 50,
    hora_limite_sugerida: '21:30',
    confidence: 0.93,
  },
  cafeteria: {
    titulo: 'Pack Cafetería & Bocadillos Dulces',
    descripcion: 'Postres y bocadillos de vitrina listos para disfrutar con café o para llevar.',
    items: [
      { nombre: 'Muffin de arándanos', cantidad: 2, precio_unitario: 45 },
      { nombre: 'Rebanada de pastel de zanahoria', cantidad: 1, precio_unitario: 65 },
      { nombre: 'Galleta de chispas de chocolate', cantidad: 2, precio_unitario: 25 },
    ],
    precio_original_total: 205,
    precio_remate_sugerido: 75,
    descuento_porcentaje: 63,
    precio_piso: 55,
    hora_limite_sugerida: '20:30',
    confidence: 0.91,
  },
  comida: {
    titulo: 'Menú Completo de Cocina Casera',
    descripcion: 'Platillos preparados del día con porciones abundantes y sazón casero.',
    items: [
      { nombre: 'Guisado de res con papas', cantidad: 2, precio_unitario: 85 },
      { nombre: 'Porción de arroz a la mexicana', cantidad: 2, precio_unitario: 30 },
      { nombre: 'Frijoles refritos con totopos', cantidad: 2, precio_unitario: 25 },
    ],
    precio_original_total: 280,
    precio_remate_sugerido: 89,
    descuento_porcentaje: 68,
    precio_piso: 70,
    hora_limite_sugerida: '19:00',
    confidence: 0.89,
  },
  default: {
    titulo: 'Paquete de Vitrina del Día',
    descripcion: 'Excedente fresco seleccionado directamente de vitrina para entrega hoy.',
    items: [
      { nombre: 'Platillo principal del chef', cantidad: 2, precio_unitario: 90 },
      { nombre: 'Acompañamiento del día', cantidad: 2, precio_unitario: 35 },
      { nombre: 'Postre o pan de la casa', cantidad: 1, precio_unitario: 40 },
    ],
    precio_original_total: 290,
    precio_remate_sugerido: 95,
    descuento_porcentaje: 67,
    precio_piso: 65,
    hora_limite_sugerida: '21:00',
    confidence: 0.90,
  },
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryHint, restaurantName } = body;

    // Simulate realistic AI vision inference time (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const normalizedCat = (categoryHint || '').toLowerCase();
    let result = PRESET_ANALYSES.default;

    if (normalizedCat.includes('pan') || normalizedCat.includes('bakery')) {
      result = PRESET_ANALYSES.panaderia;
    } else if (normalizedCat.includes('caf') || normalizedCat.includes('postre')) {
      result = PRESET_ANALYSES.cafeteria;
    } else if (normalizedCat.includes('comida') || normalizedCat.includes('mexic') || normalizedCat.includes('fonda')) {
      result = PRESET_ANALYSES.comida;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        restaurant_name: restaurantName || 'Tu Negocio',
        analyzed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Vision API error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo procesar la imagen' },
      { status: 500 }
    );
  }
}
