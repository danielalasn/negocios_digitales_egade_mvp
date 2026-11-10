-- Buen Bocado: real authentication (Supabase Auth) + owner-based Row Level Security.
-- Scope: only Buen Bocado tables in schema "public". Existing demo rows are kept (read-only,
-- because their owner ids do not match any auth user).

-- 1) Drop the open "Allow public ..." policies.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('users', 'restaurants', 'packages', 'orders', 'products')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baskets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basket_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pilot_events     ENABLE ROW LEVEL SECURITY;

-- Server routes use the direct Postgres role (bypasses RLS) after verifying the user's JWT.
-- baskets, basket_items, analytics_events and pilot_events therefore have NO client policies.

-- 2) users: each person only sees and edits their own profile (created by trigger below).
CREATE POLICY users_select_own ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid()::text);
CREATE POLICY users_update_own ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid()::text) WITH CHECK (id = auth.uid()::text AND rol = (SELECT rol FROM public.users WHERE id = auth.uid()::text));

-- 3) restaurants: public catalog of businesses, editable only by the owner.
CREATE POLICY restaurants_select_all ON public.restaurants FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY restaurants_update_owner ON public.restaurants FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()::text) WITH CHECK (owner_id = auth.uid()::text);

-- 4) packages: public listing, managed only by the owning business.
CREATE POLICY packages_select_all ON public.packages FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY packages_write_owner ON public.packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()::text));

-- 5) orders: buyer and the business can read; only the business can change state (redeem).
--    Creation goes through POST /api/orders (atomic stock decrement), not from the client.
CREATE POLICY orders_select_parties ON public.orders FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()::text)
  );
CREATE POLICY orders_update_merchant ON public.orders FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_id = auth.uid()::text));

-- 6) products (catalog): each business manages its own.
ALTER TABLE public.products ALTER COLUMN updated_at SET DEFAULT now();
CREATE POLICY products_owner_all ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = merchant_id AND r.owner_id = auth.uid()::text))
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = merchant_id AND r.owner_id = auth.uid()::text));

-- 7) Profile creation on sign-up. Role and business data come from the sign-up metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta     jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_rol    text  := CASE WHEN meta->>'rol' = 'b2b' THEN 'b2b' ELSE 'b2c' END;
  v_nombre text  := COALESCE(NULLIF(meta->>'nombre', ''), split_part(NEW.email, '@', 1));
BEGIN
  INSERT INTO public.users (id, nombre, email, rol)
  VALUES (NEW.id::text, v_nombre, NEW.email, v_rol)
  ON CONFLICT (id) DO NOTHING;

  IF v_rol = 'b2b' THEN
    INSERT INTO public.restaurants (id, nombre, categoria, descripcion, horario, direccion, rating, total_reviews, owner_id)
    VALUES (
      'rest-' || substr(NEW.id::text, 1, 8),
      COALESCE(NULLIF(meta->>'restaurant_name', ''), v_nombre),
      COALESCE(NULLIF(meta->>'categoria', ''), 'Otro'),
      meta->>'descripcion',
      meta->>'horario',
      meta->>'direccion',
      0, 0,
      NEW.id::text
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) A business can read the profile (name) of buyers who ordered from it.
CREATE POLICY users_select_merchant_buyers ON public.users FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
      JOIN public.restaurants r ON r.id = o.restaurant_id
     WHERE o.user_id = users.id AND r.owner_id = auth.uid()::text
  ));
