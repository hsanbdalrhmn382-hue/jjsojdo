-- ============================================================================
-- TOP CODES | توب كود — Schema Migration (PostgreSQL / Supabase)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles (Users & Roles)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('admin', 'moderator', 'user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- ----------------------------------------------------------------------------
-- 2. Stores
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  logo_url text,
  website_url text,
  description text,
  is_popular boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stores_popular on public.stores(is_popular) where is_popular = true;
create index if not exists idx_stores_slug on public.stores(slug);

-- ----------------------------------------------------------------------------
-- 3. Categories
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_categories_sort on public.categories(sort_order, name);

-- ----------------------------------------------------------------------------
-- 4. Coupons
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  code text not null,
  title text not null,
  description text,
  discount_percent integer not null check (discount_percent >= 1 and discount_percent <= 100),
  discount_label text,
  terms text,
  offer_url text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  is_featured boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'expired')),
  usage_count integer not null default 0 check (usage_count >= 0),
  works_count integer not null default 0 check (works_count >= 0),
  not_works_count integer not null default 0 check (not_works_count >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prevent duplicate coupon codes per store (case-insensitive & trimmed)
create unique index if not exists uq_coupons_store_code_norm
  on public.coupons (store_id, upper(trim(code)));

create index if not exists idx_coupons_store on public.coupons(store_id);
create index if not exists idx_coupons_category on public.coupons(category_id);
create index if not exists idx_coupons_status on public.coupons(status);
create index if not exists idx_coupons_featured on public.coupons(is_featured) where is_featured = true;
create index if not exists idx_coupons_usage on public.coupons(usage_count desc);
create index if not exists idx_coupons_created on public.coupons(created_at desc);
create index if not exists idx_coupons_expires on public.coupons(expires_at);

-- ----------------------------------------------------------------------------
-- 5. Favorites
-- ----------------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, coupon_id)
);

create index if not exists idx_favorites_user on public.favorites(user_id);
create index if not exists idx_favorites_coupon on public.favorites(coupon_id);

-- ----------------------------------------------------------------------------
-- 6. Coupon Votes (Works / Does Not Work)
-- ----------------------------------------------------------------------------
create table if not exists public.coupon_votes (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_working boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

create index if not exists idx_coupon_votes_coupon on public.coupon_votes(coupon_id);
create index if not exists idx_coupon_votes_user on public.coupon_votes(user_id);

-- ----------------------------------------------------------------------------
-- 7. Coupon Submissions (User Contributed Codes awaiting Moderation)
-- ----------------------------------------------------------------------------
create table if not exists public.coupon_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  store_name text not null,
  category_id uuid references public.categories(id) on delete set null,
  code text not null,
  discount_percent integer not null check (discount_percent >= 1 and discount_percent <= 100),
  description text not null,
  terms text,
  offer_url text,
  expires_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  approved_coupon_id uuid references public.coupons(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_user on public.coupon_submissions(user_id, created_at desc);
create index if not exists idx_submissions_status on public.coupon_submissions(status, created_at desc);

-- ----------------------------------------------------------------------------
-- 8. Reports (Invalid / Expired Coupon Reports)
-- ----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_status on public.reports(status, created_at desc);
create index if not exists idx_reports_coupon on public.reports(coupon_id);

-- ============================================================================
-- Triggers & Server-Side Integrity Functions
-- ============================================================================

-- Touch updated_at timestamp automatically
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at
  before update on public.stores
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at
  before update on public.coupons
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_coupon_votes_updated_at on public.coupon_votes;
create trigger trg_coupon_votes_updated_at
  before update on public.coupon_votes
  for each row execute function public.touch_updated_at();

-- Normalize coupon code on insert/update
create or replace function public.normalize_coupon_code()
returns trigger
language plpgsql
as $$
begin
  new.code = upper(trim(new.code));
  return new;
end;
$$;

drop trigger if exists trg_coupons_normalize_code on public.coupons;
create trigger trg_coupons_normalize_code
  before insert or update of code on public.coupons
  for each row execute function public.normalize_coupon_code();

-- Auto-create profile when a new Supabase Auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent privilege escalation: only admins can modify profiles.role
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if new.role is distinct from old.role then
    select role into caller_role from public.profiles where id = auth.uid();
    if coalesce(caller_role, '') <> 'admin' then
      raise exception 'غير مصرح لك بتعديل صلاحيات المستخدمين';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Keep works_count & not_works_count synced from coupon_votes
create or replace function public.sync_coupon_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_coupon_id uuid;
begin
  target_coupon_id := coalesce(new.coupon_id, old.coupon_id);
  update public.coupons
  set
    works_count = (
      select count(*) from public.coupon_votes
      where coupon_id = target_coupon_id and is_working = true
    ),
    not_works_count = (
      select count(*) from public.coupon_votes
      where coupon_id = target_coupon_id and is_working = false
    )
  where id = target_coupon_id;
  return null;
end;
$$;

drop trigger if exists trg_sync_coupon_votes on public.coupon_votes;
create trigger trg_sync_coupon_votes
  after insert or update or delete on public.coupon_votes
  for each row execute function public.sync_coupon_vote_counts();

-- Atomic coupon usage increment RPC (safe for shoppers copying codes)
create or replace function public.increment_coupon_usage(p_coupon_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_usage integer;
begin
  update public.coupons
  set usage_count = usage_count + 1
  where id = p_coupon_id
    and status = 'active'
    and starts_at <= now()
    and (expires_at is null or expires_at > now())
  returning usage_count into updated_usage;

  if updated_usage is null then
    raise exception 'الكوبون غير نشط أو منتهي الصلاحية';
  end if;

  return updated_usage;
end;
$$;

-- Grant execute permissions on public RPCs
grant execute on function public.increment_coupon_usage(uuid) to anon, authenticated;

-- ============================================================================
-- Enable Supabase Realtime on Core Tables
-- ============================================================================
do $$
declare
  tbl text;
  tables text[] := array[
    'profiles',
    'stores',
    'categories',
    'coupons',
    'favorites',
    'coupon_votes',
    'reports'
  ];
begin
  foreach tbl in array tables loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end;
$$;
