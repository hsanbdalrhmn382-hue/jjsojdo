export type UserRole = 'admin' | 'moderator' | 'user';
export type CouponStatus = 'active' | 'paused' | 'expired';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  is_popular: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Coupon {
  id: string;
  store_id: string;
  category_id: string | null;
  code: string;
  title: string;
  description: string | null;
  discount_percent: number;
  discount_label: string | null;
  terms: string | null;
  offer_url: string | null;
  image_url: string | null;
  starts_at: string;
  expires_at: string | null;
  is_featured: boolean;
  status: CouponStatus;
  usage_count: number;
  works_count: number;
  not_works_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponWithRelations extends Coupon {
  store?: Store | null;
  category?: Category | null;
}

export interface Favorite {
  id: string;
  user_id: string;
  coupon_id: string;
  created_at: string;
}

export interface CouponVote {
  id: string;
  coupon_id: string;
  user_id: string;
  is_working: boolean;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  coupon_id: string;
  user_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface BannerSlide {
  id: string;
  title: string;
  badge_text: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  cta_label: string | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
