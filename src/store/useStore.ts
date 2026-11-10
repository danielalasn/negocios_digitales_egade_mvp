import { create } from 'zustand';
import { supabase, authHeaders } from '@/lib/supabase';

// ========================
// TYPES
// ========================

export type UserRole = 'b2b' | 'b2c';

export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  avatar?: string;
  restaurantes_favoritos: string[]; // restaurant IDs
  createdAt: string;
}

export interface Restaurant {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  logo: string;
  cover?: string;
  horario: string;
  direccion: string;
  rating: number;
  totalReviews: number;
  ownerId: string; // User ID of B2B owner
  createdAt: string;
}

export interface Package {
  id: string;
  restaurant_id: string;
  titulo: string;
  descripcion: string;
  cantidad: number;
  cantidad_disponible: number;
  precio_original: number;
  precio_remate: number;
  hora_limite: string; // HH:MM format
  disponible: boolean;
  foto_vitrina?: string;
  items_detectados?: { nombre: string; cantidad: number; precio_estimado?: number }[];
  aprobado_sin_edicion?: boolean;
  createdAt: string;
}

export type OrderStatus = 'pendiente' | 'completada' | 'cancelada';

export interface Order {
  id: string;
  package_id: string;
  user_id: string;
  restaurant_id: string;
  codigo_recoleccion: string;
  estado: OrderStatus;
  precio_pagado: number;
  createdAt: string;
}

// ========================
// HELPERS
// ========================

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Translates Supabase Auth errors into user-facing Spanish messages. */
function authErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese correo ya está registrado. Inicia sesión.';
  if (m.includes('password') && m.includes('characters')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
  return message;
}

export interface SignUpData {
  email: string;
  password: string;
  nombre: string;
  rol: UserRole;
  business?: {
    restaurantName: string;
    categoria: string;
    descripcion: string;
    horario: string;
    direccion: string;
  };
}

// ========================
// STORE
// ========================

interface AppState {
  // Auth (source of truth is the Supabase session)
  currentUser: User | null;
  authReady: boolean;

  // Data mirrored from the database (filtered by Row Level Security)
  users: User[];
  restaurants: Restaurant[];
  packages: Package[];
  orders: Order[];

  // Actions - Auth
  initAuth: () => Promise<void>;
  signUp: (data: SignUpData) => Promise<User>;
  signIn: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUserProfile: (data: { nombre: string }) => void;

  // Actions - B2C
  toggleFavorite: (restaurantId: string) => void;
  createOrder: (packageId: string) => Promise<Order>;

  // Actions - B2B
  createPackage: (data: Omit<Package, 'id' | 'createdAt' | 'cantidad_disponible' | 'disponible'>) => Package;
  updateOrderStatus: (orderId: string, estado: OrderStatus) => void;
  deletePackage: (packageId: string) => void;

  // Actions - Supabase Sync
  syncFromSupabase: () => Promise<void>;

