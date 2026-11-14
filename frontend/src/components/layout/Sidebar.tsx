import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Terminal,
  Compass,
  BookOpen,
  Briefcase,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Skill DNA', href: '/skills', icon: Layers },
  { name: 'Skill Arena', href: '/arena', icon: Terminal },
  { name: 'Career Navigator', href: '/career', icon: Compass },
  { name: 'Learning Hub', href: '/learning', icon: BookOpen },
  { name: 'Live Job Explorer', href: '/jobs', icon: Briefcase },
  { name: 'AI Mentor', href: '/mentor', icon: Bot },
];

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#050505] transition-all duration-200 select-none z-20 shrink-0',
        collapsed ? 'w-16' : 'w-[240px]'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#E5E7EB] dark:border-[#222222]">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-3 focus-visible:outline-none overflow-hidden"
          title="Maximus Home"
        >
          {/* Refined Geometric Monogram */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#111827] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A] shadow-xs">
            <span className="font-semibold text-xs tracking-tight">M</span>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-base tracking-tight text-[#111827] dark:text-[#FAFAFA]">
                Maximus
              </span>
            </div>
          )}
        </NavLink>

        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#161616] transition-colors cursor-pointer"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 pt-2 pb-1.5 text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#666666]">
            Platform
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-150 relative group',
                  collapsed ? 'justify-center px-2' : 'px-3',
                  isActive
                    ? 'bg-[#F3F4F6] dark:bg-[#151515] text-[#111827] dark:text-[#FAFAFA]'
                    : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#0E0E0E]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isActive
                        ? 'text-[#7C3AED] dark:text-[#8B5CF6]'
                        : 'text-[#9CA3AF] dark:text-[#666666] group-hover:text-[#111827] dark:group-hover:text-[#FAFAFA]'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r bg-[#7C3AED] dark:bg-[#8B5CF6]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-3 border-t border-[#E5E7EB] dark:border-[#222222] space-y-2">
        {/* Onboarding / Career Setup Shortcut */}
        <NavLink
          to="/onboarding"
          title={collapsed ? 'Target Calibration' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-lg p-2.5 text-xs text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#0E0E0E] transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[#7C3AED] dark:text-[#8B5CF6]" />
          {!collapsed && <span className="font-medium truncate">Career Onboarding</span>}
        </NavLink>

        {/* Theme and Collapse Controls */}
        <div
          className={cn(
            'flex items-center pt-1',
            collapsed ? 'flex-col gap-2' : 'justify-between px-1'
          )}
        >
          <ThemeToggle variant={collapsed ? 'compact' : 'segmented'} />

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#101010] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
