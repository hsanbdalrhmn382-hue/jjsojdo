import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[#E5E8EF] bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-[#E5E8EF]">
          <div>
            <div className="font-display text-lg font-bold text-[#1A3668]">
              TOP CODES <span className="text-[#C5A059] mx-1">|</span> توب كود
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-sm">
              منصة كوبونات وأكواد خصم شي إن (SHEIN) المعتمدة التابعة لعلامة TOP STORE.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1A3668] mb-3">التصفح السريع</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li>
                <Link to="/coupons" className="hover:text-[#1A3668] transition-colors">
                  تصفح جميع كوبونات شي إن
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="hover:text-[#1A3668] transition-colors">
                  الكوبونات المفضلة
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1A3668] mb-3">حساب العميل</h3>
            <ul className="space-y-2.5 text-sm text-slate-600">
              <li>
                <Link to="/account" className="hover:text-[#1A3668] transition-colors">
                  حسابي والمفضلة
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-[#1A3668] transition-colors">
                  أفضل عروض اليوم
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TOP STORE — TOP CODES. جميع الحقوق محفوظة.</p>
          <p>أكواد خصم مختبرة ومحدثة يوميًا لمتسوقي شي إن</p>
        </div>
      </div>
    </footer>
  );
}
