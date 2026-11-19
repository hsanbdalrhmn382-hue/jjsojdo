import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, User as UserIcon } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function Navbar() {
  const { user, profile } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 pb-1 border-b-2 ${
      isActive
        ? 'text-[#1A3668] border-[#C5A059]'
        : 'text-slate-600 border-transparent hover:text-[#1A3668]'
    }`;

  return (
    <header className="hidden md:block md:sticky md:top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E8EF]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 md:h-16 items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded-md"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="28" height="28" rx="7" fill="#1A3668" />
              <path
                d="M8 9.5H20M14 9.5V19.5"
                stroke="#C5A059"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="19.5" cy="18.5" r="2" fill="#FFFFFF" />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight text-[#1A3668] whitespace-nowrap">
              TOP CODES <span className="text-[#C5A059] font-normal mx-1">|</span> توب كود
            </span>
          </Link>

          {/* Zone 2: Concise Single-Line Consumer Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="التنقل الرئيسي">
            <NavLink to="/" end className={navLinkClass}>
              الرئيسية
            </NavLink>
            <NavLink to="/coupons" className={navLinkClass}>
              جميع الكوبونات
            </NavLink>
            <NavLink to="/favorites" className={navLinkClass}>
              المفضلة
            </NavLink>
          </nav>

          {/* Zone 3: Single Primary Account Action */}
          <div className="hidden md:flex items-center shrink-0">
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-lg bg-[#1A3668] px-4 py-2 text-xs font-semibold text-white hover:bg-[#112447] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
            >
              <UserIcon className="h-3.5 w-3.5 text-[#C5A059]" aria-hidden="true" />
              <span className="max-w-[120px] truncate">
                {user ? profile?.full_name || 'حسابي' : 'حسابي'}
              </span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2.5 text-slate-700 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E5E8EF] bg-white px-4 py-4 space-y-2">
          <NavLink
            to="/"
            end
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#F7F8FA] hover:text-[#1A3668]"
          >
            الرئيسية
          </NavLink>
          <NavLink
            to="/coupons"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#F7F8FA] hover:text-[#1A3668]"
          >
            جميع الكوبونات
          </NavLink>
          <NavLink
            to="/favorites"
            onClick={() => setMobileOpen(false)}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-[#F7F8FA] hover:text-[#1A3668]"
          >
            المفضلة
          </NavLink>
          <div className="pt-2 border-t border-[#E5E8EF]">
            <Link
              to="/account"
              onClick={() => setMobileOpen(false)}
              className="block w-full rounded-lg bg-[#1A3668] px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              {user ? profile?.full_name || 'حسابي' : 'حسابي وتسجيل الدخول'}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
