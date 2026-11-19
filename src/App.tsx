/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { AppProvider } from './contexts/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './pages/HomePage';
import { CouponsPage } from './pages/CouponsPage';
import { CouponDetailPage } from './pages/CouponDetailPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#0F172A] pb-20 md:pb-0">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/coupons" element={<CouponsPage />} />
          <Route path="/coupons/:id" element={<CouponDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/auth" element={<Navigate to="/account" replace />} />
          <Route path="/setup" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AppProvider>
            <Routes>
              {/* Private Admin Portal — Completely Isolated from Public Storefront */}
              <Route path="/admin" element={<AdminDashboardPage />} />
              {/* Public Consumer Storefront */}
              <Route path="/*" element={<StorefrontLayout />} />
            </Routes>
          </AppProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
