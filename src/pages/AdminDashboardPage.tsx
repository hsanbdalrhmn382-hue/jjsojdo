import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Edit3,
  ExternalLink,
  Flag,
  FolderKanban,
  Images,
  Lock,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  Ticket,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  formatArabicDate,
  formatNumberAr,
  isCouponExpired,
  normalizeCouponCode,
  safeExternalUrl,
  slugify,
} from '../lib/couponUtils';
import type {
  BannerSlide,
  Category,
  CouponStatus,
  CouponWithRelations,
  Profile,
  Report,
  Store,
  UserRole,
} from '../types/database';

type AdminTab =
  | 'overview'
  | 'coupons'
  | 'banners'
  | 'reports'
  | 'categories'
  | 'stores'
  | 'users';

const BOOTSTRAP_ADMIN_EMAIL = 'hsanbdalrhmn382@gmail.com';

function toIso(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function AdminDashboardPage() {
  const {
    user,
    profile,
    isAdmin,
    initializing,
    stores,
    categories,
    coupons,
    banners,
    signInWithGoogle,
    signInWithEmail,
    resendVerificationEmail,
    refreshAuthStatus,
    signOut,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loadingAdminData, setLoadingAdminData] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);

  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // Coupon create/edit state
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponWithRelations | null>(null);
  const [cStoreLogoUrl, setCStoreLogoUrl] = useState('');
  const [cImageUrl, setCImageUrl] = useState('');
  const [cCategoryId, setCCategoryId] = useState('');
  const [cCode, setCCode] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cDiscount, setCDiscount] = useState('20');
  const [cTerms, setCTerms] = useState('');
  const [cOfferUrl, setCOfferUrl] = useState('');
  const [cStartsAt, setCStartsAt] = useState('');
  const [cExpiresAt, setCExpiresAt] = useState('');
  const [cStatus, setCStatus] = useState<CouponStatus>('active');
  const [cFeatured, setCFeatured] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);

  // Store form state
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [sName, setSName] = useState('');
  const [sLogoUrl, setSLogoUrl] = useState('');
  const [sWebsite, setSWebsite] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sPopular, setSPopular] = useState(true);
  const [savingStore, setSavingStore] = useState(false);

  // Category form state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catOrder, setCatOrder] = useState('0');
  const [savingCategory, setSavingCategory] = useState(false);

  // Banner slide form state
  const [editingBanner, setEditingBanner] = useState<BannerSlide | null>(null);
  const [bTitle, setBTitle] = useState('');
  const [bBadgeText, setBBadgeText] = useState('');
  const [bSubtitle, setBSubtitle] = useState('');
  const [bImageUrl, setBImageUrl] = useState('');
  const [bLinkUrl, setBLinkUrl] = useState('');
  const [bCtaLabel, setBCtaLabel] = useState('');
  const [bSortOrder, setBSortOrder] = useState('0');
  const [bIsActive, setBIsActive] = useState(true);
  const [savingBanner, setSavingBanner] = useState(false);

  // Delete confirmation modal state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: async () => {},
  });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isBootstrappedAdmin =
    user?.email === BOOTSTRAP_ADMIN_EMAIL && Boolean(user?.emailVerified);

  // Real-time listeners for reports and users (Admin only)
  useEffect(() => {
    if (!user || !isAdmin) {
      setLoadingAdminData(false);
      return;
    }

    setLoadingAdminData(true);

    const reportsRef = isBootstrappedAdmin
      ? collection(db, 'reports')
      : query(collection(db, 'reports'), where('userId', '==', user.uid));

    const unsubReports = onSnapshot(
      reportsRef,
      (snap) => {
        const list: Report[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              coupon_id: String(data.couponId || ''),
              user_id: String(data.userId || ''),
              reason: String(data.reason || ''),
              details: (data.details as string) || null,
              status: (data.status as Report['status']) || 'pending',
              reviewed_by: (data.reviewedBy as string) || null,
              reviewed_at: data.reviewedAt ? toIso(data.reviewedAt) : null,
              created_at: toIso(data.createdAt),
            };
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setReports(list);
        setLoadingAdminData(false);
      },
      (error) => {
        setLoadingAdminData(false);
        handleFirestoreError(error, OperationType.LIST, 'reports');
      }
    );

    const usersRef = isBootstrappedAdmin
      ? collection(db, 'users')
      : query(collection(db, 'users'), where('uid', '==', user.uid));

    const unsubUsers = onSnapshot(
      usersRef,
      (snap) => {
        const list: Profile[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              email: String(data.email || ''),
              full_name: (data.fullName as string) || null,
              avatar_url: (data.avatarUrl as string) || null,
              role: (data.role as UserRole) || 'user',
              created_at: toIso(data.createdAt),
              updated_at: toIso(data.updatedAt),
            };
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setAllProfiles(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => {
      unsubReports();
      unsubUsers();
    };
  }, [user, isAdmin, isBootstrappedAdmin]);

  const sheinStore = useMemo(
    () =>
      stores.find(
        (s) =>
          s.id === 'store-shein' ||
          s.name.trim().toLowerCase() === 'shein' ||
          s.slug.toLowerCase() === 'shein'
      ) || null,
    [stores]
  );

  const stats = useMemo(() => {
    const publishedCount = coupons.filter(
      (c) => c.status === 'active' && !isCouponExpired(c)
    ).length;
    const expiredCount = coupons.filter(
      (c) => c.status === 'expired' || isCouponExpired(c)
    ).length;
    const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;
    const totalUsageCount = coupons.reduce((sum, c) => sum + (c.usage_count || 0), 0);
    const totalVotesCount = coupons.reduce(
      (sum, c) => sum + (c.works_count || 0) + (c.not_works_count || 0),
      0
    );
    const topUsedCoupons = [...coupons]
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 5);

    return {
      usersCount: allProfiles.length,
      publishedCount,
      expiredCount,
      pendingReportsCount,
      totalUsageCount,
      totalVotesCount,
      topUsedCoupons,
    };
  }, [coupons, reports, allProfiles]);

  const handleAdminGoogleSignIn = async () => {
    setSigningIn(true);
    setAdminAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAdminAuthError(error);
    }
    setSigningIn(false);
  };

  const handleAdminEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setAdminAuthError(null);
    const { error } = await signInWithEmail(adminEmailInput, adminPasswordInput);
    if (error) {
      setAdminAuthError(error);
    } else {
      setAdminPasswordInput('');
    }
    setSigningIn(false);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="rounded-2xl border border-[#E5E8EF] bg-white px-8 py-6 text-center space-y-2 shadow-sm">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#1A3668] border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">جاري التحقق من صلاحية الإدارة...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E5E8EF] bg-white p-8 sm:p-10 text-center space-y-5 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A3668] text-[#C5A059] shadow-sm">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <div className="text-xs font-bold tracking-wider text-[#C5A059]">
              TOP STORE · PRIVATE CONSOLE
            </div>
            <h1 className="font-display text-2xl font-bold text-[#1A3668]">
              بوابة الإدارة الخاصة
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              منطقة محمية لإدارة كوبونات شي إن، المتاجر، التصنيفات، ومتابعة إحصائيات الاستخدام الحقيقية.
            </p>
          </div>

          {adminAuthError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 text-right">
              {adminAuthError}
            </div>
          )}

          <form onSubmit={handleAdminEmailSignIn} className="space-y-3 text-right">
            <div>
              <label htmlFor="admin-email" className="block text-xs font-semibold text-[#1A3668] mb-1">
                بريد الإدارة الإلكتروني
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="admin-email"
                  type="email"
                  required
                  dir="ltr"
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] pr-10 pl-4 py-2.5 text-sm text-slate-900 text-left focus:border-[#1A3668] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-[#1A3668] mb-1">
                كلمة المرور
              </label>
              <input
                id="admin-password"
                type="password"
                required
                dir="ltr"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-4 py-2.5 text-sm text-slate-900 text-left focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-xl bg-[#1A3668] px-5 py-3 text-sm font-semibold text-white hover:bg-[#112447] transition-colors disabled:opacity-60"
            >
              {signingIn ? 'جاري تسجيل الدخول...' : 'دخول بالبريد الإلكتروني'}
            </button>
          </form>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-[#E5E8EF]" />
            <span className="mx-3 text-[11px] font-medium text-slate-400">أو</span>
            <div className="flex-grow border-t border-[#E5E8EF]" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void handleAdminGoogleSignIn()}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-5 py-3 text-sm font-semibold text-[#1A3668] hover:border-[#C5A059] hover:bg-white transition-colors disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
              <span>تسجيل الدخول بحساب المدير (Google)</span>
            </button>

            <Link
              to="/"
              className="block w-full rounded-xl border border-[#E5E8EF] bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-[#1A3668] transition-colors"
            >
              العودة إلى متجر العملاء
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    const needsVerification = user.email === BOOTSTRAP_ADMIN_EMAIL && !user.emailVerified;

    if (needsVerification) {
      return (
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#E5E8EF] bg-white p-8 sm:p-10 text-center space-y-5 shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">
              <Mail className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-2xl font-bold text-[#1A3668]">
                مطلوب تأكيد بريد الإدارة
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                تم تسجيل الدخول ببريد الإدارة، ولحماية لوحة التحكم يلزم تأكيد ملكية البريد أولًا عبر الرابط المرسل لصندوق الوارد، أو الدخول مباشرة عبر Google.
              </p>
              <p className="font-mono text-xs text-slate-400" dir="ltr">
                {user.email}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => void refreshAuthStatus()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A3668] px-5 py-3 text-xs font-semibold text-white hover:bg-[#112447] transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                <span>أكّدت البريد — متابعة للوحة التحكم</span>
              </button>

              <button
                type="button"
                onClick={() => void resendVerificationEmail()}
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-5 py-2.5 text-xs font-semibold text-[#1A3668] hover:bg-white transition-colors"
              >
                إعادة إرسال رابط التأكيد
              </button>

              <button
                type="button"
                onClick={() => void handleAdminGoogleSignIn()}
                className="w-full rounded-xl border border-[#C5A059] bg-white px-5 py-2.5 text-xs font-semibold text-[#1A3668] hover:bg-[#F7F8FA] transition-colors"
              >
                الدخول الفوري بحساب Google
              </button>

              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full rounded-xl px-5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl border border-[#E5E8EF] bg-white p-8 sm:p-10 text-center space-y-5 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold text-[#1A3668]">
              غير مصرح بالوصول
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              هذا المسار مخصص لحساب المدير المصرح له فقط. الحساب الحالي لا يملك صلاحيات الإدارة.
            </p>
            {user.email && (
              <p className="font-mono text-xs text-slate-400 pt-1" dir="ltr">
                {user.email}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to="/"
              className="flex-1 rounded-xl bg-[#1A3668] px-5 py-3 text-xs font-semibold text-white hover:bg-[#112447] transition-colors"
            >
              العودة إلى المتجر
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex-1 rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-5 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Optional 1-click initial SHEIN catalog seed for Admin when empty
  const handleSeedStarterCatalog = async () => {
    if (!isAdmin || !user) return;
    setSeeding(true);
    try {
      const catalogBatch = writeBatch(db);

      const starterCats = [
        { id: 'cat-women', name: 'الأزياء النسائية', slug: 'women-fashion', sortOrder: 1 },
        { id: 'cat-men', name: 'الأزياء الرجالية', slug: 'men-fashion', sortOrder: 2 },
        { id: 'cat-kids', name: 'الأطفال والمواليد', slug: 'kids-baby', sortOrder: 3 },
        { id: 'cat-beauty', name: 'الجمال والمكياج (SHEGLAM)', slug: 'beauty-sheglam', sortOrder: 4 },
        { id: 'cat-shoes', name: 'الأحذية والحقائب', slug: 'shoes-bags', sortOrder: 5 },
        { id: 'cat-home', name: 'المنزل والديكور', slug: 'home-living', sortOrder: 6 },
      ];

      for (const cat of starterCats) {
        catalogBatch.set(doc(db, 'categories', cat.id), {
          name: cat.name,
          slug: cat.slug,
          description: null,
          sortOrder: cat.sortOrder,
          createdAt: serverTimestamp(),
        });
      }

      catalogBatch.set(doc(db, 'stores', 'store-shein'), {
        name: 'SHEIN',
        slug: 'shein',
        logoUrl: null,
        websiteUrl: 'https://www.shein.com',
        description: 'المتجر الرسمي لأزياء ومنتجات شي إن العالمية',
        isPopular: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Commit store and categories first so Firestore exists() check on coupons succeeds
      await catalogBatch.commit();

      const couponsBatch = writeBatch(db);
      const nextMonth = Timestamp.fromDate(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000));
      const starterCoupons = [
        {
          id: 'coupon-shein-20',
          storeId: 'store-shein',
          categoryId: 'cat-women',
          code: 'TOPSHEIN20',
          title: 'خصم إضافي 20% على جميع طلبات الأزياء النسائية في شي إن',
          description: 'كود خصم حصري من TOP STORE يمنحك خصمًا فوريًا بنسبة 20% على تشكيلة شي إن الجديدة.',
          discountPercent: 20,
          discountLabel: '20% خصم',
          terms: 'يسري على الطلبات بحد أدنى 200 ريال.',
          offerUrl: 'https://www.shein.com',
          isFeatured: true,
        },
        {
          id: 'coupon-shein-beauty-15',
          storeId: 'store-shein',
          categoryId: 'cat-beauty',
          code: 'SHEGLAM15',
          title: 'خصم 15% على مستحضرات التجميل والعناية SHEGLAM في شي إن',
          description: 'كوبون فعال على جميع منتجات الجمال والمكياج والعناية الشخصية من شي إن.',
          discountPercent: 15,
          discountLabel: '15% خصم',
          terms: 'صالح لجميع العملاء دون حد أدنى للطلب.',
          offerUrl: 'https://www.shein.com',
          isFeatured: false,
        },
      ];

      for (const cp of starterCoupons) {
        couponsBatch.set(doc(db, 'coupons', cp.id), {
          storeId: cp.storeId,
          categoryId: cp.categoryId,
          code: cp.code,
          title: cp.title,
          description: cp.description,
          discountPercent: cp.discountPercent,
          discountLabel: cp.discountLabel,
          terms: cp.terms,
          offerUrl: cp.offerUrl,
          imageUrl: null,
          startsAt: serverTimestamp(),
          expiresAt: nextMonth,
          isFeatured: cp.isFeatured,
          status: 'active',
          usageCount: 0,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await couponsBatch.commit();
      showToast('success', 'تمت تعبئة بيانات شي إن والتصنيفات الأساسية بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-seed');
    } finally {
      setSeeding(false);
    }
  };

  // Handlers: Coupons CRUD (Admin Only — SHEIN Dedicated)

  const openCreateCouponModal = () => {
    setEditingCoupon(null);
    setCStoreLogoUrl(sheinStore?.logo_url || '');
    setCImageUrl('');
    setCCategoryId(categories[0]?.id || '');
    setCCode('');
    setCTitle('');
    setCDescription('');
    setCDiscount('20');
    setCTerms('');
    setCOfferUrl('https://www.shein.com');
    setCStartsAt(new Date().toISOString().split('T')[0]);
    setCExpiresAt('');
    setCStatus('active');
    setCFeatured(false);
    setCouponModalOpen(true);
  };

  const openEditCouponModal = (coupon: CouponWithRelations) => {
    setEditingCoupon(coupon);
    setCStoreLogoUrl(coupon.store?.logo_url || sheinStore?.logo_url || '');
    setCImageUrl(coupon.image_url || '');
    setCCategoryId(coupon.category_id || '');
    setCCode(coupon.code);
    setCTitle(coupon.title);
    setCDescription(coupon.description || '');
    setCDiscount(String(coupon.discount_percent));
    setCTerms(coupon.terms || '');
    setCOfferUrl(coupon.offer_url || 'https://www.shein.com');
    setCStartsAt(coupon.starts_at ? coupon.starts_at.split('T')[0] : '');
    setCExpiresAt(coupon.expires_at ? coupon.expires_at.split('T')[0] : '');
    setCStatus(coupon.status);
    setCFeatured(coupon.is_featured);
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return;

    const normalized = normalizeCouponCode(cCode).slice(0, 40);
    if (normalized.length < 2) {
      showToast('error', 'يرجى إدخال كود خصم صحيح (حرفان على الأقل)');
      return;
    }

    const resolvedTitle = (cTitle.trim() || cDescription.trim()).slice(0, 180);
    if (resolvedTitle.length < 2) {
      showToast('error', 'يرجى إدخال عنوان أو وصف العرض');
      return;
    }

    if (cStoreLogoUrl.trim() && !safeExternalUrl(cStoreLogoUrl)) {
      showToast('error', 'رابط صورة المتجر غير صالح (يجب أن يبدأ بـ https:// أو http://)');
      return;
    }

    if (cImageUrl.trim() && !safeExternalUrl(cImageUrl)) {
      showToast('error', 'رابط صورة العرض غير صالح (يجب أن يبدأ بـ https:// أو http://)');
      return;
    }

    if (cOfferUrl.trim() && !safeExternalUrl(cOfferUrl)) {
      showToast('error', 'رابط العرض غير صالح (يجب أن يبدأ بـ https:// أو http://)');
      return;
    }

    setSavingCoupon(true);

    try {
      const cleanLogoUrl = cStoreLogoUrl.trim() ? cStoreLogoUrl.trim().slice(0, 500) : null;
      let targetStoreId = sheinStore?.id || 'store-shein';

      if (sheinStore) {
        if (cleanLogoUrl !== (sheinStore.logo_url || null)) {
          await updateDoc(doc(db, 'stores', sheinStore.id), {
            logoUrl: cleanLogoUrl,
            updatedAt: serverTimestamp(),
          });
        }
      } else {
        await setDoc(doc(db, 'stores', 'store-shein'), {
          name: 'SHEIN',
          slug: 'shein',
          logoUrl: cleanLogoUrl,
          websiteUrl: 'https://www.shein.com',
          description: 'المتجر الرسمي لأزياء ومنتجات شي إن العالمية',
          isPopular: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        targetStoreId = 'store-shein';
      }

      const duplicate = coupons.some(
        (c) =>
          c.id !== editingCoupon?.id &&
          c.store_id === targetStoreId &&
          normalizeCouponCode(c.code) === normalized
      );
      if (duplicate) {
        showToast('error', 'يوجد كوبون آخر بنفس الكود لهذا المتجر');
        setSavingCoupon(false);
        return;
      }

      const percent = Math.round(Math.min(100, Math.max(1, Number(cDiscount) || 10)));
      const startsAtTimestamp = cStartsAt
        ? Timestamp.fromDate(new Date(cStartsAt))
        : Timestamp.now();
      const expiresAtTimestamp = cExpiresAt
        ? Timestamp.fromDate(new Date(cExpiresAt))
        : null;

      const sharedFields = {
        storeId: targetStoreId,
        categoryId: cCategoryId || null,
        code: normalized,
        title: resolvedTitle,
        description: cDescription.trim() ? cDescription.trim().slice(0, 1000) : resolvedTitle,
        discountPercent: percent,
        discountLabel: `${percent}% خصم`,
        terms: cTerms.trim() ? cTerms.trim().slice(0, 1000) : null,
        offerUrl: cOfferUrl.trim() ? cOfferUrl.trim().slice(0, 500) : null,
        imageUrl: cImageUrl.trim() ? cImageUrl.trim().slice(0, 500) : null,
        startsAt: startsAtTimestamp,
        expiresAt: expiresAtTimestamp,
        isFeatured: cFeatured,
        status: cStatus,
        updatedAt: serverTimestamp(),
      };

      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), sharedFields);
        showToast('success', 'تم تحديث الكوبون ومزامنته للجميع');
      } else {
        const couponRef = doc(collection(db, 'coupons'));
        await setDoc(couponRef, {
          ...sharedFields,
          usageCount: 0,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        showToast('success', 'تم نشر الكوبون للجميع');
      }

      setCouponModalOpen(false);
    } catch (error) {
      handleFirestoreError(
        error,
        editingCoupon ? OperationType.UPDATE : OperationType.CREATE,
        editingCoupon ? `coupons/${editingCoupon.id}` : 'coupons'
      );
    } finally {
      setSavingCoupon(false);
    }
  };

  const requestDeleteCoupon = (coupon: CouponWithRelations) => {
    setConfirmState({
      open: true,
      title: 'حذف الكوبون نهائيًا',
      description: `هل أنت متأكد من حذف الكوبون "${coupon.code}" لمتجر ${coupon.store?.name || ''}؟ سيختفي فورًا من جميع الأجهزة.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'coupons', coupon.id));
          showToast('success', 'تم حذف الكوبون من النظام');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `coupons/${coupon.id}`);
        }
      },
    });
  };

  // Handlers: Stores CRUD (Admin Only)
  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !sName.trim()) return;

    if (sLogoUrl.trim() && !safeExternalUrl(sLogoUrl)) {
      showToast('error', 'رابط صورة المتجر غير صالح');
      return;
    }

    if (sWebsite.trim() && !safeExternalUrl(sWebsite)) {
      showToast('error', 'رابط موقع المتجر غير صالح');
      return;
    }

    setSavingStore(true);
    const trimmedName = sName.trim().slice(0, 80);

    try {
      if (editingStore) {
        await updateDoc(doc(db, 'stores', editingStore.id), {
          name: trimmedName,
          slug: editingStore.slug.slice(0, 100),
          logoUrl: sLogoUrl.trim() ? sLogoUrl.trim().slice(0, 500) : null,
          websiteUrl: sWebsite.trim() ? sWebsite.trim().slice(0, 500) : null,
          description: sDesc.trim() ? sDesc.trim().slice(0, 500) : null,
          isPopular: sPopular,
          updatedAt: serverTimestamp(),
        });
        showToast('success', 'تم تحديث المتجر');
      } else {
        const storeRef = doc(collection(db, 'stores'));
        await setDoc(storeRef, {
          name: trimmedName,
          slug: slugify(trimmedName).slice(0, 100),
          logoUrl: sLogoUrl.trim() ? sLogoUrl.trim().slice(0, 500) : null,
          websiteUrl: sWebsite.trim() ? sWebsite.trim().slice(0, 500) : null,
          description: sDesc.trim() ? sDesc.trim().slice(0, 500) : null,
          isPopular: sPopular,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast('success', 'تمت إضافة المتجر بنجاح');
      }

      setEditingStore(null);
      setSName('');
      setSLogoUrl('');
      setSWebsite('');
      setSDesc('');
      setSPopular(true);
    } catch (error) {
      handleFirestoreError(
        error,
        editingStore ? OperationType.UPDATE : OperationType.CREATE,
        editingStore ? `stores/${editingStore.id}` : 'stores'
      );
    } finally {
      setSavingStore(false);
    }
  };

  const requestDeleteStore = (store: Store) => {
    setConfirmState({
      open: true,
      title: 'حذف المتجر',
      description: `هل أنت متأكد من حذف متجر "${store.name}"؟ يُنصح بحذف أو نقل الكوبونات المرتبطة به أولًا.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'stores', store.id));
          showToast('success', 'تم حذف المتجر');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `stores/${store.id}`);
        }
      },
    });
  };

  // Handlers: Categories CRUD (Admin Only)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !catName.trim()) return;
    setSavingCategory(true);
    const trimmedName = catName.trim().slice(0, 80);

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: trimmedName,
          slug: editingCategory.slug.slice(0, 100),
          description: catDesc.trim() ? catDesc.trim().slice(0, 400) : null,
          sortOrder: Math.round(Number(catOrder) || 0),
        });
        showToast('success', 'تم تحديث التصنيف');
      } else {
        const catRef = doc(collection(db, 'categories'));
        await setDoc(catRef, {
          name: trimmedName,
          slug: slugify(trimmedName).slice(0, 100),
          description: catDesc.trim() ? catDesc.trim().slice(0, 400) : null,
          sortOrder: Math.round(Number(catOrder) || 0),
          createdAt: serverTimestamp(),
        });
        showToast('success', 'تمت إضافة التصنيف');
      }

      setEditingCategory(null);
      setCatName('');
      setCatDesc('');
      setCatOrder('0');
    } catch (error) {
      handleFirestoreError(
        error,
        editingCategory ? OperationType.UPDATE : OperationType.CREATE,
        editingCategory ? `categories/${editingCategory.id}` : 'categories'
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const requestDeleteCategory = (cat: Category) => {
    setConfirmState({
      open: true,
      title: 'حذف التصنيف',
      description: `هل أنت متأكد من حذف تصنيف "${cat.name}"؟`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'categories', cat.id));
          showToast('success', 'تم حذف التصنيف');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `categories/${cat.id}`);
        }
      },
    });
  };

  // Handlers: Reports Review
  const handleResolveReport = async (report: Report, disableCoupon: boolean) => {
    setProcessingId(report.id);

    try {
      if (disableCoupon && isAdmin) {
        await updateDoc(doc(db, 'coupons', report.coupon_id), {
          status: 'expired',
          updatedAt: serverTimestamp(),
        });
      }

      await updateDoc(doc(db, 'reports', report.id), {
        status: disableCoupon ? 'resolved' : 'dismissed',
        reviewedBy: user.uid,
        reviewedAt: serverTimestamp(),
      });

      showToast(
        'success',
        disableCoupon && isAdmin
          ? 'تم تعطيل الكوبون وإغلاق البلاغ'
          : disableCoupon
          ? 'تم تأكيد البلاغ وإرساله للمدير'
          : 'تم إغلاق البلاغ والإبقاء على الكوبون'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${report.id}`);
    } finally {
      setProcessingId(null);
    }
  };

  // Handlers: User Roles (Admin only)
  const handleRoleChange = async (targetProfile: Profile, nextRole: UserRole) => {
    if (!isAdmin) return;
    if (targetProfile.id === user.uid && nextRole !== 'admin') {
      showToast('error', 'لا يمكنك تخفيض صلاحية حسابك النشط حاليًا');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', targetProfile.id), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
      showToast('success', 'تم تحديث صلاحية المستخدم بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${targetProfile.id}`);
    }
  };

  // Handlers: Banner Slides CRUD (Admin Only)
  const resetBannerForm = () => {
    setEditingBanner(null);
    setBTitle('');
    setBBadgeText('');
    setBSubtitle('');
    setBImageUrl('');
    setBLinkUrl('');
    setBCtaLabel('');
    setBSortOrder('0');
    setBIsActive(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !user) return;

    const cleanTitle = bTitle.trim().slice(0, 140);
    if (!cleanTitle) {
      showToast('error', 'يرجى إدخال عنوان شريحة العرض');
      return;
    }

    const cleanImage = safeExternalUrl(bImageUrl);
    if (!cleanImage) {
      showToast('error', 'يرجى إدخال رابط صورة صحيح يبدأ بـ https:// أو http://');
      return;
    }

    const rawLink = bLinkUrl.trim();
    const isInternalLink = rawLink.startsWith('/');
    const cleanExternalLink = rawLink && !isInternalLink ? safeExternalUrl(rawLink) : null;
    if (rawLink && !isInternalLink && !cleanExternalLink) {
      showToast('error', 'رابط الوجهة غير صالح (أدخل رابطًا يبدأ بـ https:// أو مسارًا مثل /coupons)');
      return;
    }

    setSavingBanner(true);
    const resolvedLink = rawLink
      ? (isInternalLink ? rawLink : cleanExternalLink || '').slice(0, 500)
      : null;

    const sharedFields = {
      title: cleanTitle,
      badgeText: bBadgeText.trim() ? bBadgeText.trim().slice(0, 40) : null,
      subtitle: bSubtitle.trim() ? bSubtitle.trim().slice(0, 240) : null,
      imageUrl: cleanImage.slice(0, 500),
      linkUrl: resolvedLink,
      ctaLabel: bCtaLabel.trim() ? bCtaLabel.trim().slice(0, 40) : null,
      sortOrder: Math.max(-1000, Math.min(10000, Math.round(Number(bSortOrder) || 0))),
      isActive: bIsActive,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), sharedFields);
        showToast('success', 'تم تحديث شريحة العرض بنجاح');
      } else {
        const bannerRef = doc(collection(db, 'banners'));
        await setDoc(bannerRef, {
          ...sharedFields,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        });
        showToast('success', 'تمت إضافة شريحة العرض ونشرها في الصفحة الرئيسية');
      }
      resetBannerForm();
    } catch (error) {
      handleFirestoreError(
        error,
        editingBanner ? OperationType.UPDATE : OperationType.CREATE,
        editingBanner ? `banners/${editingBanner.id}` : 'banners'
      );
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleBannerActive = async (banner: BannerSlide) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'banners', banner.id), {
        isActive: !banner.is_active,
        updatedAt: serverTimestamp(),
      });
      showToast('success', banner.is_active ? 'تم إيقاف الشريحة مؤقتًا' : 'تم تفعيل الشريحة');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `banners/${banner.id}`);
    }
  };

  const requestDeleteBanner = (banner: BannerSlide) => {
    setConfirmState({
      open: true,
      title: 'حذف شريحة العرض',
      description: `هل أنت متأكد من حذف الشريحة "${banner.title}"؟ ستختفي فورًا من الشريط المتحرك.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'banners', banner.id));
          showToast('success', 'تم حذف شريحة العرض');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `banners/${banner.id}`);
        }
      },
    });
  };

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'coupons', label: 'إدارة كوبونات شي إن', icon: <Ticket className="h-4 w-4" /> },
    { id: 'banners', label: `شرائح العرض (${banners.length})`, icon: <Images className="h-4 w-4" /> },
    { id: 'reports', label: `البلاغات (${stats.pendingReportsCount})`, icon: <Flag className="h-4 w-4" /> },
    { id: 'categories', label: 'أقسام شي إن', icon: <FolderKanban className="h-4 w-4" /> },
    { id: 'stores', label: 'إدارة المتاجر', icon: <StoreIcon className="h-4 w-4" /> },
    { id: 'users', label: 'العملاء والصلاحيات', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      {/* Isolated Private Admin Top Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#112447] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C5A059] text-[#112447] font-display font-bold text-sm">
              TC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm sm:text-base font-bold tracking-tight">
                  TOP CODES
                </span>
                <span className="text-xs font-semibold text-[#DFC389]">· لوحة الإدارة الخاصة</span>
              </div>
              {user.email && (
                <div className="text-[11px] text-white/60 font-mono truncate" dir="ltr">
                  {user.email}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 sm:px-4 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[#DFC389]" aria-hidden="true" />
              <span>معاينة المتجر</span>
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 sm:px-4 py-2 text-xs font-semibold text-white hover:bg-red-500/80 transition-colors whitespace-nowrap"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E8EF] pb-6">
          <div>
            <div className="text-xs font-semibold text-[#C5A059]">
              صلاحية المدير الكاملة (Admin)
            </div>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#1A3668]">
              إدارة منصة TOP CODES
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
            {stores.length === 0 && categories.length === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedStarterCatalog()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#C5A059] bg-white px-4 py-2.5 text-xs font-semibold text-[#1A3668] hover:bg-[#F7F8FA] disabled:opacity-60 whitespace-nowrap"
              >
                <Sparkles className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                <span>{seeding ? 'جاري التجهيز...' : 'تعبئة بيانات شي إن والتصنيفات الأساسية'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={openCreateCouponModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A3668] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#112447] transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
              <span>إضافة كوبون شي إن</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#E5E8EF]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#1A3668] text-white'
                  : 'bg-white border border-[#E5E8EF] text-slate-600 hover:text-[#1A3668]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6">
                <div className="text-xs font-medium text-slate-500">إجمالي استخدامات الأكواد</div>
                <div className="mt-2 font-display text-3xl font-bold text-[#1A3668] tabular-nums">
                  {formatNumberAr(stats.totalUsageCount)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 tabular-nums">
                  إجمالي التقييمات المسجلة: {formatNumberAr(stats.totalVotesCount)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6">
                <div className="text-xs font-medium text-slate-500">الكوبونات المنشورة النشطة</div>
                <div className="mt-2 font-display text-3xl font-bold text-emerald-700 tabular-nums">
                  {formatNumberAr(stats.publishedCount)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400 tabular-nums">
                  المنتهية: {formatNumberAr(stats.expiredCount)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6">
                <div className="text-xs font-medium text-slate-500">العملاء المسجلون</div>
                <div className="mt-2 font-display text-3xl font-bold text-[#1A3668] tabular-nums">
                  {loadingAdminData ? '—' : formatNumberAr(stats.usersCount)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  التصنيفات: {formatNumberAr(categories.length)}
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6">
                <div className="text-xs font-medium text-slate-500">البلاغات بانتظار المراجعة</div>
                <div className="mt-2 font-display text-3xl font-bold text-[#C5A059] tabular-nums">
                  {loadingAdminData ? '—' : formatNumberAr(stats.pendingReportsCount)}
                </div>
                <div className="mt-1.5 text-[11px] text-slate-400">
                  إجمالي البلاغات: {loadingAdminData ? '—' : formatNumberAr(reports.length)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Used Coupons (Real Stats) */}
              <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#1A3668] flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                    <span>الأكواد الأكثر استخدامًا (إحصائيات حقيقية)</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('coupons')}
                    className="text-xs font-semibold text-[#1A3668] hover:text-[#C5A059]"
                  >
                    إدارة الكوبونات
                  </button>
                </div>

                {stats.topUsedCoupons.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">لا توجد كوبونات منشورة بعد.</p>
                ) : (
                  <div className="divide-y divide-[#E5E8EF]">
                    {stats.topUsedCoupons.map((c) => (
                      <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            <span dir="ltr" className="font-mono text-[#1A3668]">
                              {c.code}
                            </span>{' '}
                            · <span className="text-[#C5A059]">{c.discount_percent}%</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">{c.title}</div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-xs font-bold text-[#1A3668] tabular-nums">
                            {formatNumberAr(c.usage_count)} استخدام
                          </div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            يعمل: {formatNumberAr(c.works_count)} · لا يعمل: {formatNumberAr(c.not_works_count)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Pending Reports Summary */}
              <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#1A3668]">
                    أحدث بلاغات الأكواد من العملاء
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="text-xs font-semibold text-[#1A3668] hover:text-[#C5A059]"
                  >
                    فتح الكل
                  </button>
                </div>

                {reports.filter((r) => r.status === 'pending').length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">لا توجد بلاغات معلقة حاليًا.</p>
                ) : (
                  <div className="divide-y divide-[#E5E8EF]">
                    {reports
                      .filter((r) => r.status === 'pending')
                      .slice(0, 5)
                      .map((rep) => {
                        const target = coupons.find((c) => c.id === rep.coupon_id);
                        return (
                          <div key={rep.id} className="py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900 truncate">
                                {target ? `${target.store?.name || ''} (${target.code})` : 'كوبون محذوف'}
                              </div>
                              <div className="text-xs text-slate-500 truncate">{rep.reason}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('reports')}
                              className="rounded-lg border border-[#E5E8EF] px-3 py-1.5 text-xs font-semibold text-[#1A3668] hover:bg-[#F7F8FA] shrink-0"
                            >
                              فحص
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* TAB: REPORTS */}
      {activeTab === 'reports' && (
        <div className="rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              لا توجد بلاغات مسجلة حاليًا.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E8EF]">
              {reports.map((rep) => {
                const target = coupons.find((c) => c.id === rep.coupon_id);
                return (
                  <div
                    key={rep.id}
                    className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-[#1A3668]">
                          {target ? `${target.store?.name || ''} · ${target.code}` : 'كوبون محذوف'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatArabicDate(rep.created_at)}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            rep.status === 'pending'
                              ? 'text-amber-700 font-semibold'
                              : rep.status === 'resolved'
                              ? 'text-emerald-700 font-semibold'
                              : 'text-slate-500'
                          }
                        >
                          {rep.status === 'pending'
                            ? 'بانتظار المراجعة'
                            : rep.status === 'resolved'
                            ? 'تم الإجراء'
                            : 'مغلق'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{rep.reason}</p>
                      {rep.details && <p className="text-xs text-slate-600">{rep.details}</p>}
                    </div>

                    {rep.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin ? (
                          <button
                            type="button"
                            disabled={processingId === rep.id}
                            onClick={() => void handleResolveReport(rep, true)}
                            className="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                          >
                            تعطيل الكوبون وإغلاق
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={processingId === rep.id}
                            onClick={() => void handleResolveReport(rep, true)}
                            className="rounded-xl bg-[#1A3668] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-50 whitespace-nowrap"
                          >
                            تأكيد البلاغ للمدير
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={processingId === rep.id}
                          onClick={() => void handleResolveReport(rep, false)}
                          className="rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap"
                        >
                          تجاهل البلاغ
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: COUPONS MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'coupons' && isAdmin && (
        <div className="rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-slate-500">لا توجد كوبونات مضافة بعد.</p>
              <button
                type="button"
                onClick={openCreateCouponModal}
                className="rounded-xl bg-[#1A3668] px-4 py-2 text-xs font-semibold text-white"
              >
                إضافة أول كوبون
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-[#E5E8EF] bg-[#F7F8FA] text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3.5">المتجر</th>
                    <th className="px-4 py-3.5">الكود</th>
                    <th className="px-4 py-3.5">العنوان / الوصف</th>
                    <th className="px-4 py-3.5">الخصم</th>
                    <th className="px-4 py-3.5">الاستخدام</th>
                    <th className="px-4 py-3.5">الحالة</th>
                    <th className="px-4 py-3.5">الانتهاء</th>
                    <th className="px-4 py-3.5">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EF]">
                  {coupons.map((c) => {
                    const expired = c.status === 'expired' || isCouponExpired(c);
                    return (
                      <tr key={c.id} className="hover:bg-[#F7F8FA]/60">
                        <td className="px-4 py-3.5 font-semibold text-[#1A3668]">
                          <div className="flex items-center gap-2">
                            {c.store?.logo_url && (
                              <img
                                src={c.store.logo_url}
                                alt={c.store.name}
                                referrerPolicy="no-referrer"
                                className="h-5 w-5 rounded object-contain bg-[#F7F8FA] border border-[#E5E8EF]"
                              />
                            )}
                            <span>{c.store?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold" dir="ltr">
                          {c.code}
                        </td>
                        <td className="px-4 py-3.5 max-w-[220px] truncate">{c.title}</td>
                        <td className="px-4 py-3.5 tabular-nums">{c.discount_percent}%</td>
                        <td className="px-4 py-3.5 tabular-nums">{formatNumberAr(c.usage_count)}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold">
                          {expired ? (
                            <span className="text-red-700">منتهي</span>
                          ) : c.status === 'paused' ? (
                            <span className="text-amber-700">متوقف</span>
                          ) : (
                            <span className="text-emerald-700">نشط</span>
                          )}
                          {c.is_featured && (
                            <span className="text-[#C5A059] mr-1.5">· مميز</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">
                          {formatArabicDate(c.expires_at)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditCouponModal(c)}
                              aria-label="تعديل الكوبون"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1A3668]"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDeleteCoupon(c)}
                              aria-label="حذف الكوبون"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: STORES MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'stores' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveStore}
            className="lg:col-span-4 rounded-2xl border border-[#E5E8EF] bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-[#1A3668]">
              {editingStore ? 'تعديل متجر' : 'إضافة متجر جديد'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم المتجر</label>
              <input
                type="text"
                required
                value={sName}
                onChange={(e) => setSName(e.target.value)}
                placeholder="مثال: SHEIN"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                صورة المتجر (رابط الشعار إن توفر)
              </label>
              <input
                type="url"
                dir="ltr"
                value={sLogoUrl}
                onChange={(e) => setSLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">رابط المتجر</label>
              <input
                type="url"
                dir="ltr"
                value={sWebsite}
                onChange={(e) => setSWebsite(e.target.value)}
                placeholder="https://www.shein.com"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">وصف مختصر</label>
              <textarea
                rows={2}
                value={sDesc}
                onChange={(e) => setSDesc(e.target.value)}
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={sPopular}
                onChange={(e) => setSPopular(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1A3668]"
              />
              <span>إظهار ضمن المتاجر الأكثر شعبية</span>
            </label>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingStore}
                className="flex-1 rounded-xl bg-[#1A3668] py-2.5 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-50"
              >
                {savingStore ? 'جاري الحفظ...' : editingStore ? 'حفظ التعديل' : 'إضافة المتجر'}
              </button>
              {editingStore && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingStore(null);
                    setSName('');
                    setSLogoUrl('');
                    setSWebsite('');
                    setSDesc('');
                  }}
                  className="rounded-xl border border-[#E5E8EF] px-3 py-2.5 text-xs font-medium text-slate-600"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden">
            {stores.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">لا توجد متاجر مضافة بعد.</div>
            ) : (
              <div className="divide-y divide-[#E5E8EF]">
                {stores.map((store) => (
                  <div key={store.id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F7F8FA] border border-[#E5E8EF] text-xs font-bold text-[#1A3668]">
                        {store.logo_url ? (
                          <img
                            src={store.logo_url}
                            alt={store.name}
                            referrerPolicy="no-referrer"
                            className="h-7 w-7 object-contain"
                          />
                        ) : (
                          store.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#1A3668]">{store.name}</span>
                          {store.is_popular && (
                            <span className="text-xs font-medium text-[#C5A059]">· شائع</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {store.website_url || store.description || store.slug}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStore(store);
                          setSName(store.name);
                          setSLogoUrl(store.logo_url || '');
                          setSWebsite(store.website_url || '');
                          setSDesc(store.description || '');
                          setSPopular(store.is_popular);
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#1A3668]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteStore(store)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: BANNER SLIDES MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'banners' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveBanner}
            className="lg:col-span-5 rounded-2xl border border-[#E5E8EF] bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-[#1A3668]">
              {editingBanner ? 'تعديل شريحة العرض' : 'إضافة شريحة عرض جديدة'}
            </h2>
            <p className="text-xs text-slate-500">
              تظهر الشرائح المفعّلة في الشريط المتحرك أعلى الصفحة الرئيسية بالتناوب مع كوبونات شي إن.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                عنوان الشريحة *
              </label>
              <input
                type="text"
                required
                value={bTitle}
                onChange={(e) => setBTitle(e.target.value)}
                placeholder="مثال: عروض الموسم الجديدة من شي إن"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                رابط صورة الشريحة *
              </label>
              <input
                type="url"
                required
                dir="ltr"
                value={bImageUrl}
                onChange={(e) => setBImageUrl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm text-left focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
              {safeExternalUrl(bImageUrl) && (
                <img
                  src={safeExternalUrl(bImageUrl)!}
                  alt="معاينة شريحة العرض"
                  referrerPolicy="no-referrer"
                  className="mt-2.5 h-32 w-full rounded-xl border border-[#E5E8EF] object-cover bg-[#F7F8FA]"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  شارة مختصرة (اختياري)
                </label>
                <input
                  type="text"
                  value={bBadgeText}
                  onChange={(e) => setBBadgeText(e.target.value)}
                  placeholder="عرض حصري"
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ترتيب العرض
                </label>
                <input
                  type="number"
                  value={bSortOrder}
                  onChange={(e) => setBSortOrder(e.target.value)}
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm tabular-nums focus:border-[#1A3668] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                وصف مختصر (اختياري)
              </label>
              <input
                type="text"
                value={bSubtitle}
                onChange={(e) => setBSubtitle(e.target.value)}
                placeholder="تخفيضات تصل إلى 50% لفترة محدودة"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  رابط عند الضغط (اختياري)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={bLinkUrl}
                  onChange={(e) => setBLinkUrl(e.target.value)}
                  placeholder="https://www.shein.com أو /coupons"
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm text-left focus:border-[#1A3668] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نص الزر (اختياري)
                </label>
                <input
                  type="text"
                  value={bCtaLabel}
                  onChange={(e) => setBCtaLabel(e.target.value)}
                  placeholder="تسوق الآن"
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={bIsActive}
                onChange={(e) => setBIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1A3668]"
              />
              <span>شريحة مفعّلة (تظهر للعملاء في الصفحة الرئيسية)</span>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingBanner}
                className="flex-1 rounded-xl bg-[#1A3668] py-2.5 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-50"
              >
                {savingBanner ? 'جاري الحفظ...' : editingBanner ? 'حفظ التعديلات' : 'إضافة الشريحة'}
              </button>
              {editingBanner && (
                <button
                  type="button"
                  onClick={resetBannerForm}
                  className="rounded-xl border border-[#E5E8EF] px-3 py-2.5 text-xs font-medium text-slate-600"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden">
            {banners.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Images className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-600">لا توجد شرائح عرض مضافة بعد.</p>
                <p className="text-xs text-slate-400">
                  أضف أول شريحة عرض من النموذج الجانبي لتظهر فورًا مع الكوبونات في الصفحة الرئيسية.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E8EF]">
                {banners.map((banner) => (
                  <div
                    key={banner.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        referrerPolicy="no-referrer"
                        className="h-16 w-24 shrink-0 rounded-xl border border-[#E5E8EF] object-cover bg-[#F7F8FA]"
                      />
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-[#1A3668] truncate">
                            {banner.title}
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              banner.is_active ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            · {banner.is_active ? 'مفعّلة' : 'متوقفة'}
                          </span>
                        </div>
                        {banner.subtitle && (
                          <p className="text-xs text-slate-500 truncate">{banner.subtitle}</p>
                        )}
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          الترتيب: {banner.sort_order}
                          {banner.badge_text ? ` · ${banner.badge_text}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => void handleToggleBannerActive(banner)}
                        className="rounded-lg border border-[#E5E8EF] px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-[#F7F8FA]"
                      >
                        {banner.is_active ? 'إيقاف' : 'تفعيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBanner(banner);
                          setBTitle(banner.title);
                          setBBadgeText(banner.badge_text || '');
                          setBSubtitle(banner.subtitle || '');
                          setBImageUrl(banner.image_url);
                          setBLinkUrl(banner.link_url || '');
                          setBCtaLabel(banner.cta_label || '');
                          setBSortOrder(String(banner.sort_order));
                          setBIsActive(banner.is_active);
                        }}
                        aria-label="تعديل الشريحة"
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#1A3668]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteBanner(banner)}
                        aria-label="حذف الشريحة"
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: CATEGORIES MANAGEMENT (ADMIN ONLY) */}
      {activeTab === 'categories' && isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-4 rounded-2xl border border-[#E5E8EF] bg-white p-6 space-y-4"
          >
            <h2 className="font-display text-lg font-bold text-[#1A3668]">
              {editingCategory ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'}
            </h2>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">اسم التصنيف</label>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="مثال: الأزياء والموضة"
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">الوصف</label>
              <input
                type="text"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ترتيب العرض</label>
              <input
                type="number"
                value={catOrder}
                onChange={(e) => setCatOrder(e.target.value)}
                className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm tabular-nums focus:border-[#1A3668] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={savingCategory}
                className="flex-1 rounded-xl bg-[#1A3668] py-2.5 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-50"
              >
                {savingCategory ? 'جاري الحفظ...' : editingCategory ? 'حفظ التعديل' : 'إضافة التصنيف'}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setCatName('');
                    setCatDesc('');
                    setCatOrder('0');
                  }}
                  className="rounded-xl border border-[#E5E8EF] px-3 py-2.5 text-xs font-medium text-slate-600"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden">
            {categories.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">لا توجد تصنيفات مضافة بعد.</div>
            ) : (
              <div className="divide-y divide-[#E5E8EF]">
                {categories.map((cat) => (
                  <div key={cat.id} className="p-5 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-[#1A3668]">{cat.name}</div>
                      <div className="text-xs text-slate-500">
                        الترتيب: {cat.sort_order} {cat.description ? `· ${cat.description}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCatName(cat.name);
                          setCatDesc(cat.description || '');
                          setCatOrder(String(cat.sort_order));
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-[#1A3668]"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => requestDeleteCategory(cat)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: USERS & ROLES (ADMIN ONLY) */}
      {activeTab === 'users' && isAdmin && (
        <div className="rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden">
          {allProfiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">لا يوجد مستخدمون مسجلون.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="border-b border-[#E5E8EF] bg-[#F7F8FA] text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3.5">الاسم</th>
                    <th className="px-5 py-3.5">البريد الإلكتروني</th>
                    <th className="px-5 py-3.5">تاريخ الانضمام</th>
                    <th className="px-5 py-3.5">الصلاحية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EF]">
                  {allProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F7F8FA]/60">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">
                        {p.full_name || 'مستخدم'}
                        {p.id === profile?.id && (
                          <span className="text-xs text-[#C5A059] mr-1.5">(أنت)</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-600" dir="ltr">
                        {p.email}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 tabular-nums">
                        {formatArabicDate(p.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={p.role}
                          onChange={(e) => void handleRoleChange(p, e.target.value as UserRole)}
                          disabled={p.id === profile?.id}
                          className="rounded-lg border border-[#E5E8EF] bg-[#F7F8FA] px-3 py-1.5 text-xs font-semibold text-[#1A3668] disabled:opacity-60"
                        >
                          <option value="user">User (مستخدم)</option>
                          <option value="moderator">Moderator (مشرف)</option>
                          <option value="admin">Admin (مدير)</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Coupon (Admin Only) */}
      {couponModalOpen && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-[#E5E8EF] bg-white p-6 sm:p-8 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-[#E5E8EF] pb-4">
              <h2 className="font-display text-xl font-bold text-[#1A3668]">
                {editingCoupon ? 'تعديل بيانات الكوبون' : 'إضافة كوبون جديد'}
              </h2>
              <button
                type="button"
                onClick={() => setCouponModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="mt-6 space-y-4">
              {/* Dedicated SHEIN Store + Optional Logo URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] p-4">
                <div>
                  <span className="block text-xs font-medium text-slate-600 mb-1">المتجر المعتمد</span>
                  <div className="rounded-xl border border-[#E5E8EF] bg-white px-3.5 py-2.5 text-sm font-bold text-[#1A3668]">
                    SHEIN (شي إن)
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    صورة / شعار شي إن (اختياري - رابط الصورة)
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={cStoreLogoUrl}
                    onChange={(e) => setCStoreLogoUrl(e.target.value)}
                    placeholder="https://example.com/shein-logo.png"
                    className="w-full rounded-xl border border-[#E5E8EF] bg-white px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">التصنيف</label>
                  <select
                    value={cCategoryId}
                    onChange={(e) => setCCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                  >
                    <option value="">بدون تصنيف</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">الحالة</label>
                  <select
                    value={cStatus}
                    onChange={(e) => setCStatus(e.target.value as CouponStatus)}
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="paused">متوقف مؤقتًا (Paused)</option>
                    <option value="expired">منتهي (Expired)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">كود الخصم</label>
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={cCode}
                    onChange={(e) => setCCode(e.target.value.toUpperCase())}
                    placeholder="TOPSHEIN20"
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 font-mono text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">
                    نسبة الخصم (%)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={cDiscount}
                    onChange={(e) => setCDiscount(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A3668] mb-1">عنوان العرض</label>
                <input
                  type="text"
                  required
                  value={cTitle}
                  onChange={(e) => setCTitle(e.target.value)}
                  placeholder="مثال: خصم إضافي 20% على جميع طلبات الأزياء"
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A3668] mb-1">وصف العرض</label>
                <textarea
                  rows={2}
                  value={cDescription}
                  onChange={(e) => setCDescription(e.target.value)}
                  placeholder="تفاصيل العرض ومجال الخصم..."
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A3668] mb-1">
                  شروط الاستخدام
                </label>
                <textarea
                  rows={2}
                  value={cTerms}
                  onChange={(e) => setCTerms(e.target.value)}
                  placeholder="الحد الأدنى للطلب أو المنتجات المستثناة..."
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                />
              </div>

              <div className="rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] p-4 space-y-2.5">
                <label className="block text-xs font-semibold text-[#1A3668]">
                  صورة العرض / الكوبون (تظهر في الشريط المتحرك بالصفحة الرئيسية)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="url"
                    dir="ltr"
                    value={cImageUrl}
                    onChange={(e) => setCImageUrl(e.target.value)}
                    placeholder="https://example.com/offer-banner.jpg"
                    className="w-full flex-1 rounded-xl border border-[#E5E8EF] bg-white px-3.5 py-2.5 text-sm"
                  />
                  {safeExternalUrl(cImageUrl) && (
                    <img
                      src={safeExternalUrl(cImageUrl)!}
                      alt="معاينة صورة الكوبون"
                      referrerPolicy="no-referrer"
                      className="h-14 w-24 shrink-0 rounded-lg border border-[#E5E8EF] bg-white object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">
                    رابط العرض
                  </label>
                  <input
                    type="url"
                    dir="ltr"
                    value={cOfferUrl}
                    onChange={(e) => setCOfferUrl(e.target.value)}
                    placeholder="https://www.shein.com"
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">
                    تاريخ البداية
                  </label>
                  <input
                    type="date"
                    value={cStartsAt}
                    onChange={(e) => setCStartsAt(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A3668] mb-1">
                    تاريخ الانتهاء
                  </label>
                  <input
                    type="date"
                    value={cExpiresAt}
                    onChange={(e) => setCExpiresAt(e.target.value)}
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={cFeatured}
                  onChange={(e) => setCFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#1A3668]"
                />
                <span>تعيين ككوبون مميز في أعلى الصفحة الرئيسية</span>
              </label>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E8EF]">
                <button
                  type="button"
                  onClick={() => setCouponModalOpen(false)}
                  className="rounded-xl border border-[#E5E8EF] px-4 py-2.5 text-xs font-semibold text-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingCoupon}
                  className="rounded-xl bg-[#1A3668] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-50"
                >
                  {savingCoupon ? 'جاري الحفظ...' : editingCoupon ? 'حفظ التعديلات' : 'نشر الكوبون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        loading={confirmLoading}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
        onConfirm={async () => {
          setConfirmLoading(true);
          await confirmState.onConfirm();
          setConfirmLoading(false);
          setConfirmState((prev) => ({ ...prev, open: false }));
        }}
      />
      </div>
    </div>
  );
}
