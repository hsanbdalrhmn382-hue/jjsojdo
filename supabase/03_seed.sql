-- ============================================================================
-- TOP CODES | توب كود — Optional Starter Catalog Seed
-- Run after 01_schema.sql and 02_rls.sql in Supabase SQL Editor.
-- To promote your account to Admin, run:
--   update public.profiles set role = 'admin' where email = 'your-email@example.com';
-- ============================================================================

insert into public.categories (name, slug, description, sort_order)
values
  ('الأزياء والموضة', 'fashion', 'أكواد خصم الملابس والإكسسوارات والأحذية من المتاجر العالمية', 1),
  ('التسوق الشامل', 'marketplace', 'كوبونات المتاجر الكبرى والمنصات متعددة الأقسام', 2),
  ('الإلكترونيات والتقنية', 'electronics', 'عروض الهواتف الذكية والأجهزة والملحقات التقنية', 3),
  ('الجمال والعناية', 'beauty', 'أكواد خصم العطور ومستحضرات التجميل والعناية بالبشرة', 4),
  ('المنزل والديكور', 'home', 'خصومات الأثاث والمستلزمات المنزلية والأجهزة الحديثة', 5),
  ('الصحة والعافية', 'wellness', 'كوبونات المكملات الغذائية والمنتجات العضوية والصحية', 6)
on conflict (slug) do nothing;

insert into public.stores (name, slug, website_url, description, is_popular)
values
  ('SHEIN', 'shein', 'https://www.shein.com', 'منصة الأزياء العالمية الرائدة لأحدث الصيحات والملابس والإكسسوارات', true),
  ('AliExpress', 'aliexpress', 'https://www.aliexpress.com', 'السوق العالمي للتسوق المباشر في الإلكترونيات والأزياء ومستلزمات المنزل', true),
  ('Amazon', 'amazon', 'https://www.amazon.sa', 'متجر التسوق الشامل للإلكترونيات والمنتجات اليومية والشحن السريع', true),
  ('Noon', 'noon', 'https://www.noon.com', 'منصة التجارة الإلكترونية الرائدة في الشرق الأوسط', true),
  ('Namshi', 'namshi', 'https://www.namshi.com', 'وجهة الأزياء والأحذية والعطور من أشهر الماركات العالمية', true),
  ('iHerb', 'iherb', 'https://www.iherb.com', 'متجر المنتجات الطبيعية والمكملات الغذائية والعناية العضوية', true),
  ('Farfetch', 'farfetch', 'https://www.farfetch.com', 'منصة الأزياء الفاخرة ودور التصميم العالمية', false),
  ('Temu', 'temu', 'https://www.temu.com', 'منصة العروض الاقتصادية المتنوعة والشحن المباشر', false)
on conflict (slug) do nothing;

-- Starter Verified Coupons
insert into public.coupons (
  store_id,
  category_id,
  code,
  title,
  description,
  discount_percent,
  discount_label,
  terms,
  offer_url,
  expires_at,
  is_featured,
  status
)
select
  s.id,
  c.id,
  'TOPSHEIN20',
  'خصم إضافي 20% على جميع طلبات الأزياء في شي إن',
  'كود خصم حصري من TOP STORE يمنحك خصمًا فوريًا بنسبة 20% على تشكيلة الموسم الجديد والفساتين والإكسسوارات.',
  20,
  '20% خصم',
  'يسري على جميع الطلبات بحد أدنى 200 ريال. لا يشمل المنتجات المخفضة مسبقًا بنسبة تتجاوز 70%.',
  'https://www.shein.com',
  now() + interval '60 days',
  true,
  'active'
from public.stores s
join public.categories c on c.slug = 'fashion'
where s.slug = 'shein'
on conflict do nothing;

insert into public.coupons (
  store_id,
  category_id,
  code,
  title,
  description,
  discount_percent,
  discount_label,
  terms,
  offer_url,
  expires_at,
  is_featured,
  status
)
select
  s.id,
  c.id,
  'TOPALI15',
  'خصم 15% على الإلكترونيات ومستلزمات المنزل في علي إكسبريس',
  'كوبون فعال لجميع العملاء الجدد والحاليين على مختارات Choice والشحن السريع.',
  15,
  '15% خصم',
  'صالح على سلة المشتريات بقيمة 50 دولار أو أكثر. يسري على منتجات الشحن الدولي.',
  'https://www.aliexpress.com',
  now() + interval '45 days',
  false,
  'active'
from public.stores s
join public.categories c on c.slug = 'electronics'
where s.slug = 'aliexpress'
on conflict do nothing;

insert into public.coupons (
  store_id,
  category_id,
  code,
  title,
  description,
  discount_percent,
  discount_label,
  terms,
  offer_url,
  expires_at,
  is_featured,
  status
)
select
  s.id,
  c.id,
  'TOPNOON10',
  'خصم 10% على جميع أقسام متجر نون',
  'وفر على الإلكترونيات والعطور والمنتجات اليومية باستخدام كود TOP STORE المعتمد.',
  10,
  '10% خصم',
  'حد أقصى للخصم 50 ريال لكل طلب. متاح للاستخدام حتى 3 مرات شهريًا.',
  'https://www.noon.com',
  now() + interval '30 days',
  false,
  'active'
from public.stores s
join public.categories c on c.slug = 'marketplace'
where s.slug = 'noon'
on conflict do nothing;

insert into public.coupons (
  store_id,
  category_id,
  code,
  title,
  description,
  discount_percent,
  discount_label,
  terms,
  offer_url,
  expires_at,
  is_featured,
  status
)
select
  s.id,
  c.id,
  'TOPIHERB18',
  'خصم 18% على المكملات ومنتجات العناية في آي هيرب',
  'كود خصم مميز للمنتجات العضوية والفيتامينات ومستحضرات العناية الطبيعية.',
  18,
  '18% خصم',
  'سارٍ على الطلبات التي تتجاوز 220 ريال. قد تُستثنى بعض العلامات التجارية المحددة.',
  'https://www.iherb.com',
  now() + interval '40 days',
  false,
  'active'
from public.stores s
join public.categories c on c.slug = 'wellness'
where s.slug = 'iherb'
on conflict do nothing;