  // Selectors helpers
  getRestaurantPackages: (restaurantId: string) => Package[];
  getRestaurantOrders: (restaurantId: string) => Order[];
  getAvailablePackages: () => (Package & { restaurant: Restaurant })[];
  getUserOrders: (userId: string) => (Order & { package: Package; restaurant: Restaurant })[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapRestaurantFromDB = (r: any): Restaurant => ({
  id: r.id,
  nombre: r.nombre,
  categoria: r.categoria,
  descripcion: r.descripcion || '',
  logo: r.logo || '',
  horario: r.horario || '',
  direccion: r.direccion || '',
  rating: Number(r.rating) || 0,
  totalReviews: r.total_reviews || 0,
  ownerId: r.owner_id || '',
  createdAt: r.created_at || new Date().toISOString(),
});

const mapPackageFromDB = (p: any): Package => ({
  id: p.id,
  restaurant_id: p.restaurant_id,
  titulo: p.titulo,
  descripcion: p.descripcion || '',
  cantidad: p.cantidad,
  cantidad_disponible: p.cantidad_disponible,
  precio_original: parseFloat(p.precio_original),
  precio_remate: parseFloat(p.precio_remate),
  hora_limite: p.hora_limite,
  disponible: p.disponible,
  foto_vitrina: p.foto_vitrina || undefined,
  items_detectados: p.items_detectados || undefined,
  aprobado_sin_edicion: p.aprobado_sin_edicion ?? undefined,
  createdAt: p.created_at || new Date().toISOString(),
});

const mapOrderFromDB = (o: any): Order => ({
  id: o.id,
  package_id: o.package_id,
  user_id: o.user_id,
  restaurant_id: o.restaurant_id,
  codigo_recoleccion: o.codigo_recoleccion,
  estado: o.estado,
  precio_pagado: parseFloat(o.precio_pagado),
  createdAt: o.created_at || new Date().toISOString(),
});

const mapUserFromDB = (u: any): User => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  restaurantes_favoritos: u.restaurantes_favoritos || [],
  createdAt: u.created_at || new Date().toISOString(),
});

let authListenerAttached = false;

