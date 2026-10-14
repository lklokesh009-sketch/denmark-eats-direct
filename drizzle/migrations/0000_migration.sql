CREATE TABLE public.branches (
  id int PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  owner_id uuid UNIQUE
);
GRANT SELECT ON public.branches TO anon, authenticated;
GRANT UPDATE (name, address, phone) ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Owner updates own branch" ON public.branches FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

INSERT INTO public.branches (id, name, address) VALUES
 (1, 'Denmark Restaurant – VOC Park', 'VOC Park, Coimbatore'),
 (2, 'Denmark Restaurant – RS Puram', 'RS Puram, Coimbatore'),
 (3, 'Denmark Restaurant – Ganapathy', 'Ganapathy, Coimbatore');

CREATE OR REPLACE FUNCTION public.is_branch_owner(_branch int)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.branches WHERE id = _branch AND owner_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.claim_branch(_branch int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  UPDATE public.branches SET owner_id = auth.uid() WHERE id = _branch AND owner_id IS NULL;
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_branch(int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_branch(int) TO authenticated;

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id int NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Chinese',
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  description text NOT NULL DEFAULT '',
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view menu" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Owner inserts menu" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (public.is_branch_owner(branch_id));
CREATE POLICY "Owner updates menu" ON public.menu_items FOR UPDATE TO authenticated USING (public.is_branch_owner(branch_id)) WITH CHECK (public.is_branch_owner(branch_id));
CREATE POLICY "Owner deletes menu" ON public.menu_items FOR DELETE TO authenticated USING (public.is_branch_owner(branch_id));

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no serial,
  branch_id int NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  address text NOT NULL DEFAULT '',
  service_type text NOT NULL CHECK (service_type IN ('dine_in','delivery')),
  items jsonb NOT NULL,
  total numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','preparing','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.orders_order_no_seq TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views orders" ON public.orders FOR SELECT TO authenticated USING (public.is_branch_owner(branch_id));
CREATE POLICY "Owner updates orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_branch_owner(branch_id)) WITH CHECK (public.is_branch_owner(branch_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;