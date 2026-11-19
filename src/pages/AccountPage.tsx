import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronDown,
  Copy,
  Gem,
  Heart,
  Lightbulb,
  Lock,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ThumbsUp,
  Ticket,
  User as UserIcon,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CouponCard } from '../components/CouponCard';
import { formatNumberAr, isCouponValidNow, isSheinStore } from '../lib/couponUtils';

type AccordionSection = 'profile' | 'favorites' | 'help' | null;
type AuthMode = 'signin' | 'signup' | 'reset';

export function AccountPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const {
    user,
    profile,
    isAdmin,
    coupons,
    favoriteIds,
    userVotes,
    userUsesCount,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    resendVerificationEmail,
    refreshAuthStatus,
    updateProfileName,
    signOut,
  } = useApp();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  const [openAccordion, setOpenAccordion] = useState<AccordionSection>(null);

  useEffect(() => {
    if (profile?.full_name !== undefined && profile?.full_name !== null) {
      setFullName(profile.full_name);
    }
  }, [profile?.full_name]);

  const favoriteCoupons = useMemo(
    () =>
      coupons.filter(
        (c) => favoriteIds.has(c.id) && isSheinStore(c.store) && isCouponValidNow(c)
      ),
    [coupons, favoriteIds]
  );

  const completeRedirect = () => {
    if (redirectParam && redirectParam.startsWith('/')) {
      navigate(redirectParam);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setSigningIn(true);
    const res = await signInWithGoogle();
    setSigningIn(false);
    if (res.error) {
      setAuthError(res.error);
    } else {
      completeRedirect();
    }
  };

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setSigningIn(true);

    if (authMode === 'signin') {
      const res = await signInWithEmail(emailInput, passwordInput);
      setSigningIn(false);
      if (res.error) {
        setAuthError(res.error);
      } else {
        setPasswordInput('');
        completeRedirect();
      }
      return;
    }

    if (authMode === 'signup') {
      const res = await signUpWithEmail(emailInput, passwordInput, signUpName);
      setSigningIn(false);
      if (res.error) {
        setAuthError(res.error);
      } else {
        setPasswordInput('');
        completeRedirect();
      }
      return;
    }

    const res = await resetPassword(emailInput);
    setSigningIn(false);
    if (res.error) {
      setAuthError(res.error);
    } else {
      setAuthSuccessMsg('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.');
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setNameError(null);
    const res = await updateProfileName(fullName);
    setSavingName(false);
    if (res.error) setNameError(res.error);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpenAccordion(null);
    navigate('/');
  };

  const toggleAccordion = (section: Exclude<AccordionSection, null>) => {
    setOpenAccordion((prev) => (prev === section ? null : section));
  };

  const switchAuthMode = (next: AuthMode) => {
    setAuthMode(next);
    setAuthError(null);
    setAuthSuccessMsg(null);
  };

  const avatarSrc = profile?.avatar_url || user?.photoURL || null;
  const displayName = user
    ? profile?.full_name || user.displayName || 'عضو TOP CODES'
    : 'زائر TOP CODES';
  const myVotesCount = user ? Object.keys(userVotes).length : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-5 pb-12 space-y-5">
      {/* 1. Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0F172A] leading-tight">
            حسابي
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">مركزك الشخصي داخل التطبيق</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/coupons"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E8EF] bg-white px-3.5 py-1.5 text-xs font-bold text-[#1A3668] shadow-2xs hover:border-[#C5A059] transition-colors"
          >
            <span>TOP CODES</span>
            <Gem className="h-3.5 w-3.5 text-[#C5A059]" aria-hidden="true" />
          </Link>

          {user ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E5E8EF] bg-white text-[#1A3668] shadow-2xs hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <a
              href="#customer-auth-box"
              aria-label="تسجيل الدخول"
              title="تسجيل الدخول"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E5E8EF] bg-white text-[#1A3668] shadow-2xs hover:border-[#C5A059] transition-colors"
            >
              <UserIcon className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {/* 2. Dark Navy Hero Profile Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1A3668] via-[#152D58] to-[#0E1E3B] p-5 sm:p-6 text-white shadow-md shadow-[#1A3668]/15">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/[0.04]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 left-6 h-36 w-36 rounded-full bg-[#C5A059]/[0.08]"
        />

        <div className="relative space-y-5">
          {/* Profile Identity Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#DFC389]/60 bg-gradient-to-br from-[#DFC389] to-[#C5A059] text-[#112447] overflow-hidden shadow-xs">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-7 w-7 text-white" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl font-bold text-white truncate">
                  {displayName}
                </h2>
                {user ? (
                  <p dir="ltr" className="text-xs text-white/75 font-mono truncate">
                    {user.email}
                  </p>
                ) : (
                  <p className="text-xs text-white/75 truncate">
                    سجّل دخولك لحفظ المفضلة وتقييم الأكواد
                  </p>
                )}
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C5A059]/45 bg-[#C5A059]/15 px-3 py-1 text-xs font-bold text-[#DFC389] shrink-0">
              <span>{user ? 'VIP' : 'TOP'}</span>
              <Gem className="h-3 w-3" aria-hidden="true" />
            </div>
          </div>

          {/* 3-Column Real Stats Strip */}
          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
            <div className="space-y-1.5">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#DFC389]">
                <Copy className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-white tabular-nums leading-none">
                {formatNumberAr(userUsesCount)}
              </div>
              <div className="text-[11px] font-medium text-white/70">نسخ</div>
            </div>

            <div className="space-y-1.5">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#DFC389]">
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-white tabular-nums leading-none">
                {formatNumberAr(myVotesCount)}
              </div>
              <div className="text-[11px] font-medium text-white/70">تقييماتي</div>
            </div>

            <div className="space-y-1.5">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#DFC389]">
                <Heart className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-white tabular-nums leading-none">
                {formatNumberAr(user ? favoriteCoupons.length : 0)}
              </div>
              <div className="text-[11px] font-medium text-white/70">المفضلة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Private Admin Access Card (Visible STRICTLY to Verified Admin — Hidden from All Customers) */}
      {isAdmin && (
        <section className="rounded-2xl border border-[#C5A059] bg-white p-4 sm:p-5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3668] text-[#DFC389]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm font-bold text-[#1A3668]">
                لوحة التحكم الخاصة
              </div>
              <p className="text-xs text-slate-500 truncate">
                إدارة الكوبونات والتصنيفات وإحصائيات الاستخدام
              </p>
            </div>
          </div>
          <Link
            to="/admin"
            className="rounded-xl bg-[#1A3668] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#112447] transition-colors whitespace-nowrap shrink-0"
          >
            فتح اللوحة
          </Link>
        </section>
      )}

      {/* Unverified Bootstrap Admin Email Prompt (Visible ONLY to hsanbdalrhmn382@gmail.com if unverified) */}
      {!isAdmin && user?.email === 'hsanbdalrhmn382@gmail.com' && !user.emailVerified && (
        <section className="rounded-2xl border border-[#C5A059] bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-sm font-bold text-[#1A3668]">
            <ShieldCheck className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
            <span>تأكيد بريد الإدارة لفتح لوحة التحكم</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            افتح رابط التأكيد المرسل إلى بريدك الإلكتروني ثم اضغط «تحقق الآن»، أو سجّل الدخول عبر Google لفتح لوحة التحكم فورًا.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refreshAuthStatus()}
              className="rounded-xl bg-[#1A3668] px-4 py-2 text-xs font-semibold text-white"
            >
              تحقق الآن
            </button>
            <button
              type="button"
              onClick={() => void resendVerificationEmail()}
              className="rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-4 py-2 text-xs font-semibold text-[#1A3668]"
            >
              إعادة إرسال الرابط
            </button>
          </div>
        </section>
      )}

      {/* Customer Authentication Box (Email/Password + Google) when Logged Out */}
      {!user && (
        <section
          id="customer-auth-box"
          className="rounded-3xl border border-[#E5E8EF] bg-white p-5 sm:p-6 space-y-5 shadow-2xs"
          aria-label="تسجيل دخول العميل"
        >
          {/* Mode Tabs: Sign In / Sign Up */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F7F8FA] p-1 border border-[#E5E8EF]">
            <button
              type="button"
              onClick={() => switchAuthMode('signin')}
              className={`rounded-xl py-2 text-xs sm:text-sm font-bold transition-colors ${
                authMode === 'signin' || authMode === 'reset'
                  ? 'bg-[#1A3668] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#1A3668]'
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => switchAuthMode('signup')}
              className={`rounded-xl py-2 text-xs sm:text-sm font-bold transition-colors ${
                authMode === 'signup'
                  ? 'bg-[#1A3668] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-[#1A3668]'
              }`}
            >
              حساب جديد
            </button>
          </div>

          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
            {authMode === 'signup' && (
              <div>
                <label htmlFor="auth-fullname" className="block text-xs font-semibold text-[#1A3668] mb-1">
                  الاسم الكامل
                </label>
                <div className="relative">
                  <UserIcon
                    className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] pr-10 pl-4 py-2.5 text-sm text-slate-900 focus:border-[#1A3668] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-semibold text-[#1A3668] mb-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="auth-email"
                  type="email"
                  required
                  dir="ltr"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] pr-10 pl-4 py-2.5 text-sm text-slate-900 text-left focus:border-[#1A3668] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {authMode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="text-xs font-semibold text-[#1A3668]">
                    كلمة المرور
                  </label>
                  {authMode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchAuthMode('reset')}
                      className="text-[11px] font-semibold text-[#C5A059] hover:text-[#1A3668]"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    dir="ltr"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] pr-10 pl-4 py-2.5 text-sm text-slate-900 text-left focus:border-[#1A3668] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            {authError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {authError}
              </div>
            )}

            {authSuccessMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
                {authSuccessMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full rounded-2xl bg-[#1A3668] px-5 py-3 text-xs sm:text-sm font-bold text-white hover:bg-[#112447] transition-colors disabled:opacity-60 min-h-[44px]"
            >
              {signingIn
                ? 'جاري المعالجة...'
                : authMode === 'signin'
                ? 'دخول بالبريد الإلكتروني'
                : authMode === 'signup'
                ? 'إنشاء حساب جديد'
                : 'إرسال رابط استعادة كلمة المرور'}
            </button>

            {authMode === 'reset' && (
              <button
                type="button"
                onClick={() => switchAuthMode('signin')}
                className="w-full text-center text-xs font-semibold text-slate-500 hover:text-[#1A3668]"
              >
                العودة لتسجيل الدخول
              </button>
            )}
          </form>

          <div className="relative flex items-center py-0.5">
            <div className="flex-grow border-t border-[#E5E8EF]" />
            <span className="mx-3 text-[11px] font-medium text-slate-400">أو</span>
            <div className="flex-grow border-t border-[#E5E8EF]" />
          </div>

          <button
            type="button"
            disabled={signingIn}
            onClick={() => void handleGoogleSignIn()}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-2xl border border-[#E5E8EF] bg-[#F7F8FA] px-5 py-3 text-xs sm:text-sm font-bold text-[#1A3668] hover:border-[#C5A059] hover:bg-white transition-colors disabled:opacity-60 min-h-[44px]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#1A3668"
                d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5 16.25 5 12C5 7.9 8.2 4.73 12.2 4.73C15.29 4.73 17.1 6.7 17.1 6.7L19 4.72C19 4.72 16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12C2.03 17.05 6.16 22 12.25 22C17.6 22 21.5 18.33 21.5 12.91C21.5 11.76 21.35 11.1 21.35 11.1Z"
              />
            </svg>
            <span>المتابعة باستخدام حساب Google</span>
          </button>
        </section>
      )}

      {/* 3. Three Quick Action Squircle Tiles (Strictly Navy / Gold / White Palette) */}
      <section className="grid grid-cols-3 gap-3" aria-label="اختصارات سريعة">
        <Link
          to="/coupons"
          className="rounded-2xl bg-[#1A3668] p-4 text-center text-white flex flex-col items-center justify-center gap-2.5 shadow-2xs hover:bg-[#112447] transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-[#DFC389]">
            <Ticket className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold">كل العروض</span>
        </Link>

        <Link
          to="/coupons?sort=popular"
          className="rounded-2xl bg-[#112447] p-4 text-center text-white flex flex-col items-center justify-center gap-2.5 shadow-2xs hover:bg-[#0E1E3B] transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C5A059]/20 text-[#DFC389]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold">الأكثر استخدامًا</span>
        </Link>

        <Link
          to="/favorites"
          className="rounded-2xl border border-[#E5E8EF] bg-white p-4 text-center text-[#1A3668] flex flex-col items-center justify-center gap-2.5 shadow-2xs hover:border-[#C5A059] transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C5A059]/15 text-[#C5A059]">
            <Heart className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-xs font-bold">المفضلة</span>
        </Link>
      </section>

      {/* 4. Expandable Accordion Cards Stack */}
      <section className="space-y-3" aria-label="إعدادات الحساب والبيانات">
        {/* Card 1: بياناتي وتفضيلاتي */}
        <div className="rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleAccordion('profile')}
            aria-expanded={openAccordion === 'profile'}
            className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-right hover:bg-[#F7F8FA]/60 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1A3668]/8 text-[#1A3668]">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                  بياناتي وتفضيلاتي
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  الاسم الشخصي، البريد الإلكتروني، وإدارة الحساب
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                openAccordion === 'profile' ? 'rotate-180 text-[#1A3668]' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {openAccordion === 'profile' && (
            <div className="border-t border-[#E5E8EF] bg-[#F7F8FA]/50 p-4 sm:p-5 space-y-4">
              {user ? (
                <form onSubmit={handleSaveName} className="space-y-3">
                  <div>
                    <label
                      htmlFor="profile-fullname"
                      className="block text-xs font-semibold text-[#1A3668] mb-1.5"
                    >
                      الاسم الكامل
                    </label>
                    <input
                      id="profile-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أدخل اسمك الكامل"
                      className="w-full rounded-xl border border-[#E5E8EF] bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-[#1A3668] focus:outline-none"
                    />
                  </div>
                  {nameError && <p className="text-xs text-red-600">{nameError}</p>}
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="submit"
                      disabled={savingName}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A3668] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-60"
                    >
                      <Save className="h-3.5 w-3.5 text-[#DFC389]" aria-hidden="true" />
                      <span>{savingName ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E8EF] bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-red-600"
                    >
                      <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center space-y-3 py-2">
                  <p className="text-xs text-slate-600">
                    سجّل دخولك بالبريد الإلكتروني أو حساب Google أعلاه لتعديل بيانات حسابك.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 2: كوبوناتي المحفوظة */}
        <div className="rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleAccordion('favorites')}
            aria-expanded={openAccordion === 'favorites'}
            className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-right hover:bg-[#F7F8FA]/60 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#C5A059]/15 text-[#C5A059]">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                  كوبوناتي المحفوظة
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  الأكواد المحفوظة في المفضلة ({formatNumberAr(user ? favoriteCoupons.length : 0)})
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                openAccordion === 'favorites' ? 'rotate-180 text-[#1A3668]' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {openAccordion === 'favorites' && (
            <div className="border-t border-[#E5E8EF] bg-[#F7F8FA]/50 p-4 sm:p-5">
              {!user ? (
                <div className="text-center space-y-3 py-2">
                  <p className="text-xs text-slate-600">سجّل دخولك أولًا لعرض قائمة المفضلة.</p>
                </div>
              ) : favoriteCoupons.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {favoriteCoupons.map((coupon) => (
                    <CouponCard key={coupon.id} coupon={coupon} />
                  ))}
                </div>
              ) : (
                <div className="text-center space-y-3 py-2">
                  <p className="text-xs text-slate-600">لا توجد كوبونات محفوظة في المفضلة حاليًا.</p>
                  <Link
                    to="/coupons"
                    className="inline-flex rounded-xl bg-[#1A3668] px-5 py-2.5 text-xs font-semibold text-white"
                  >
                    استعراض كوبونات شي إن
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 3: المساعدة ومعلومات التطبيق */}
        <div className="rounded-2xl border border-[#E5E8EF] bg-white overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => toggleAccordion('help')}
            aria-expanded={openAccordion === 'help'}
            className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-right hover:bg-[#F7F8FA]/60 transition-colors"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1A3668]/8 text-[#1A3668]">
                <Lightbulb className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm sm:text-base font-bold text-[#0F172A]">
                  المساعدة ومعلومات التطبيق
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  طريقة استخدام الأكواد، التقييم، ودليل TOP CODES
                </p>
              </div>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                openAccordion === 'help' ? 'rotate-180 text-[#1A3668]' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {openAccordion === 'help' && (
            <div className="border-t border-[#E5E8EF] bg-[#F7F8FA]/50 p-4 sm:p-5 space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <p>
                <strong className="text-[#1A3668]">1. نسخ الكود:</strong> اضغط على زر «نسخ الكود» في أي عرض لنسخ رمز الخصم مباشرة ولصقه عند إتمام الطلب في شي إن.
              </p>
              <p>
                <strong className="text-[#1A3668]">2. تقييم الفعالية:</strong> بعد تجربة الكود يمكنك تحديد «يعمل» أو «لا يعمل» لمساعدة المتسوقين الآخرين.
              </p>
              <p>
                <strong className="text-[#1A3668]">3. الإبلاغ عن الأكواد:</strong> في حال توقف أي كود، استخدم خيار الإبلاغ داخل صفحة الكوبون ليتم تحديثه فورًا.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
