import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Flame,
  Heart,
  Search,
  ShoppingBag,
  User as UserIcon,
} from 'lucide-react';
import { AnimatePresence, motion, type PanInfo } from 'motion/react';
import { useApp } from '../contexts/AppContext';
import { CouponCard } from '../components/CouponCard';
import {
  formatArabicDate,
  isCouponValidNow,
  isSheinStore,
  safeExternalUrl,
} from '../lib/couponUtils';
import type { BannerSlide, CouponWithRelations } from '../types/database';

type FeedFilter = 'all' | 'featured' | 'high_discount' | 'popular' | string;
type CarouselItem =
  | { kind: 'banner'; key: string; banner: BannerSlide }
  | { kind: 'coupon'; key: string; coupon: CouponWithRelations };

export function HomePage() {
  const navigate = useNavigate();
  const {
    profile,
    initializing,
    dataLoading,
    coupons,
    banners,
    categories,
    copyAndTrackCoupon,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [bannerCopied, setBannerCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');

  const activeCoupons = useMemo(
    () => coupons.filter((c) => isCouponValidNow(c) && isSheinStore(c.store)),
    [coupons]
  );

  // Combine active Admin Banner Slides + Spotlight Coupons together in the rotating carousel
  const carouselItems = useMemo<CarouselItem[]>(() => {
    const activeBanners = banners.filter((b) => b.is_active);
    const withImages = activeCoupons.filter((c) => Boolean(c.image_url));
    const featuredWithoutImg = activeCoupons.filter((c) => !c.image_url && c.is_featured);
    const others = activeCoupons.filter((c) => !c.image_url && !c.is_featured);
    const spotlightCoupons = [...withImages, ...featuredWithoutImg, ...others].slice(
      0,
      Math.max(5, withImages.length)
    );

    const combined: CarouselItem[] = [];
    const maxLen = Math.max(activeBanners.length, spotlightCoupons.length);
    for (let i = 0; i < maxLen; i += 1) {
      if (i < activeBanners.length) {
        const banner = activeBanners[i];
        combined.push({ kind: 'banner', key: `banner-${banner.id}`, banner });
      }
      if (i < spotlightCoupons.length) {
        const coupon = spotlightCoupons[i];
        combined.push({ kind: 'coupon', key: `coupon-${coupon.id}`, coupon });
      }
    }
    return combined;
  }, [banners, activeCoupons]);

  const totalSlides = carouselItems.length;
  const safeSlideIndex = totalSlides > 0 ? activeSlide % totalSlides : 0;
  const currentSlide = carouselItems[safeSlideIndex] || null;
  const currentCoupon = currentSlide?.kind === 'coupon' ? currentSlide.coupon : null;
  const currentBanner = currentSlide?.kind === 'banner' ? currentSlide.banner : null;

  const goToNextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setSlideDirection(1);
    setActiveSlide((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goToPrevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setSlideDirection(-1);
    setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback(
    (idx: number) => {
      if (totalSlides <= 1) return;
      setSlideDirection(idx > safeSlideIndex ? 1 : -1);
      setActiveSlide(idx);
    },
    [safeSlideIndex, totalSlides]
  );

  useEffect(() => {
    if (totalSlides <= 1 || isCarouselPaused) return;
    const interval = window.setInterval(() => {
      setSlideDirection(1);
      setActiveSlide((prev) => (prev + 1) % totalSlides);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [totalSlides, isCarouselPaused]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (totalSlides <= 1) return;
    if (info.offset.x < -40 || info.velocity.x < -300) {
      goToNextSlide();
    } else if (info.offset.x > 40 || info.velocity.x > 300) {
      goToPrevSlide();
    }
  };

  // Filtered coupons for "كل العروض" feed
  const filteredCoupons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    let list = activeCoupons.filter((c) => {
      if (q) {
        const haystack = [
          c.code,
          c.title,
          c.description || '',
          c.category?.name || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (activeFilter === 'featured') return c.is_featured;
      if (activeFilter === 'high_discount') return c.discount_percent >= 20;
      if (activeFilter !== 'all' && activeFilter !== 'popular') {
        return c.category_id === activeFilter;
      }
      return true;
    });

    if (activeFilter === 'popular') {
      list = [...list].sort((a, b) => b.usage_count - a.usage_count);
    } else if (activeFilter === 'high_discount') {
      list = [...list].sort((a, b) => b.discount_percent - a.discount_percent);
    } else {
      list = [...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return list;
  }, [activeCoupons, activeFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/coupons?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/coupons');
    }
  };

  const handleCopySpotlight = async () => {
    if (!currentCoupon) return;
    const ok = await copyAndTrackCoupon(currentCoupon);
    if (ok) {
      setBannerCopied(true);
      window.setTimeout(() => setBannerCopied(false), 1800);
    }
  };

  const firstName = profile?.full_name?.trim().split(' ')[0] || '';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-12 space-y-7">
      {/* 1. Top Search & Quick Action Icons Row (matches screenshot top bar) */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <label htmlFor="home-search" className="sr-only">
            ابحث عن كود خصم شي إن
          </label>
          <div className="flex items-center rounded-full border border-[#E5E8EF] bg-white px-2 py-1.5 shadow-2xs focus-within:border-[#1A3668] transition-colors">
            <input
              id="home-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كود خصم شي إن..."
              className="w-full bg-transparent px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              aria-label="بحث"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1A3668]/8 text-[#1A3668] hover:bg-[#1A3668] hover:text-white transition-colors"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        <Link
          to="/favorites"
          aria-label="الكوبونات المفضلة"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E8EF] bg-white text-[#1A3668] hover:border-[#C5A059] transition-colors shadow-2xs"
        >
          <Heart className="h-4 w-4" aria-hidden="true" />
        </Link>

        <Link
          to="/account"
          aria-label="حسابي"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E5E8EF] bg-white text-[#1A3668] hover:border-[#C5A059] transition-colors shadow-2xs"
        >
          <UserIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* 2. Auto-playing & Customer-Draggable Featured Image Carousel */}
      <section
        aria-label="العرض المميز"
        onMouseEnter={() => setIsCarouselPaused(true)}
        onMouseLeave={() => setIsCarouselPaused(false)}
        onTouchStart={() => setIsCarouselPaused(true)}
        onTouchEnd={() => setIsCarouselPaused(false)}
      >
        <motion.div
          drag={totalSlides > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleDragEnd}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#1A3668] via-[#152D58] to-[#0E1E3B] text-white shadow-md shadow-[#1A3668]/10 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentSlide ? currentSlide.key : 'empty-spotlight'}
                initial={{ opacity: 0, x: slideDirection > 0 ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection > 0 ? 24 : -24 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
                className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 sm:gap-6 p-4 sm:p-8"
              >
                {/* Visual Image Showcase Side (Displays Banner Slide image OR Coupon image) */}
                <div className="md:col-span-5 order-1 md:order-2">
                  <div className="relative h-44 sm:h-48 lg:h-52 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#112447]">
                    <img
                      src={
                        currentBanner
                          ? currentBanner.image_url
                          : currentCoupon?.image_url ||
                            currentCoupon?.store?.logo_url ||
                            '/src/assets/images/store_fashion_showcase_1795092734186.jpg'
                      }
                      alt={
                        currentBanner
                          ? currentBanner.title
                          : currentCoupon
                          ? currentCoupon.title
                          : 'تشكيلة عروض شي إن'
                      }
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="h-full w-full object-cover transition-transform duration-500"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0E1E3B]/70 via-transparent to-transparent" />
                    {totalSlides > 1 && (
                      <div className="absolute bottom-2.5 left-2.5 rounded-full bg-[#112447]/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#DFC389] backdrop-blur-xs tabular-nums">
                        {safeSlideIndex + 1} / {totalSlides}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Side */}
                <div className="md:col-span-7 order-2 md:order-1 space-y-3.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[#DFC389]">
                    <span>
                      {currentBanner
                        ? currentBanner.badge_text || 'عرض مميز'
                        : currentCoupon?.is_featured
                        ? 'اختيار مميز'
                        : 'عرض شي إن المعتمد'}
                    </span>
                    {currentCoupon?.expires_at && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatArabicDate(currentCoupon.expires_at)}</span>
                      </>
                    )}
                  </div>

                  {initializing || dataLoading ? (
                    <div className="space-y-3 animate-pulse py-2">
                      <div className="h-6 w-3/4 rounded bg-white/15" />
                      <div className="h-10 w-48 rounded-full bg-white/15" />
                    </div>
                  ) : currentBanner ? (
                    <>
                      <h2 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold leading-snug text-white line-clamp-2">
                        {currentBanner.title}
                      </h2>
                      {currentBanner.subtitle && (
                        <p className="text-xs sm:text-sm text-white/80 line-clamp-2">
                          {currentBanner.subtitle}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                        {currentBanner.link_url && currentBanner.link_url.startsWith('/') ? (
                          <Link
                            to={currentBanner.link_url}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#1A3668] hover:bg-[#DFC389] transition-colors whitespace-nowrap min-h-[42px]"
                          >
                            <span>{currentBanner.cta_label || 'استعرض العرض'}</span>
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        ) : safeExternalUrl(currentBanner.link_url) ? (
                          <a
                            href={safeExternalUrl(currentBanner.link_url)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#1A3668] hover:bg-[#DFC389] transition-colors whitespace-nowrap min-h-[42px]"
                          >
                            <span>{currentBanner.cta_label || 'تسوق الآن'}</span>
                            <ExternalLink className="h-4 w-4" aria-hidden="true" />
                          </a>
                        ) : (
                          <Link
                            to="/coupons"
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#1A3668] hover:bg-[#DFC389] transition-colors whitespace-nowrap min-h-[42px]"
                          >
                            <span>{currentBanner.cta_label || 'تصفح العروض'}</span>
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </>
                  ) : currentCoupon ? (
                    <>
                      <h2 className="font-display text-lg sm:text-2xl lg:text-3xl font-bold leading-snug text-white line-clamp-2">
                        {currentCoupon.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-0.5">
                        <button
                          type="button"
                          onClick={() => void handleCopySpotlight()}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-[#1A3668] hover:bg-[#DFC389] transition-colors whitespace-nowrap min-h-[42px]"
                        >
                          <ShoppingBag className="h-4 w-4 text-[#C5A059]" aria-hidden="true" />
                          <span>
                            {bannerCopied ? 'تم نسخ الكود' : `انسخ ${currentCoupon.code}`}
                          </span>
                          {bannerCopied ? (
                            <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>

                        <Link
                          to={`/coupons/${currentCoupon.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F8FA] px-4 py-2 text-xs font-bold text-[#1A3668] tabular-nums hover:bg-white transition-colors min-h-[42px]"
                        >
                          <span className="text-[#C5A059]">خصم</span>
                          <span>{currentCoupon.discount_percent}%</span>
                        </Link>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                        أحدث كوبونات شي إن الحصرية من TOP STORE
                      </h2>
                      <Link
                        to="/coupons"
                        className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-[#1A3668]"
                      >
                        <span>تصفح الكوبونات</span>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Manual Customer Prev / Next Controls */}
            {totalSlides > 1 && (
              <>
                <button
                  type="button"
                  onClick={goToPrevSlide}
                  aria-label="العرض السابق"
                  className="absolute top-1/2 right-2 sm:right-3 -translate-y-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#112447]/65 text-white border border-white/15 hover:bg-[#1A3668] backdrop-blur-xs transition-colors"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={goToNextSlide}
                  aria-label="العرض التالي"
                  className="absolute top-1/2 left-2 sm:left-3 -translate-y-1/2 z-10 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#112447]/65 text-white border border-white/15 hover:bg-[#1A3668] backdrop-blur-xs transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </motion.div>

        {/* Carousel Indicator Dots */}
        {totalSlides > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-3" role="tablist" aria-label="الشرائح المميزة">
            {carouselItems.map((item, idx) => {
              const isCurrent = idx === safeSlideIndex;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={isCurrent}
                  aria-label={`عرض الشريحة ${idx + 1}`}
                  onClick={() => goToSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    isCurrent ? 'w-6 bg-[#1A3668]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Greeting + Title + Brand Lockup Strip (matching screenshot middle block) */}
      <section className="space-y-3 pt-1">
        <div className="flex flex-col items-start space-y-2">
          <span className="inline-block rounded-lg bg-[#1A3668]/8 px-3 py-1 text-xs font-semibold text-[#1A3668]">
            {firstName ? `مرحبًا، ${firstName}` : 'مرحبًا بك في TOP CODES'}
          </span>

          <h1 className="font-display text-2xl sm:text-4xl font-extrabold text-[#0F172A] leading-tight">
            أفضل عروض اليوم لك
          </h1>

          <div className="inline-flex items-center gap-3 rounded-xl bg-[#112447] px-4 py-2 text-white shadow-2xs">
            <span className="rounded-md bg-white px-2.5 py-0.5 text-xs font-bold text-[#112447]">
              أكواد وعروض
            </span>
            <span className="font-display text-sm font-bold tracking-[0.25em] text-[#DFC389]">
              SHEIN
            </span>
          </div>
        </div>
      </section>

      {/* 4. Filter Tabs & Coupons Feed ("كل العروض") */}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#C5A059]/15 text-[#C5A059]">
              <Flame className="h-4 w-4 fill-[#C5A059]/30" aria-hidden="true" />
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0F172A]">
              كل العروض
            </h2>
          </div>

          <Link
            to="/coupons"
            className="text-xs sm:text-sm font-semibold text-[#1A3668] hover:text-[#C5A059] transition-colors whitespace-nowrap"
          >
            عرض الكل
          </Link>
        </div>

        {/* Horizontal Filter Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2" role="tablist" aria-label="تصفية عروض شي إن">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[42px] ${
              activeFilter === 'all'
                ? 'bg-[#1A3668] text-white shadow-sm'
                : 'bg-white border border-[#E5E8EF] text-slate-700 hover:border-[#1A3668]/40'
            }`}
          >
            {activeFilter === 'all' && (
              <span className="h-2 w-2 rounded-full bg-[#C5A059]" aria-hidden="true" />
            )}
            <span>الكل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('featured')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[42px] ${
              activeFilter === 'featured'
                ? 'bg-[#1A3668] text-white shadow-sm'
                : 'bg-white border border-[#E5E8EF] text-slate-700 hover:border-[#1A3668]/40'
            }`}
          >
            <span>VIP مميز</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('high_discount')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[42px] ${
              activeFilter === 'high_discount'
                ? 'bg-[#1A3668] text-white shadow-sm'
                : 'bg-white border border-[#E5E8EF] text-slate-700 hover:border-[#1A3668]/40'
            }`}
          >
            <span>خصم قوي (+20%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('popular')}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[42px] ${
              activeFilter === 'popular'
                ? 'bg-[#1A3668] text-white shadow-sm'
                : 'bg-white border border-[#E5E8EF] text-slate-700 hover:border-[#1A3668]/40'
            }`}
          >
            <span>الأكثر استخدامًا</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveFilter(cat.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors min-h-[42px] ${
                activeFilter === cat.id
                  ? 'bg-[#1A3668] text-white shadow-sm'
                  : 'bg-white border border-[#E5E8EF] text-slate-700 hover:border-[#1A3668]/40'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Coupons Feed Grid */}
        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-3xl border border-[#E5E8EF] bg-white p-6 animate-pulse"
              />
            ))}
          </div>
        ) : filteredCoupons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCoupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-[#E5E8EF] bg-white p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              لا توجد كوبونات شي إن مطابقة للتصفية الحالية.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="inline-flex rounded-xl bg-[#1A3668] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#112447]"
            >
              عرض جميع كوبونات شي إن
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