export const useStore = create<AppState>()((set, get) => ({
  currentUser: null,
  authReady: false,
  users: [],
  restaurants: [],
  packages: [],
  orders: [],

  // ---- SYNC ----
  syncFromSupabase: async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;

      const [uRes, rRes, pRes, oRes] = await Promise.all([
        sessionUser ? supabase.from('users').select('*') : Promise.resolve({ data: [] as any[] }),
        supabase.from('restaurants').select('*'),
        supabase.from('packages').select('*'),
        sessionUser ? supabase.from('orders').select('*') : Promise.resolve({ data: [] as any[] }),
      ]);

      const users = (uRes.data || []).map(mapUserFromDB);
      set({
        users,
        currentUser: sessionUser ? users.find((u) => u.id === sessionUser.id) ?? null : null,
        restaurants: (rRes.data || []).map(mapRestaurantFromDB),
        packages: (pRes.data || []).map(mapPackageFromDB),
        orders: (oRes.data || []).map(mapOrderFromDB),
      });
    } catch (err) {
      console.error('Error syncing from Supabase:', err);
    }
  },

  // ---- AUTH ----
  initAuth: async () => {
    if (!authListenerAttached) {
      authListenerAttached = true;
      supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') set({ currentUser: null, users: [], orders: [] });
      });
    }
    await get().syncFromSupabase();
    set({ authReady: true });
  },

  signUp: async (data) => {
    const { error, data: res } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          nombre: data.nombre,
          rol: data.rol,
          restaurant_name: data.business?.restaurantName,
          categoria: data.business?.categoria,
          descripcion: data.business?.descripcion,
          horario: data.business?.horario,
          direccion: data.business?.direccion,
        },
      },
    });
    if (error) throw new Error(authErrorMessage(error.message));
    if (!res.session) {
      throw new Error('Tu cuenta se creó, pero requiere confirmar el correo antes de entrar.');
    }
    await get().syncFromSupabase();
    const user = get().currentUser;
    if (!user) throw new Error('No se pudo cargar tu perfil. Intenta iniciar sesión.');
    return user;
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(authErrorMessage(error.message));
    await get().syncFromSupabase();
    const user = get().currentUser;
    if (!user) throw new Error('Tu cuenta no tiene un perfil asociado.');
    return user;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ currentUser: null, users: [], orders: [] });
  },

  updateUserProfile: (data) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const updated: User = { ...currentUser, nombre: data.nombre };
    set((s) => ({
      currentUser: updated,
      users: s.users.map((u) => (u.id === updated.id ? updated : u)),
    }));

    supabase
      .from('users')
      .update({ nombre: data.nombre })
      .eq('id', currentUser.id)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase updateUser error:', error);
          get().syncFromSupabase();
        }
      });
  },

  // ---- B2C ----
  toggleFavorite: (restaurantId) => {
    const { currentUser } = get();
    if (!currentUser) return;
    const isFav = currentUser.restaurantes_favoritos.includes(restaurantId);
    const nextFavs = isFav
      ? currentUser.restaurantes_favoritos.filter((id) => id !== restaurantId)
      : [...currentUser.restaurantes_favoritos, restaurantId];
    const updated: User = { ...currentUser, restaurantes_favoritos: nextFavs };
    set((s) => ({
      currentUser: updated,
      users: s.users.map((u) => (u.id === updated.id ? updated : u)),
    }));

    supabase
      .from('users')
      .update({ restaurantes_favoritos: nextFavs })
      .eq('id', currentUser.id)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase toggleFavorite error:', error);
          get().syncFromSupabase();
        }
      });
  },

  createOrder: async (packageId) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ packageId }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      await get().syncFromSupabase();
      throw new Error(json.user_message || json.message || 'No se pudo completar la reserva.');
    }
    const order = json.order as Order;
    set((s) => ({
      orders: [...s.orders, order],
      packages: s.packages.map((p) =>
        p.id === packageId
          ? { ...p, cantidad_disponible: json.remaining, disponible: json.remaining > 0 }
          : p
      ),
    }));
    return order;
  },

  // ---- B2B ----
  createPackage: (data) => {
    const newPkg: Package = {
      ...data,
      id: `pkg-${generateId()}`,
      cantidad_disponible: data.cantidad,
      disponible: true,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ packages: [...s.packages, newPkg] }));

    supabase
      .from('packages')
      .insert({
        id: newPkg.id,
        restaurant_id: newPkg.restaurant_id,
        titulo: newPkg.titulo,
        descripcion: newPkg.descripcion,
        cantidad: newPkg.cantidad,
        cantidad_disponible: newPkg.cantidad_disponible,
        precio_original: newPkg.precio_original,
        precio_remate: newPkg.precio_remate,
        hora_limite: newPkg.hora_limite,
        disponible: newPkg.disponible,
      })
      .then(({ error }) => {
        if (error) {
          console.error('Supabase createPackage error:', error);
          get().syncFromSupabase();
        }
      });

    return newPkg;
  },

  updateOrderStatus: (orderId, estado) => {
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? { ...o, estado } : o)),
    }));

    supabase
      .from('orders')
      .update({ estado })
      .eq('id', orderId)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase updateOrderStatus error:', error);
          get().syncFromSupabase();
        }
      });
  },

  deletePackage: (packageId) => {
    set((s) => ({ packages: s.packages.filter((p) => p.id !== packageId) }));

    supabase
      .from('packages')
      .delete()
      .eq('id', packageId)
      .then(({ error }) => {
        if (error) {
          console.error('Supabase deletePackage error:', error);
          get().syncFromSupabase();
        }
      });
  },

  // ---- SELECTORS ----
  getRestaurantPackages: (restaurantId) => get().packages.filter((p) => p.restaurant_id === restaurantId),

  getRestaurantOrders: (restaurantId) => get().orders.filter((o) => o.restaurant_id === restaurantId),

  getAvailablePackages: () => {
    const { packages, restaurants } = get();
    return packages
      .filter((p) => p.disponible && p.cantidad_disponible > 0)
      .map((p) => ({ ...p, restaurant: restaurants.find((r) => r.id === p.restaurant_id)! }))
      .filter((p) => p.restaurant);
  },

  getUserOrders: (userId) => {
    const { orders, packages, restaurants } = get();
    return orders
      .filter((o) => o.user_id === userId)
      .map((o) => ({
        ...o,
        package: packages.find((p) => p.id === o.package_id)!,
        restaurant: restaurants.find((r) => r.id === o.restaurant_id)!,
      }))
      .filter((o) => o.package && o.restaurant);
  },
}));
