import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

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

const SEED_USERS: User[] = [
  {
    id: 'user-b2b-1',
    nombre: 'Chef Marco',
    email: 'marco@trattoria.com',
    rol: 'b2b',
    restaurantes_favoritos: [],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-client',
    nombre: 'Sofía Martínez',
    email: 'sofia@demo.com',
    rol: 'b2c',
    restaurantes_favoritos: ['rest-1', 'rest-3'],
    createdAt: '2024-01-01T00:00:00Z',
  },
];

const SEED_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    nombre: 'La Trattoria Roma',
    categoria: 'Italiana',
    descripcion: 'Auténtica cocina italiana con los mejores ingredientes frescos.',
    logo: '🍕',
    horario: '12:00 - 23:00',
    direccion: 'Av. Insurgentes 234, CDMX',
    rating: 4.8,
    totalReviews: 312,
    ownerId: 'user-b2b-1',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'rest-2',
    nombre: 'Sushi Nakama',
    categoria: 'Japonesa',
    descripcion: 'El mejor sushi de la ciudad, fresco cada día.',
    logo: '🍱',
    horario: '13:00 - 22:00',
    direccion: 'Polanco, CDMX',
    rating: 4.9,
    totalReviews: 540,
    ownerId: 'user-b2b-2',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'rest-3',
    nombre: 'Taquería El Paisa',
    categoria: 'Mexicana',
    descripcion: 'Tacos al pastor y quesadillas de maíz artesanal.',
    logo: '🌮',
    horario: '08:00 - 20:00',
    direccion: 'Roma Norte, CDMX',
    rating: 4.7,
    totalReviews: 890,
    ownerId: 'user-b2b-3',
    createdAt: '2024-01-03T00:00:00Z',
  },
  {
    id: 'rest-4',
    nombre: 'BurgerCraft',
    categoria: 'Hamburguesas',
    descripcion: 'Hamburguesas artesanales con papas gourmet.',
    logo: '🍔',
    horario: '11:00 - 23:00',
    direccion: 'Condesa, CDMX',
    rating: 4.6,
    totalReviews: 245,
    ownerId: 'user-b2b-4',
    createdAt: '2024-01-04T00:00:00Z',
  },
  {
    id: 'rest-5',
    nombre: 'Café Dulce & Amargo',
    categoria: 'Café & Pastelería',
    descripcion: 'Café de especialidad y repostería artesanal.',
    logo: '☕',
    horario: '07:00 - 21:00',
    direccion: 'Napoles, CDMX',
    rating: 4.5,
    totalReviews: 178,
    ownerId: 'user-b2b-5',
    createdAt: '2024-01-05T00:00:00Z',
  },
  {
    id: 'rest-6',
    nombre: 'Thai Garden',
    categoria: 'Tailandesa',
    descripcion: 'Sabores auténticos de Tailandia en el corazón de la ciudad.',
    logo: '🍜',
    horario: '12:00 - 22:30',
    direccion: 'Del Valle, CDMX',
    rating: 4.7,
    totalReviews: 203,
    ownerId: 'user-b2b-6',
    createdAt: '2024-01-06T00:00:00Z',
  },
];

const SEED_PACKAGES: Package[] = [
  {
    id: 'pkg-1',
    restaurant_id: 'rest-1',
    titulo: 'Bolsa Italiana Mixta',
    descripcion: 'Pasta, pizza y antipastos del día. ¡Sorpresa garantizada!',
    cantidad: 5,
    cantidad_disponible: 3,
    precio_original: 320,
    precio_remate: 95,
    hora_limite: '21:30',
    disponible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pkg-2',
    restaurant_id: 'rest-2',
    titulo: 'Caja Sushi Surprise',
    descripcion: 'Rollos, nigiri y temaki seleccionados por el chef.',
    cantidad: 8,
    cantidad_disponible: 5,
    precio_original: 480,
    precio_remate: 149,
    hora_limite: '21:00',
    disponible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pkg-3',
    restaurant_id: 'rest-3',
    titulo: 'Pack Taquero Completo',
    descripcion: '12 tacos surtidos con salsas y bebida incluida.',
    cantidad: 10,
    cantidad_disponible: 7,
    precio_original: 180,
    precio_remate: 55,
    hora_limite: '19:30',
    disponible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pkg-4',
    restaurant_id: 'rest-4',
    titulo: 'Burger & Fries Combo',
    descripcion: '2 hamburguesas artesanales con papas y refresco.',
    cantidad: 4,
    cantidad_disponible: 2,
    precio_original: 290,
    precio_remate: 89,
    hora_limite: '22:00',
    disponible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pkg-5',
    restaurant_id: 'rest-5',
    titulo: 'Desayuno & Café Gourmet',
    descripcion: 'Croissants, pays, panqués y un café de especialidad.',
    cantidad: 6,
    cantidad_disponible: 4,
    precio_original: 220,
    precio_remate: 69,
    hora_limite: '20:00',
    disponible: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pkg-6',
    restaurant_id: 'rest-6',
    titulo: 'Thai Feast Box',
    descripcion: 'Pad Thai, curry verde y arroz frito tailandés.',
    cantidad: 5,
    cantidad_disponible: 3,
    precio_original: 360,
    precio_remate: 109,
    hora_limite: '21:30',
    disponible: true,
    createdAt: new Date().toISOString(),
  },
];

