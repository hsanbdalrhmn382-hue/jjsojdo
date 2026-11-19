import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { CouponCard } from '../components/CouponCard';
import { formatNumberAr, isCouponValidNow, isSheinStore } from '../lib/couponUtils';

export function FavoritesPage() {
  const { user, coupons, favoriteIds } = useApp();

  const favoriteCoupons = useMemo(
    () =>
      coupons.filter(
        (c) => favoriteIds.has(c.id) && isSheinStore(c.store) && isCouponValidNow(c)
      ),
    [coupons, favoriteIds]
  );

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <div className="rounded-2xl border border-[#E5E8EF] bg-white p-10 text-center space-y-4">
          <Heart className="mx-auto h-10 w-10 text-[#C5A059]" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-[#1A3668]">المفضلة المحفوظة</h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            سجّل الدخول لحفظ كوبونات شي إن المفضلة لديك والوصول إليها من أي جهاز عبر حسابك.
          </p>
          <Link
            to="/account?redirect=/favorites"
            className="inline-flex rounded-xl bg-[#1A3668] px-6 py-3 text-sm font-semibold text-white hover:bg-[#112447] transition-colors"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-end justify-between border-b border-[#E5E8EF] pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#1A3668]">كوبونات شي إن المفضلة</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            أكواد خصم شي إن المحفوظة في حسابك للوصول السريع في أي وقت.
          </p>
        </div>
        <div className="text-sm text-slate-500 tabular-nums">
          المحفوظة: <span className="font-semibold text-[#1A3668]">{formatNumberAr(favoriteCoupons.length)}</span>
        </div>
      </div>

      {favoriteCoupons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteCoupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E8EF] bg-white p-12 text-center space-y-4">
          <Heart className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold text-[#1A3668]">قائمة المفضلة فارغة</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            تصفح الكوبونات واضغط على أيقونة القلب لحفظ الأكواد التي تهمك والعودة إليها بسهولة.
          </p>
          <Link
            to="/coupons"
            className="inline-flex rounded-xl bg-[#1A3668] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#112447]"
          >
            تصفح الكوبونات
          </Link>
        </div>
      )}
    </div>
  );
}
