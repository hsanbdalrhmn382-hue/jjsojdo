-- ============================================================================
-- TOP CODES | توب كود — Reset RLS Policies on public.coupons
-- يضمن هذا الملف:
-- 1. مسح جميع السياسات السابقة على جدول coupons مهما كان اسمها دون حذف أي بيانات.
-- 2. تفعيل Row Level Security (RLS) على جدول coupons.
-- 3. السماح للجميع (SELECT) بقراءة الكوبونات.
-- 4. حصر عمليات (INSERT, UPDATE, DELETE) على المستخدمين ذوي الدور 'admin' فقط في جدول profiles.
-- ============================================================================

-- التأكد من تفعيل RLS على جدول coupons
alter table public.coupons enable row level security;

-- إزالة جميع السياسات القديمة على جدول coupons لتجنب بقاء أي سياسة متساهلة
do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'coupons'
  loop
    execute format('drop policy if exists %I on public.coupons', pol.policyname);
  end loop;
end;
$$;

-- دالة مساعدة تتحقق من أن المستخدم الحالي دوره 'admin' في جدول profiles
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 1. السماح لجميع المستخدمين (الزوار والمسجلين) بعمليات SELECT
create policy "coupons_select_all"
  on public.coupons
  for select
  using (true);

-- 2. السماح بالإضافة (INSERT) للمدير 'admin' فقط
create policy "coupons_insert_admin_only"
  on public.coupons
  for insert
  to authenticated
  with check (public.is_admin());

-- 3. السماح بالتعديل (UPDATE) للمدير 'admin' فقط
create policy "coupons_update_admin_only"
  on public.coupons
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 4. السماح بالحذف (DELETE) للمدير 'admin' فقط
create policy "coupons_delete_admin_only"
  on public.coupons
  for delete
  to authenticated
  using (public.is_admin());
