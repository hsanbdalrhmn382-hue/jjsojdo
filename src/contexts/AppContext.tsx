import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
import { isCouponValidNow } from '../lib/couponUtils';
import { useToast } from './ToastContext';
import type {
  BannerSlide,
  Category,
  Coupon,
  CouponVote,
  CouponWithRelations,
  Favorite,
  Profile,
  Store,
  UserRole,
} from '../types/database';

const BOOTSTRAP_ADMIN_EMAIL = 'hsanbdalrhmn382@gmail.com';

function toIsoString(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return new Date().toISOString();
}

function toNullableIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

function translateFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد الإلكتروني مسجل مسبقًا، جرّب تسجيل الدخول.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة، يجب أن تتكون من 6 أحرف على الأقل.';
    case 'auth/too-many-requests':
      return 'تم إجراء محاولات كثيرة، يرجى الانتظار قليلًا ثم المحاولة.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بالبريد الإلكتروني غير مفعّل حاليًا في إعدادات Firebase Console.';
    case 'auth/popup-closed-by-user':
      return 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.';
    default:
      return err instanceof Error ? err.message : 'تعذر إتمام عملية المصادقة';
  }
}

interface AppContextValue {
  isConfigured: boolean;
  initializing: boolean;
  dataLoading: boolean;
  dataError: string | null;

  user: FirebaseUser | null;
  profile: Profile | null;
  isAdmin: boolean;
  isStaff: boolean;

  stores: Store[];
  categories: Category[];
  coupons: CouponWithRelations[];
  banners: BannerSlide[];
  favorites: Favorite[];
  favoriteIds: Set<string>;
  userVotes: Record<string, CouponVote>;
  userUsesCount: number;

  refreshPublicData: () => Promise<void>;

  signInWithGoogle: () => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  resendVerificationEmail: () => Promise<{ error: string | null }>;
  refreshAuthStatus: () => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfileName: (fullName: string) => Promise<{ error: string | null }>;

  copyAndTrackCoupon: (coupon: CouponWithRelations) => Promise<boolean>;
  toggleFavorite: (couponId: string) => Promise<void>;
  voteCoupon: (couponId: string, isWorking: boolean) => Promise<void>;
  reportCoupon: (couponId: string, reason: string, details: string) => Promise<{ error: string | null }>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();

  const [initializing, setInitializing] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [, setAuthRefreshTick] = useState(0);

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawCoupons, setRawCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [allVotes, setAllVotes] = useState<CouponVote[]>([]);
  const [usesCounts, setUsesCounts] = useState<Record<string, number>>({});
  const [usesByUser, setUsesByUser] = useState<Record<string, number>>({});

  const ensureUserProfile = useCallback(
    async (firebaseUser: FirebaseUser, fallbackName?: string) => {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const defaultRole: UserRole =
        firebaseUser.email === BOOTSTRAP_ADMIN_EMAIL && firebaseUser.emailVerified
          ? 'admin'
          : 'user';

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const cleanName = (
            fallbackName ||
            firebaseUser.displayName ||
            firebaseUser.email?.split('@')[0] ||
            'مستخدم'
          )
            .trim()
            .slice(0, 100);
          const cleanEmail = (firebaseUser.email || '').trim().slice(0, 160);
          const cleanAvatar = firebaseUser.photoURL
            ? firebaseUser.photoURL.slice(0, 500)
            : null;

          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: cleanEmail,
            fullName: cleanName,
            avatarUrl: cleanAvatar,
            role: defaultRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
    },
    []
  );

