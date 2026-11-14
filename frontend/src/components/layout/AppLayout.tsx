import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('maximus_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('maximus_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="flex min-h-screen bg-white dark:bg-black text-[#111827] dark:text-[#FAFAFA] antialiased">
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
      <div className="flex flex-1 flex-col min-w-0">
        <Topbar onMenuToggle={() => setMobileMenuOpen(true)} />

        <main className="flex-1 w-full px-5 sm:px-8 md:px-10 lg:px-12 py-6 md:py-8 bg-white dark:bg-black">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