// ========================
// HELPERS
// ========================

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '#';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ========================
// STORE
// ========================

interface AppState {
  // Auth
  currentUser: User | null;

  // Data
  users: User[];
  restaurants: Restaurant[];
  packages: Package[];
  orders: Order[];

  // Actions - Auth
  login: (user: User) => void;
  logout: () => void;
  updateUserProfile: (data: { nombre: string; email: string }) => void;
  registerUser: (data: { nombre: string; email: string; rol: UserRole }) => User;
  registerRestaurant: (data: { nombre: string; email: string; restaurantName: string; categoria: string; descripcion: string; horario: string; direccion: string }) => { user: User; restaurant: Restaurant };

  // Actions - B2C
  toggleFavorite: (restaurantId: string) => void;
  createOrder: (packageId: string) => Order;

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
  logo: r.logo || '🍽️',
  horario: r.horario || '09:00 - 22:00',
  direccion: r.direccion,
  rating: parseFloat(r.rating) || 4.8,
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

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: SEED_USERS,
      restaurants: SEED_RESTAURANTS,
      packages: SEED_PACKAGES,
      orders: [],

      syncFromSupabase: async () => {
        try {
          const [uRes, rRes, pRes, oRes] = await Promise.all([
            supabase.from('users').select('*'),
            supabase.from('restaurants').select('*'),
            supabase.from('packages').select('*'),
            supabase.from('orders').select('*'),
          ]);

          const updates: Partial<AppState> = {};
          if (uRes.data && uRes.data.length > 0) {
            updates.users = uRes.data.map(mapUserFromDB);
            const curr = get().currentUser;
            if (curr) {
              const found = updates.users.find((u) => u.id === curr.id);
              if (found) updates.currentUser = found;
            }
          }
          if (rRes.data && rRes.data.length > 0) {
            updates.restaurants = rRes.data.map(mapRestaurantFromDB);
          }
          if (pRes.data && pRes.data.length > 0) {
            updates.packages = pRes.data.map(mapPackageFromDB);
          }
          if (oRes.data) {
            updates.orders = oRes.data.map(mapOrderFromDB);
          }
          set(updates);
        } catch (err) {
          console.error('Error syncing from Supabase:', err);
        }
      },

      // ---- AUTH ----
      login: (user) =>
        set((s) => ({
          currentUser: user,
          users: s.users.some((u) => u.id === user.id) ? s.users : [...s.users, user],
        })),
      logout: () => set({ currentUser: null }),
      updateUserProfile: (data) => {
        const { currentUser } = get();
        if (!currentUser) return;
        const updated: User = {
          ...currentUser,
          nombre: data.nombre,
          email: data.email,
        };
        set((s) => ({
          currentUser: updated,
          users: s.users.map((u) => (u.id === updated.id ? updated : u)),
        }));

        supabase
          .from('users')
          .update({ nombre: data.nombre, email: data.email })
          .eq('id', currentUser.id)
          .then(({ error }) => {
            if (error) console.error('Supabase updateUser error:', error);
          });
      },

