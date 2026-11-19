import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Flag,
  Heart,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  formatArabicDate,
  formatNumberAr,
  getApprovalRate,
  getCouponValidityLabel,
  isCouponValidNow,
  safeExternalUrl,
} from '../lib/couponUtils';

export function CouponDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    coupons,
    dataLoading,
    favoriteIds,
    userVotes,
    user,
    copyAndTrackCoupon,
    toggleFavorite,
    voteCoupon,
    reportCoupon,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('الكود غير صالح أو لا يطبق الخصم');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);

  const coupon = useMemo(() => coupons.find((c) => c.id === id) || null, [coupons, id]);

  if (dataLoading && !coupon) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-96 rounded-2xl border border-[#E5E8EF] bg-white animate-pulse" />
      </div>
    );
  }

  if (!coupon || coupon.status === 'paused') {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl border border-[#E5E8EF] bg-white p-12 text-center space-y-4">
          <h1 className="font-display text-2xl font-bold text-[#1A3668]">الكوبون غير متاح</h1>
          <p className="text-sm text-slate-600">
            ربما انتهت صلاحية هذا الكوبون أو لم يعد منشورًا حاليًا.
          </p>
          <Link
            to="/coupons"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1A3668] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#112447]"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            <span>العودة إلى جميع الكوبونات</span>
          </Link>
        </div>
      </div>
    );
  }

  const valid = isCouponValidNow(coupon);
  const validity = getCouponValidityLabel(coupon);
  const isFav = favoriteIds.has(coupon.id);
  const myVote = userVotes[coupon.id];
  const totalVotes = coupon.works_count + coupon.not_works_count;
  const approvalRate = getApprovalRate(coupon);
  const externalOfferUrl = safeExternalUrl(coupon.offer_url || coupon.store?.website_url);

  const handleCopy = async () => {
    const ok = await copyAndTrackCoupon(coupon);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitting(true);
    setReportMessage(null);
    const { error } = await reportCoupon(coupon.id, reportReason, reportDetails);
    setReportSubmitting(false);
    if (error) {
      setReportMessage(error);
    } else {
      setReportDetails('');
      setReportOpen(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <Link
          to="/coupons"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#1A3668] transition-colors"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          <span>العودة إلى الكوبونات</span>
        </Link>
      </div>

      {/* Main Coupon Detail Card */}
      <div className="rounded-2xl border border-[#E5E8EF] bg-white p-6 sm:p-10 space-y-8">
        {/* Top Metadata + Favorite */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E8EF] pb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {coupon.store?.logo_url && (
                <img
                  src={coupon.store.logo_url}
                  alt={coupon.store.name}
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-lg object-contain bg-[#F7F8FA] border border-[#E5E8EF]"
                />
              )}
              <span className="font-bold text-[#1A3668] text-sm">
                {coupon.store?.name || 'SHEIN'}
              </span>
              {coupon.category?.name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{coupon.category.name}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span
                className={
                  validity.tone === 'active'
                    ? 'text-emerald-700 font-semibold'
                    : validity.tone === 'expired'
                    ? 'text-red-700 font-semibold'
                    : 'text-amber-700 font-semibold'
                }
              >
                {validity.label}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              {coupon.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="font-display text-3xl font-extrabold text-[#1A3668] tabular-nums">
                {coupon.discount_percent}%
              </div>
              <div className="text-xs font-semibold text-[#C5A059]">نسبة الخصم</div>
            </div>

            <button
              type="button"
              onClick={() => void toggleFavorite(coupon.id)}
              aria-label={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
              className={`rounded-xl border p-3 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                isFav
                  ? 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059]'
                  : 'border-[#E5E8EF] bg-[#F7F8FA] text-slate-500 hover:text-[#1A3668]'
              }`}
            >
              <Heart className={`h-5 w-5 ${isFav ? 'fill-[#C5A059]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Copy Code Box + External Offer Link */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
          <div className="md:col-span-8 flex items-center justify-between gap-3 rounded-xl border border-dashed border-[#C5A059] bg-[#F7F8FA] px-5 py-4">
            <div>
              <div className="text-xs text-slate-500 mb-0.5">كود الخصم</div>
              <div
                dir="ltr"
                className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-[#1A3668] select-all"
              >
                {coupon.code}
              </div>
            </div>

            <button
              type="button"
              disabled={!valid}
              onClick={() => void handleCopy()}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                !valid
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : copied
                  ? 'bg-emerald-700 text-white'
                  : 'bg-[#1A3668] text-white hover:bg-[#112447]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>{valid ? 'نسخ الكود' : 'منتهي / غير نشط'}</span>
                </>
              )}
            </button>
          </div>

          <div className="md:col-span-4 flex">
            {externalOfferUrl ? (
              <a
                href={externalOfferUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#1A3668] bg-white px-5 py-4 text-sm font-semibold text-[#1A3668] hover:bg-[#1A3668] hover:text-white transition-colors"
              >
                <span>الذهاب إلى شي إن (SHEIN)</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : (
              <div className="w-full inline-flex items-center justify-center rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-5 py-4 text-xs text-slate-500">
                لا يوجد رابط مباشر للعرض
              </div>
            )}
          </div>
        </div>

        {/* Description & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#1A3668]">تفاصيل العرض</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {coupon.description || 'استخدم الكود عند إتمام الطلب للحصول على الخصم الموضح.'}
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#1A3668]">شروط الاستخدام</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {coupon.terms || 'لا توجد شروط إضافية مسجلة، يُرجى التحقق من سلة المشتريات قبل الدفع.'}
            </p>
          </div>
        </div>

        {/* Dates & Usage Stats (Strictly Real Numbers) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-[#E5E8EF] py-5 text-sm">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Calendar className="h-4 w-4 text-[#C5A059] shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs text-slate-500">تاريخ البداية</div>
              <div className="font-semibold tabular-nums">{formatArabicDate(coupon.starts_at)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-slate-700">
            <Calendar className="h-4 w-4 text-[#C5A059] shrink-0" aria-hidden="true" />
            <div>
              <div className="text-xs text-slate-500">تاريخ الانتهاء</div>
              <div className="font-semibold tabular-nums">{formatArabicDate(coupon.expires_at)}</div>
            </div>
          </div>

          <div className="text-slate-700">
            <div className="text-xs text-slate-500">إجمالي الاستخدامات</div>
            <div className="font-semibold tabular-nums">{formatNumberAr(coupon.usage_count)} مرة</div>
          </div>
        </div>

        {/* Community Verification (Works / Doesn't Work) + Report */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-sm font-bold text-[#1A3668]">هل عمل الكوبون معك؟</div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void voteCoupon(coupon.id, true)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                  myVote?.is_working === true
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-[#E5E8EF] bg-[#F7F8FA] text-slate-700 hover:border-emerald-600 hover:text-emerald-700'
                }`}
              >
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                <span>يعمل الكوبون</span>
                <span className="tabular-nums opacity-80">({formatNumberAr(coupon.works_count)})</span>
              </button>

              <button
                type="button"
                onClick={() => void voteCoupon(coupon.id, false)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
                  myVote?.is_working === false
                    ? 'border-red-700 bg-red-700 text-white'
                    : 'border-[#E5E8EF] bg-[#F7F8FA] text-slate-700 hover:border-red-600 hover:text-red-700'
                }`}
              >
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                <span>لا يعمل الكوبون</span>
                <span className="tabular-nums opacity-80">({formatNumberAr(coupon.not_works_count)})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 tabular-nums">
              {totalVotes > 0 ? (
                <>
                  عدد التقييمات: {formatNumberAr(totalVotes)}
                  {approvalRate !== null && ` · نسبة النجاح الفعلية ${approvalRate}%`}
                </>
              ) : (
                'لا توجد تقييمات بعد — كن أول من يقيّم هذا الكوبون.'
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setReportOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-700 transition-colors self-start sm:self-center"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden="true" />
            <span>الإبلاغ عن كود غير صالح</span>
          </button>
        </div>

        {/* Report Form */}
        {reportOpen && (
          <form
            onSubmit={handleReportSubmit}
            className="rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] p-5 space-y-4"
          >
            <h3 className="text-sm font-bold text-[#1A3668]">إرسال بلاغ لمراجعة الإدارة</h3>

            {!user && (
              <p className="text-xs text-amber-700">
                يجب{' '}
                <Link to="/account" className="underline font-semibold">
                  تسجيل الدخول
                </Link>{' '}
                أولًا لإرسال بلاغ.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="report-reason" className="block text-xs font-medium text-slate-700 mb-1.5">
                  سبب البلاغ
                </label>
                <select
                  id="report-reason"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E8EF] bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#1A3668] focus:outline-none"
                >
                  <option value="الكود غير صالح أو لا يطبق الخصم">الكود غير صالح أو لا يطبق الخصم</option>
                  <option value="الكوبون منتهي الصلاحية">الكوبون منتهي الصلاحية</option>
                  <option value="الرابط غير صحيح">الرابط غير صحيح</option>
                  <option value="الشروط غير مطابقة للعرض">الشروط غير مطابقة للعرض</option>
                </select>
              </div>

              <div>
                <label htmlFor="report-details" className="block text-xs font-medium text-slate-700 mb-1.5">
                  تفاصيل إضافية (اختياري)
                </label>
                <input
                  id="report-details"
                  type="text"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="مثال: يظهر رسالة انتهى الحد الأقصى"
                  className="w-full rounded-lg border border-[#E5E8EF] bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#1A3668] focus:outline-none"
                />
              </div>
            </div>

            {reportMessage && <p className="text-xs text-red-600">{reportMessage}</p>}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="rounded-lg border border-[#E5E8EF] bg-white px-4 py-2 text-xs font-medium text-slate-700"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={!user || reportSubmitting}
                className="rounded-lg bg-[#1A3668] px-4 py-2 text-xs font-semibold text-white hover:bg-[#112447] disabled:opacity-50"
              >
                {reportSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
