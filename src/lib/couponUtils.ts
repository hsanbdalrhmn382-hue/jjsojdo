import type { Coupon, CouponWithRelations, Store } from '../types/database';

export function isSheinStore(store?: Pick<Store, 'id' | 'name' | 'slug'> | null): boolean {
  if (!store) return true;
  const text = `${store.id} ${store.name} ${store.slug}`.toLowerCase();
  return text.includes('shein') || text.includes('شي إن') || text.includes('شي ان');
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function isCouponExpired(coupon: Pick<Coupon, 'expires_at' | 'status'>): boolean {
  if (coupon.status === 'expired') return true;
  if (!coupon.expires_at) return false;
  return new Date(coupon.expires_at).getTime() <= Date.now();
}

export function isCouponUpcoming(coupon: Pick<Coupon, 'starts_at'>): boolean {
  if (!coupon.starts_at) return false;
  return new Date(coupon.starts_at).getTime() > Date.now();
}

export function isCouponValidNow(coupon: Pick<Coupon, 'starts_at' | 'expires_at' | 'status'>): boolean {
  return coupon.status === 'active' && !isCouponExpired(coupon) && !isCouponUpcoming(coupon);
}

export function getCouponValidityLabel(coupon: Pick<Coupon, 'starts_at' | 'expires_at' | 'status'>): {
  label: string;
  tone: 'active' | 'expired' | 'paused' | 'upcoming';
} {
  if (coupon.status === 'paused') {
    return { label: 'متوقف مؤقتًا', tone: 'paused' };
  }
  if (isCouponExpired(coupon)) {
    return { label: 'منتهي الصلاحية', tone: 'expired' };
  }
  if (isCouponUpcoming(coupon)) {
    return { label: 'يبدأ قريبًا', tone: 'upcoming' };
  }
  return { label: 'فعال ومُتحقق', tone: 'active' };
}

export function formatArabicDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'مفتوح الصلاحية';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'تاريخ غير محدد';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNumberAr(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function slugify(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || `item-${Date.now()}`;
}

export function getApprovalRate(coupon: Pick<CouponWithRelations, 'works_count' | 'not_works_count'>): number | null {
  const total = coupon.works_count + coupon.not_works_count;
  if (total === 0) return null;
  return Math.round((coupon.works_count / total) * 100);
}