      registerUser: (data) => {
        const newUser: User = {
          id: `user-${generateId()}`,
          nombre: data.nombre,
          email: data.email,
          rol: data.rol,
          restaurantes_favoritos: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ users: [...s.users, newUser], currentUser: newUser }));

        supabase
          .from('users')
          .insert({
            id: newUser.id,
            nombre: newUser.nombre,
            email: newUser.email,
            rol: newUser.rol,
            restaurantes_favoritos: [],
          })
          .then(({ error }) => {
            if (error) console.error('Supabase registerUser error:', error);
          });

        return newUser;
      },

      registerRestaurant: (data) => {
        const newUser: User = {
          id: `user-${generateId()}`,
          nombre: data.nombre,
          email: data.email,
          rol: 'b2b',
          restaurantes_favoritos: [],
          createdAt: new Date().toISOString(),
        };
        const newRestaurant: Restaurant = {
          id: `rest-${generateId()}`,
          nombre: data.restaurantName,
          categoria: data.categoria,
          descripcion: data.descripcion,
          logo: '🍽️',
          horario: data.horario,
          direccion: data.direccion,
          rating: 0,
          totalReviews: 0,
          ownerId: newUser.id,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          users: [...s.users, newUser],
          restaurants: [...s.restaurants, newRestaurant],
          currentUser: newUser,
        }));

        supabase
          .from('users')
          .insert({
            id: newUser.id,
            nombre: newUser.nombre,
            email: newUser.email,
            rol: 'b2b',
            restaurantes_favoritos: [],
          })
          .then(() => {
            supabase.from('restaurants').insert({
              id: newRestaurant.id,
              nombre: newRestaurant.nombre,
              categoria: newRestaurant.categoria,
              descripcion: newRestaurant.descripcion,
              logo: newRestaurant.logo,
              horario: newRestaurant.horario,
              direccion: newRestaurant.direccion,
              rating: newRestaurant.rating,
              total_reviews: newRestaurant.totalReviews,
              owner_id: newUser.id,
            }).then(({ error }) => {
              if (error) console.error('Supabase registerRestaurant error:', error);
            });
          });

        return { user: newUser, restaurant: newRestaurant };
      },

      // ---- B2C ----
      toggleFavorite: (restaurantId) => {
        const { currentUser } = get();
        if (!currentUser) return;
        const isFav = currentUser.restaurantes_favoritos.includes(restaurantId);
        const nextFavs = isFav
          ? currentUser.restaurantes_favoritos.filter((id) => id !== restaurantId)
          : [...currentUser.restaurantes_favoritos, restaurantId];
        const updated: User = {
          ...currentUser,
          restaurantes_favoritos: nextFavs,
        };
        set((s) => ({
          currentUser: updated,
          users: s.users.map((u) => (u.id === updated.id ? updated : u)),
        }));

        supabase
          .from('users')
          .update({ restaurantes_favoritos: nextFavs })
          .eq('id', currentUser.id)
          .then(({ error }) => {
            if (error) console.error('Supabase toggleFavorite error:', error);
          });
      },

      createOrder: (packageId) => {
        const { currentUser, packages } = get();
        if (!currentUser) throw new Error('No user logged in');
        const pkg = packages.find((p) => p.id === packageId);
        if (!pkg) throw new Error('Package not found');

        const newOrder: Order = {
          id: `order-${generateId()}`,
          package_id: packageId,
          user_id: currentUser.id,
          restaurant_id: pkg.restaurant_id,
          codigo_recoleccion: generateCode(),
          estado: 'pendiente',
          precio_pagado: pkg.precio_remate,
          createdAt: new Date().toISOString(),
        };

        const nextDisponibles = Math.max(0, pkg.cantidad_disponible - 1);
        const nextDisponible = nextDisponibles > 0;

        set((s) => ({
          orders: [...s.orders, newOrder],
          packages: s.packages.map((p) =>
            p.id === packageId
              ? { ...p, cantidad_disponible: nextDisponibles, disponible: nextDisponible }
              : p
          ),
        }));

        supabase.from('orders').insert({
          id: newOrder.id,
          package_id: newOrder.package_id,
          user_id: newOrder.user_id,
          restaurant_id: newOrder.restaurant_id,
          codigo_recoleccion: newOrder.codigo_recoleccion,
          estado: newOrder.estado,
          precio_pagado: newOrder.precio_pagado,
        }).then(({ error }) => {
          if (error) console.error('Supabase createOrder error:', error);
        });

        supabase.from('packages').update({
          cantidad_disponible: nextDisponibles,
          disponible: nextDisponible,
        }).eq('id', packageId).then(({ error }) => {
          if (error) console.error('Supabase update package quantity error:', error);
        });

        return newOrder;
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

        supabase.from('packages').insert({
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
        }).then(({ error }) => {
          if (error) console.error('Supabase createPackage error:', error);
        });

        return newPkg;
      },

      updateOrderStatus: (orderId, estado) => {
        set((s) => ({
          orders: s.orders.map((o) => (o.id === orderId ? { ...o, estado } : o)),
        }));

        supabase.from('orders').update({ estado }).eq('id', orderId).then(({ error }) => {
          if (error) console.error('Supabase updateOrderStatus error:', error);
        });
      },

      deletePackage: (packageId) => {
        set((s) => ({ packages: s.packages.filter((p) => p.id !== packageId) }));

        supabase.from('packages').delete().eq('id', packageId).then(({ error }) => {
          if (error) console.error('Supabase deletePackage error:', error);
        });
      },

      // ---- SELECTORS ----
      getRestaurantPackages: (restaurantId) => {
        return get().packages.filter((p) => p.restaurant_id === restaurantId);
      },

      getRestaurantOrders: (restaurantId) => {
        return get().orders.filter((o) => o.restaurant_id === restaurantId);
      },

      getAvailablePackages: () => {
        const { packages, restaurants } = get();
        return packages
          .filter((p) => p.disponible && p.cantidad_disponible > 0)
          .map((p) => ({
            ...p,
            restaurant: restaurants.find((r) => r.id === p.restaurant_id)!,
          }))
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
    }),
    {
      name: '2g2g-store',
      version: 1,
    }
  )
);
