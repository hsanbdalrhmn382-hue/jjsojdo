import { NavLink } from 'react-router-dom';
import { Home, LayoutGrid, Heart, User as UserIcon } from 'lucide-react';

export function MobileBottomNav() {
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-2xl transition-colors min-h-[44px] ${
      isActive
        ? 'bg-[#1A3668]/8 text-[#1A3668] font-bold'
        : 'text-slate-500 hover:text-[#1A3668]'
    }`;

  return (
    <nav
      aria-label="التنقل السريع للجوال"
      className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-3xl border border-[#E5E8EF] bg-white/95 backdrop-blur-md shadow-lg shadow-[#1A3668]/10 px-2 py-1.5"
    >
      <div className="grid grid-cols-4 items-center gap-1">
        <NavLink to="/" end className={itemClass}>
          <Home className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] leading-none whitespace-nowrap">الرئيسية</span>
        </NavLink>

        <NavLink to="/coupons" className={itemClass}>
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] leading-none whitespace-nowrap">تصفح</span>
        </NavLink>

        <NavLink to="/favorites" className={itemClass}>
          <Heart className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] leading-none whitespace-nowrap">المفضلة</span>
        </NavLink>

        <NavLink to="/account" className={itemClass}>
          <UserIcon className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] leading-none whitespace-nowrap">حسابي</span>
        </NavLink>
      </div>
    </nav>
  );
}
