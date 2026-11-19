import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CouponCard } from '../components/CouponCard';
import { formatNumberAr, isCouponValidNow, isSheinStore } from '../lib/couponUtils';

type SortOption = 'newest' | 'popular' | 'discount';

export function CouponsPage() {
  const { coupons, categories, dataLoading, dataError, refreshPublicData } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category') || 'all');
  const [minDiscount, setMinDiscount] = useState<number>(() => Number(searchParams.get('minDiscount') || 0));
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const param = searchParams.get('sort');
    if (param === 'popular' || param === 'discount') return param;
    return 'newest';
  });

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (!v || v === 'all' || v === '0') {
        next.delete(k);
      } else {
        next.set(k, v);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const resetFilters = () => {
    setQuery('');
    setSelectedCategory('all');
    setMinDiscount(0);
    setSortBy('newest');
    setSearchParams({}, { replace: true });
  };

  const filteredCoupons = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = coupons.filter((coupon) => {
      if (!isSheinStore(coupon.store) || !isCouponValidNow(coupon)) {
        return false;
      }
      if (selectedCategory !== 'all' && coupon.category_id !== selectedCategory) {
        return false;
      }
      if (minDiscount > 0 && coupon.discount_percent < minDiscount) {
        return false;
      }
      if (q) {
        const haystack = [
          coupon.code,
          coupon.title,
          coupon.description || '',
          coupon.store?.name || 'SHEIN',
          coupon.category?.name || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'popular') {
        return b.usage_count - a.usage_count;
      }
      if (sortBy === 'discount') {
        return b.discount_percent - a.discount_percent;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [coupons, query, selectedCategory, minDiscount, sortBy]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E8EF] pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#1A3668]">جميع كوبونات شي إن (SHEIN)</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            تصفح وفلتر جميع أكواد خصم شي إن الحصرية حسب القسم أو نسبة الخصم.
          </p>
        </div>
        <div className="text-sm text-slate-500 tabular-nums">
          النتائج المعروضة: <span className="font-semibold text-[#1A3668]">{formatNumberAr(filteredCoupons.length)}</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="rounded-2xl border border-[#E5E8EF] bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Instant Search */}
          <div className="md:col-span-6 relative">
            <label htmlFor="coupons-search" className="sr-only">
              البحث الفوري
            </label>
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              id="coupons-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                updateParams({ q: e.target.value });
              }}
              placeholder="ابحث عن كود شي إن، تصنيف، أو وصف العرض..."
              className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] pr-10 pl-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1A3668] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <label htmlFor="category-filter" className="sr-only">
              فلترة حسب التصنيف
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                updateParams({ category: e.target.value });
              }}
              className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#1A3668] focus:bg-white focus:outline-none"
            >
              <option value="all">كل أقسام شي إن</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Discount Percentage Filter */}
          <div className="md:col-span-3">
            <label htmlFor="discount-filter" className="sr-only">
              فلترة حسب نسبة الخصم
            </label>
            <select
              id="discount-filter"
              value={minDiscount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinDiscount(val);
                updateParams({ minDiscount: String(val) });
              }}
              className="w-full rounded-xl border border-[#E5E8EF] bg-[#F7F8FA] px-3.5 py-2.5 text-sm text-slate-800 focus:border-[#1A3668] focus:bg-white focus:outline-none"
            >
              <option value={0}>كل نسب الخصم</option>
              <option value={10}>10% فأعلى</option>
              <option value={20}>20% فأعلى</option>
              <option value={30}>30% فأعلى</option>
              <option value={50}>50% فأعلى</option>
            </select>
          </div>
        </div>

        {/* Sort Segmented Controls & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#E5E8EF]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 ml-2">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              الترتيب:
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-[#F7F8FA] p-1 border border-[#E5E8EF]">
              <button
                type="button"
                onClick={() => {
                  setSortBy('newest');
                  updateParams({ sort: 'newest' });
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  sortBy === 'newest'
                    ? 'bg-[#1A3668] text-white'
                    : 'text-slate-600 hover:text-[#1A3668]'
                }`}
              >
                الأحدث
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortBy('popular');
                  updateParams({ sort: 'popular' });
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  sortBy === 'popular'
                    ? 'bg-[#1A3668] text-white'
                    : 'text-slate-600 hover:text-[#1A3668]'
                }`}
              >
                الأكثر استخدامًا
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortBy('discount');
                  updateParams({ sort: 'discount' });
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  sortBy === 'discount'
                    ? 'bg-[#1A3668] text-white'
                    : 'text-slate-600 hover:text-[#1A3668]'
                }`}
              >
                أعلى خصم
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#1A3668] transition-colors whitespace-nowrap"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>إعادة تعيين</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Grid / Error / Empty State */}
      {dataError ? (
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-red-700">تعذر تحميل العروض حاليًا، يرجى المحاولة مرة أخرى.</p>
          <button
            type="button"
            onClick={() => void refreshPublicData()}
            className="rounded-lg bg-[#1A3668] px-4 py-2 text-xs font-semibold text-white hover:bg-[#112447]"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : dataLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-56 rounded-2xl border border-[#E5E8EF] bg-white animate-pulse" />
          ))}
        </div>
      ) : filteredCoupons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E8EF] bg-white p-12 text-center space-y-4">
          <h2 className="font-display text-xl font-bold text-[#1A3668]">
            لم يتم العثور على كوبونات مطابقة
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            جرّب تغيير معايير البحث أو إزالة الفلاتر الحالية لاستعراض الكوبونات المتاحة.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg bg-[#1A3668] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#112447]"
            >
              عرض كل الكوبونات
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
