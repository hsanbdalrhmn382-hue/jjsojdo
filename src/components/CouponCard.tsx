import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  KeyRound,
  Users,
  Zap,
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
import type { CouponWithRelations } from '../types/database';

interface CouponCardProps {
  coupon: CouponWithRelations;
}

export function CouponCard({ coupon }: CouponCardProps) {
  const { copyAndTrackCoupon, toggleFavorite, favoriteIds } = useApp();
  const [justCopied, setJustCopied] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const isFav = favoriteIds.has(coupon.id);
  const valid = isCouponValidNow(coupon);
  const validity = getCouponValidityLabel(coupon);
  const approvalRate = getApprovalRate(coupon);
  const externalOfferUrl = safeExternalUrl(coupon.offer_url || coupon.store?.website_url);

  const handleCopy = async () => {
    const copied = await copyAndTrackCoupon(coupon);
    if (copied) {
      setJustCopied(true);
      window.setTimeout(() => setJustCopied(false), 1800);
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-3xl border border-[#E5E8EF] bg-white p-5 sm:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#1A3668]/5">
      {/* Top Section: Details (RTL Start) + Icon Tile with Favorite Heart (RTL End) */}
      <div>
        <div className="flex items-start justify-between gap-4">
          {/* Right/Start Column: Metadata line + Title + Description & Big % */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Unboxed Clean Metadata Line */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span className="font-bold text-[#1A3668]">
                {coupon.store?.name || 'SHEIN'}
              </span>
              {coupon.is_featured && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#C5A059]">مميز</span>
                </>
              )}
              {coupon.category?.name && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{coupon.category.name}</span>
                </>
              )}
            </div>

            <Link
              to={`/coupons/${coupon.id}`}
              className="block font-display text-base sm:text-lg font-bold text-slate-900 leading-snug hover:text-[#1A3668] transition-colors line-clamp-2"
            >
              {coupon.title}
            </Link>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 flex-1">
                {coupon.description || 'كود خصم شي إن معتمد للاستخدام الفوري عند إتمام الطلب.'}
              </p>
              <div className="font-display text-3xl font-extrabold text-[#1A3668] tabular-nums shrink-0 leading-none">
                {coupon.discount_percent}%
              </div>
            </div>
          </div>

          {/* Left/End Column: Rounded Square Icon Tile + Corner Heart */}
          <div className="relative shrink-0">
            <Link
              to={`/coupons/${coupon.id}`}
              aria-label={`تفاصيل كوبون ${coupon.code}`}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A3668] to-[#112447] text-[#DFC389] border border-[#1A3668]/10 shadow-sm overflow-hidden"
            >
              {coupon.store?.logo_url && !logoFailed ? (
                <img
                  src={coupon.store.logo_url}
                  alt={coupon.store.name}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                  className="h-11 w-11 object-contain rounded-lg bg-white/95 p-1"
                />
              ) : (
                <Zap className="h-7 w-7 fill-[#DFC389]/20" aria-hidden="true" />
              )}
            </Link>

            <button
              type="button"
              onClick={() => void toggleFavorite(coupon.id)}
              aria-label={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
              className="absolute -top-2 -left-2 flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E8EF] bg-white text-slate-400 shadow-xs hover:text-[#C5A059] transition-colors"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isFav ? 'fill-[#C5A059] text-[#C5A059]' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Middle & Bottom: Code Box + 2 Action Buttons + Verification Stats */}
      <div className="mt-5 space-y-3">
        {/* Code Display Box */}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E5E8EF] bg-[#F7F8FA] px-4 py-2.5">
          <div className="w-8" aria-hidden="true" />
          <span
            dir="ltr"
            className="font-mono text-base sm:text-lg font-bold tracking-widest text-[#0F172A] select-all truncate"
          >
            {coupon.code}
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-[#E5E8EF] text-[#C5A059]">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        {/* Dual Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={!valid}
            onClick={() => void handleCopy()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors min-h-[44px] ${
              !valid
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : justCopied
                ? 'bg-emerald-700 text-white'
                : 'bg-[#1A3668] text-white hover:bg-[#112447]'
            }`}
          >
            {justCopied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>{valid ? 'نسخ الكود' : 'غير متاح'}</span>
              </>
            )}
          </button>

          {externalOfferUrl ? (
            <a
              href={externalOfferUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1A3668]/30 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#1A3668] hover:border-[#1A3668] hover:bg-[#F7F8FA] transition-colors whitespace-nowrap min-h-[44px]"
            >
              <span>افتح المتجر</span>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <Link
              to={`/coupons/${coupon.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1A3668]/30 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#1A3668] hover:border-[#1A3668] hover:bg-[#F7F8FA] transition-colors whitespace-nowrap min-h-[44px]"
            >
              <span>التفاصيل</span>
            </Link>
          )}
        </div>

        {/* Bottom Verification Stats Row */}
        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#E5E8EF]/80 text-[11px] sm:text-xs text-slate-500 tabular-nums">
          <Link
            to={`/coupons/${coupon.id}`}
            className={`inline-flex items-center gap-1 font-medium hover:underline ${
              validity.tone === 'active'
                ? 'text-slate-600'
                : validity.tone === 'expired'
                ? 'text-red-700'
                : 'text-amber-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-[#C5A059] shrink-0" aria-hidden="true" />
            <span>{validity.tone === 'active' ? 'الكود يعمل' : validity.label}</span>
          </Link>

          <Link
            to={`/coupons/${coupon.id}`}
            className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {approvalRate !== null
                ? `نجاح ${approvalRate}%`
                : formatArabicDate(coupon.expires_at)}
            </span>
          </Link>

          <span className="inline-flex items-center gap-1 text-slate-500">
            <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{formatNumberAr(coupon.usage_count)} استخدم</span>
          </span>
        </div>
      </div>
    </article>
  );
}
