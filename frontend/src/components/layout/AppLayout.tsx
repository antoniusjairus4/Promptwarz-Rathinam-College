import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, navItems } from './Sidebar';
import { useLearner } from '@/context/LearnerContext';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { isRestoring, restorationError, refreshLearner } = useLearner();
  useEffect(() => {
    document.title = `${navItems.find(item => item.href === pathname)?.name || 'Career Onboarding'} — Maximus`;
    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [pathname]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('maximus_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('maximus_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-[#111827] dark:text-[#FAFAFA] antialiased">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-white focus:text-black focus:p-4">Skip to main content</a>
      {/* Desktop Sidebar (240px expanded / 64px collapsed) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {/* Mobile Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area with generous responsive layout */}
      <div id="application-content" className="flex flex-1 flex-col min-w-0">
        <Topbar onMenuToggle={() => setMobileMenuOpen(true)} />

        <main id="main-content" tabIndex={-1} className="flex-1 w-full px-5 sm:px-8 md:px-10 lg:px-12 py-6 md:py-8 bg-white dark:bg-black">
          {isRestoring && <p role="status" className="mb-4 text-sm">Restoring your saved learner session…</p>}
          {restorationError && <div role="alert" className="mb-4 rounded-lg border border-amber-500 p-3 text-sm">Session restoration failed: {restorationError} Your saved session credentials were retained. <button className="underline font-medium" onClick={() => { void refreshLearner(); }}>Retry session restoration</button></div>}
          <Outlet />
        </main>
      </div>
    </div>
  );
};
