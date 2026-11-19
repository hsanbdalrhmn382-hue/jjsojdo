-- ============================================================================
-- TOP CODES | توب كود — Row Level Security (RLS) Policies (Admin-Only Coupons)
-- ============================================================================

-- Helper Role Checks
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(), '') = 'admin';
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role(), '') in ('admin', 'moderator');
$$;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.coupons enable row level security;
alter table public.favorites enable row level security;
alter table public.coupon_votes enable row level security;
alter table public.coupon_submissions enable row level security;
alter table public.reports enable row level security;

-- ----------------------------------------------------------------------------
-- 1. profiles
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff"
  on public.profiles for select
  using (auth.uid() = id or public.is_moderator_or_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. stores (Public read, Admin-only write)
-- ----------------------------------------------------------------------------
drop policy if exists "stores_public_read" on public.stores;
create policy "stores_public_read"
  on public.stores for select
  using (true);

drop policy if exists "stores_admin_insert" on public.stores;
create policy "stores_admin_insert"
  on public.stores for insert
  with check (public.is_admin());

drop policy if exists "stores_admin_update" on public.stores;
create policy "stores_admin_update"
  on public.stores for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "stores_admin_delete" on public.stores;
create policy "stores_admin_delete"
  on public.stores for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. categories (Public read, Admin-only write)
-- ----------------------------------------------------------------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read"
  on public.categories for select
  using (true);

drop policy if exists "categories_admin_insert" on public.categories;
create policy "categories_admin_insert"
  on public.categories for insert
  with check (public.is_admin());

drop policy if exists "categories_admin_update" on public.categories;
create policy "categories_admin_update"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "categories_admin_delete" on public.categories;
create policy "categories_admin_delete"
  on public.categories for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. coupons (Public read, STRICTLY Admin-only insert/update/delete)
-- ----------------------------------------------------------------------------
drop policy if exists "coupons_public_read" on public.coupons;
create policy "coupons_public_read"
  on public.coupons for select
  using (true);

drop policy if exists "coupons_admin_insert" on public.coupons;
create policy "coupons_admin_insert"
  on public.coupons for insert
  with check (public.is_admin());

drop policy if exists "coupons_staff_update" on public.coupons;
drop policy if exists "coupons_admin_update" on public.coupons;
create policy "coupons_admin_update"
  on public.coupons for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coupons_admin_delete" on public.coupons;
create policy "coupons_admin_delete"
  on public.coupons for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. favorites
-- ----------------------------------------------------------------------------
drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. coupon_votes
-- ----------------------------------------------------------------------------
drop policy if exists "coupon_votes_public_read" on public.coupon_votes;
create policy "coupon_votes_public_read"
  on public.coupon_votes for select
  using (true);

drop policy if exists "coupon_votes_insert_own" on public.coupon_votes;
create policy "coupon_votes_insert_own"
  on public.coupon_votes for insert
  with check (auth.uid() = user_id);

drop policy if exists "coupon_votes_update_own" on public.coupon_votes;
create policy "coupon_votes_update_own"
  on public.coupon_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "coupon_votes_delete_own" on public.coupon_votes;
create policy "coupon_votes_delete_own"
  on public.coupon_votes for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. coupon_submissions (Locked down: regular users CANNOT submit coupons)
-- Existing rows are preserved without deletion.
-- ----------------------------------------------------------------------------
drop policy if exists "submissions_select_own_or_staff" on public.coupon_submissions;
drop policy if exists "submissions_insert_own" on public.coupon_submissions;
drop policy if exists "submissions_staff_update" on public.coupon_submissions;
drop policy if exists "submissions_admin_delete" on public.coupon_submissions;

drop policy if exists "submissions_admin_only_read" on public.coupon_submissions;
create policy "submissions_admin_only_read"
  on public.coupon_submissions for select
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. reports (Authenticated users can report invalid codes; Staff reviews them)
-- ----------------------------------------------------------------------------
drop policy if exists "reports_select_own_or_staff" on public.reports;
create policy "reports_select_own_or_staff"
  on public.reports for select
  using (auth.uid() = user_id or public.is_moderator_or_admin());

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and reviewed_by is null
  );

drop policy if exists "reports_staff_update" on public.reports;
create policy "reports_staff_update"
  on public.reports for update
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

drop policy if exists "reports_admin_delete" on public.reports;
create policy "reports_admin_delete"
  on public.reports for delete
  using (public.is_admin());
