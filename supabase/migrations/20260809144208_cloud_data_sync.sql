-- Migration: Cloud data sync for Bhand News Agency
-- Tables: hawkers, billing_records, daily_rates, newspaper_groups, hawker_free_qty, copies_records, newspapers_list

-- ─── HAWKERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hawkers (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  area TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'Cash',
  status TEXT NOT NULL DEFAULT 'Active',
  join_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── BILLING RECORDS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_records (
  id TEXT PRIMARY KEY,
  hawker_id BIGINT NOT NULL,
  hawker_name TEXT NOT NULL,
  date TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  total_bill NUMERIC(12,2) NOT NULL DEFAULT 0,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  payment_type TEXT NOT NULL DEFAULT 'Cash',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_hawker_date ON public.billing_records (hawker_id, date);

-- ─── DAILY RATES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL UNIQUE,
  rates JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── NEWSPAPER GROUPS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newspaper_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  newspapers JSONB NOT NULL DEFAULT '[]',
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── HAWKER FREE QTY SETTINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hawker_free_qty (
  hawker_id BIGINT PRIMARY KEY,
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── COPIES RECORDS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.copies_records (
  id TEXT PRIMARY KEY,
  hawker_id BIGINT NOT NULL,
  hawker_name TEXT NOT NULL,
  date TEXT NOT NULL,
  entries JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── NEWSPAPERS LIST ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newspapers_list (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_billing_records_date ON public.billing_records (date);
CREATE INDEX IF NOT EXISTS idx_billing_records_hawker_id ON public.billing_records (hawker_id);
CREATE INDEX IF NOT EXISTS idx_copies_records_hawker_id ON public.copies_records (hawker_id);
CREATE INDEX IF NOT EXISTS idx_copies_records_date ON public.copies_records (date);

-- ─── ENABLE RLS ───────────────────────────────────────────────────────────────
ALTER TABLE public.hawkers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newspaper_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hawker_free_qty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copies_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newspapers_list ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES (open access — app uses PIN-based auth, not Supabase auth) ──
DROP POLICY IF EXISTS "open_access_hawkers" ON public.hawkers;
CREATE POLICY "open_access_hawkers" ON public.hawkers FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_billing_records" ON public.billing_records;
CREATE POLICY "open_access_billing_records" ON public.billing_records FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_daily_rates" ON public.daily_rates;
CREATE POLICY "open_access_daily_rates" ON public.daily_rates FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_newspaper_groups" ON public.newspaper_groups;
CREATE POLICY "open_access_newspaper_groups" ON public.newspaper_groups FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_hawker_free_qty" ON public.hawker_free_qty;
CREATE POLICY "open_access_hawker_free_qty" ON public.hawker_free_qty FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_copies_records" ON public.copies_records;
CREATE POLICY "open_access_copies_records" ON public.copies_records FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_access_newspapers_list" ON public.newspapers_list;
CREATE POLICY "open_access_newspapers_list" ON public.newspapers_list FOR ALL TO public USING (true) WITH CHECK (true);