  // Startup connection test & Auth listener
  useEffect(() => {
    void testConnection();

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        void ensureUserProfile(nextUser).catch((err) => {
          console.error(err);
        });
      } else {
        setProfile(null);
        setFavorites([]);
      }
      setInitializing(false);
    });

    return () => unsubAuth();
  }, [ensureUserProfile]);

  // Real-time public Firestore listeners (stores, categories, coupons, coupon_votes, coupon_uses)
  useEffect(() => {
    setDataLoading(true);
    setDataError(null);

    const unsubStores = onSnapshot(
      collection(db, 'stores'),
      (snap) => {
        const list: Store[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              slug: String(data.slug || d.id),
              logo_url: (data.logoUrl as string) || null,
              website_url: (data.websiteUrl as string) || null,
              description: (data.description as string) || null,
              is_popular: Boolean(data.isPopular),
              created_at: toIsoString(data.createdAt),
              updated_at: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => {
            if (a.is_popular !== b.is_popular) return a.is_popular ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
        setStores(list);
      },
      (error) => {
        setDataError('تعذر الاتصال بقائمة المتاجر');
        handleFirestoreError(error, OperationType.LIST, 'stores');
      }
    );

    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        const list: Category[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ''),
              slug: String(data.slug || d.id),
              description: (data.description as string) || null,
              sort_order: Number(data.sortOrder ?? 0),
              created_at: toIsoString(data.createdAt),
            };
          })
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
        setCategories(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );

    const unsubCoupons = onSnapshot(
      collection(db, 'coupons'),
      (snap) => {
        const list: Coupon[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              store_id: String(data.storeId || ''),
              category_id: (data.categoryId as string) || null,
              code: String(data.code || ''),
              title: String(data.title || ''),
              description: (data.description as string) || null,
              discount_percent: Number(data.discountPercent ?? 0),
              discount_label: (data.discountLabel as string) || null,
              terms: (data.terms as string) || null,
              offer_url: (data.offerUrl as string) || null,
              image_url: (data.imageUrl as string) || null,
              starts_at: toIsoString(data.startsAt),
              expires_at: toNullableIsoString(data.expiresAt),
              is_featured: Boolean(data.isFeatured),
              status: (data.status as Coupon['status']) || 'active',
              usage_count: Number(data.usageCount ?? 0),
              works_count: 0,
              not_works_count: 0,
              created_by: (data.createdBy as string) || null,
              created_at: toIsoString(data.createdAt),
              updated_at: toIsoString(data.updatedAt),
            };
          })
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRawCoupons(list);
        setDataLoading(false);
      },
      (error) => {
        setDataLoading(false);
        setDataError('تعذر تحميل العروض حاليًا، يرجى المحاولة لاحقًا');
        handleFirestoreError(error, OperationType.LIST, 'coupons');
      }
    );

    const unsubVotes = onSnapshot(
      collection(db, 'coupon_votes'),
      (snap) => {
        const list: CouponVote[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            coupon_id: String(data.couponId || ''),
            user_id: String(data.userId || ''),
            is_working: Boolean(data.isWorking),
            created_at: toIsoString(data.createdAt),
            updated_at: toIsoString(data.updatedAt),
          };
        });
        setAllVotes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'coupon_votes');
      }
    );

    const unsubUses = onSnapshot(
      collection(db, 'coupon_uses'),
      (snap) => {
        const counts: Record<string, number> = {};
        const byUid: Record<string, number> = {};
        for (const d of snap.docs) {
          const data = d.data();
          const cid = String(data.couponId || '');
          const uid = String(data.userId || '');
          if (cid) counts[cid] = (counts[cid] || 0) + 1;
          if (uid) byUid[uid] = (byUid[uid] || 0) + 1;
        }
        setUsesCounts(counts);
        setUsesByUser(byUid);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'coupon_uses');
      }
    );

    const unsubBanners = onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        const list: BannerSlide[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ''),
              badge_text: (data.badgeText as string) || null,
              subtitle: (data.subtitle as string) || null,
              image_url: String(data.imageUrl || ''),
              link_url: (data.linkUrl as string) || null,
              cta_label: (data.ctaLabel as string) || null,
              sort_order: Number(data.sortOrder ?? 0),
              is_active: Boolean(data.isActive),
              created_by: (data.createdBy as string) || null,
              created_at: toIsoString(data.createdAt),
              updated_at: toIsoString(data.updatedAt),
            };
          })
          .sort(
            (a, b) =>
              a.sort_order - b.sort_order ||
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        setBanners(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'banners');
      }
    );

    return () => {
      unsubStores();
      unsubCategories();
      unsubCoupons();
      unsubVotes();
      unsubUses();
      unsubBanners();
    };
  }, []);

  // Real-time authenticated user profile & favorites
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const roleFromDoc = (data.role as UserRole) || 'user';
          const effectiveRole: UserRole =
            user.email === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified ? 'admin' : roleFromDoc;
          setProfile({
            id: snap.id,
            email: String(data.email || user.email || ''),
            full_name: (data.fullName as string) || null,
            avatar_url: (data.avatarUrl as string) || null,
            role: effectiveRole,
            created_at: toIsoString(data.createdAt),
            updated_at: toIsoString(data.updatedAt),
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    );

    const favQuery = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubFavs = onSnapshot(
      favQuery,
      (snap) => {
        const list: Favorite[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            user_id: String(data.userId || ''),
            coupon_id: String(data.couponId || ''),
            created_at: toIsoString(data.createdAt),
          };
        });
        setFavorites(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'favorites');
      }
    );

    return () => {
      unsubProfile();
      unsubFavs();
    };
  }, [user]);

  const userVotes = useMemo<Record<string, CouponVote>>(() => {
    if (!user) return {};
    const map: Record<string, CouponVote> = {};
    for (const v of allVotes) {
      if (v.user_id === user.uid) {
        map[v.coupon_id] = v;
      }
    }
    return map;
  }, [allVotes, user]);

  const coupons = useMemo<CouponWithRelations[]>(() => {
    const storeMap = new Map(stores.map((s) => [s.id, s]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const voteStats = new Map<string, { works: number; notWorks: number }>();
    for (const v of allVotes) {
      const current = voteStats.get(v.coupon_id) || { works: 0, notWorks: 0 };
      if (v.is_working) current.works += 1;
      else current.notWorks += 1;
      voteStats.set(v.coupon_id, current);
    }

    return rawCoupons.map((coupon) => {
      const vStats = voteStats.get(coupon.id);
      return {
        ...coupon,
        usage_count: coupon.usage_count + (usesCounts[coupon.id] || 0),
        works_count: vStats?.works ?? 0,
        not_works_count: vStats?.notWorks ?? 0,
        store: storeMap.get(coupon.store_id) ?? null,
        category: coupon.category_id ? categoryMap.get(coupon.category_id) ?? null : null,
      };
    });
  }, [rawCoupons, stores, categories, allVotes, usesCounts]);

  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.coupon_id)), [favorites]);

  const refreshPublicData = useCallback(async () => {
    await testConnection();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('success', 'تم تسجيل الدخول بنجاح');
      return { error: null };
    } catch (err) {
      return { error: translateFirebaseAuthError(err) };
    }
  }, [showToast]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim();
      if (!cleanEmail || !password) {
        return { error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' };
      }
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
        showToast('success', 'تم تسجيل الدخول بنجاح');
        return { error: null };
      } catch (err) {
        return { error: translateFirebaseAuthError(err) };
      }
    },
    [showToast]
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      const cleanEmail = email.trim();
      const cleanName = fullName.trim().slice(0, 100);
      if (!cleanName) {
        return { error: 'يرجى إدخال الاسم الكامل' };
      }
      if (!cleanEmail || password.length < 6) {
        return { error: 'يرجى إدخال بريد إلكتروني صحيح وكلمة مرور لا تقل عن 6 أحرف' };
      }
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
        await ensureUserProfile(cred.user, cleanName);
        await sendEmailVerification(cred.user).catch(() => {});
        showToast('success', 'تم إنشاء حسابك وتسجيل الدخول بنجاح');
        return { error: null };
      } catch (err) {
        return { error: translateFirebaseAuthError(err) };
      }
    },
    [ensureUserProfile, showToast]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      const cleanEmail = email.trim();
      if (!cleanEmail) {
        return { error: 'يرجى إدخال البريد الإلكتروني لإرسال رابط الاستعادة' };
      }
      try {
        await sendPasswordResetEmail(auth, cleanEmail);
        showToast('success', 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك');
        return { error: null };
      } catch (err) {
        return { error: translateFirebaseAuthError(err) };
      }
    },
    [showToast]
  );

  const resendVerificationEmail = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return { error: 'يجب تسجيل الدخول أولًا' };
    try {
      await sendEmailVerification(current);
      showToast('success', 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني');
      return { error: null };
    } catch (err) {
      return { error: translateFirebaseAuthError(err) };
    }
  }, [showToast]);

  const refreshAuthStatus = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return false;
    await current.reload();
    await current.getIdToken(true);
    setUser(auth.currentUser);
    setAuthRefreshTick((n) => n + 1);
    if (auth.currentUser?.emailVerified) {
      showToast('success', 'تم تأكيد البريد الإلكتروني بنجاح');
      return true;
    }
    showToast('info', 'لم يتم تأكيد البريد بعد، يرجى فتح الرابط المرسل إلى بريدك');
    return false;
  }, [showToast]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    showToast('info', 'تم تسجيل الخروج');
  }, [showToast]);

  const updateProfileName = useCallback(
    async (fullName: string) => {
      if (!user) return { error: 'يجب تسجيل الدخول أولًا' };
      const trimmed = fullName.trim().slice(0, 100);
      if (!trimmed) return { error: 'يرجى إدخال الاسم الكامل' };
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          fullName: trimmed,
          updatedAt: serverTimestamp(),
        });
        showToast('success', 'تم تحديث بيانات الحساب');
        return { error: null };
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    },
    [user, showToast]
  );

  const copyAndTrackCoupon = useCallback(
    async (coupon: CouponWithRelations) => {
      if (!isCouponValidNow(coupon)) {
        showToast('error', 'هذا الكوبون غير نشط أو منتهي الصلاحية حاليًا');
        return false;
      }

      try {
        await navigator.clipboard.writeText(coupon.code);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = coupon.code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      showToast('success', `تم نسخ الكود ${coupon.code} بنجاح`);

      if (user) {
        const useRef = doc(collection(db, 'coupon_uses'));
        try {
          await setDoc(useRef, {
            couponId: coupon.id,
            userId: user.uid,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `coupon_uses/${useRef.id}`);
        }
      }
      return true;
    },
    [user, showToast]
  );

  const toggleFavorite = useCallback(
    async (couponId: string) => {
      if (!user) {
        showToast('info', 'سجّل الدخول لحفظ الكوبونات في المفضلة');
        return;
      }

      const favId = `${user.uid}_${couponId}`;
      const favRef = doc(db, 'favorites', favId);
      const existing = favorites.find((f) => f.coupon_id === couponId);

      try {
        if (existing) {
          await deleteDoc(doc(db, 'favorites', existing.id));
          showToast('info', 'تمت إزالة الكوبون من المفضلة');
        } else {
          await setDoc(favRef, {
            userId: user.uid,
            couponId,
            createdAt: serverTimestamp(),
          });
          showToast('success', 'تم حفظ الكوبون في المفضلة');
        }
      } catch (error) {
        handleFirestoreError(
          error,
          existing ? OperationType.DELETE : OperationType.CREATE,
          `favorites/${existing ? existing.id : favId}`
        );
      }
    },
    [user, favorites, showToast]
  );

  const voteCoupon = useCallback(
    async (couponId: string, isWorking: boolean) => {
      if (!user) {
        showToast('info', 'سجّل الدخول لتقييم فعالية الكوبون');
        return;
      }

      const voteId = `${couponId}_${user.uid}`;
      const voteRef = doc(db, 'coupon_votes', voteId);
      const existing = userVotes[couponId];

      try {
        if (existing && existing.is_working === isWorking) {
          await deleteDoc(doc(db, 'coupon_votes', existing.id));
          showToast('info', 'تم إلغاء تقييمك للكوبون');
        } else if (existing) {
          await updateDoc(doc(db, 'coupon_votes', existing.id), {
            isWorking,
            updatedAt: serverTimestamp(),
          });
          showToast(
            'success',
            isWorking ? 'شكرًا لتأكيد أن الكوبون يعمل' : 'تم تسجيل ملاحظتك بأن الكوبون لا يعمل'
          );
        } else {
          await setDoc(voteRef, {
            couponId,
            userId: user.uid,
            isWorking,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          showToast(
            'success',
            isWorking ? 'شكرًا لتأكيد أن الكوبون يعمل' : 'تم تسجيل ملاحظتك بأن الكوبون لا يعمل'
          );
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `coupon_votes/${voteId}`);
      }
    },
    [user, userVotes, showToast]
  );

  const reportCoupon = useCallback(
    async (couponId: string, reason: string, details: string) => {
      if (!user) {
        return { error: 'يجب تسجيل الدخول أولًا للإبلاغ عن الكود' };
      }

      const reportRef = doc(collection(db, 'reports'));
      try {
        await setDoc(reportRef, {
          couponId,
          userId: user.uid,
          reason: reason.trim().slice(0, 180),
          details: details.trim() ? details.trim().slice(0, 600) : null,
          status: 'pending',
          reviewedBy: null,
          reviewedAt: null,
          createdAt: serverTimestamp(),
        });
        showToast('success', 'تم إرسال البلاغ لفريق الإدارة للمراجعة');
        return { error: null };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `reports/${reportRef.id}`);
      }
    },
    [user, showToast]
  );

  const isAdmin =
    profile?.role === 'admin' ||
    (user?.email === BOOTSTRAP_ADMIN_EMAIL && Boolean(user?.emailVerified));
  const isStaff = isAdmin || profile?.role === 'moderator';
  const userUsesCount = user ? usesByUser[user.uid] || 0 : 0;

  const value: AppContextValue = {
    isConfigured: true,
    initializing,
    dataLoading,
    dataError,
    user,
    profile,
    isAdmin,
    isStaff,
    stores,
    categories,
    coupons,
    banners,
    favorites,
    favoriteIds,
    userVotes,
    userUsesCount,
    refreshPublicData,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    resendVerificationEmail,
    refreshAuthStatus,
    signOut,
    updateProfileName,
    copyAndTrackCoupon,
    toggleFavorite,
    voteCoupon,
    reportCoupon,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
