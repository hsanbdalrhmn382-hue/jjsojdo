-- ============================================================================
-- TOP CODES | توب كود — Migration: Enforce Admin-Only Coupon Management
-- Safe to run on an existing database: preserves all coupons, profiles,
-- favorites, votes, and reports without deleting any data.
-- ============================================================================

-- 1. Remove the old user-submission approval RPC so it cannot be invoked directly
drop function if exists public.approve_coupon_submission(uuid, uuid, uuid, text);

-- 2. Enforce strictly Admin-only INSERT / UPDATE / DELETE on coupons
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

-- 3. Lock down coupon_submissions so regular users cannot insert/update/delete
-- even via direct API calls, while preserving historical rows.
drop policy if exists "submissions_select_own_or_staff" on public.coupon_submissions;
drop policy if exists "submissions_insert_own" on public.coupon_submissions;
drop policy if exists "submissions_staff_update" on public.coupon_submissions;
drop policy if exists "submissions_admin_delete" on public.coupon_submissions;

drop policy if exists "submissions_admin_only_read" on public.coupon_submissions;
create policy "submissions_admin_only_read"
  on public.coupon_submissions for select
  using (public.is_admin());

-- 4. Revoke direct write grants from anon/authenticated on coupon_submissions
revoke insert, update, delete on public.coupon_submissions from anon, authenticated;
