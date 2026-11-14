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
        'hidden lg:flex flex-col border-r border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#050505] transition-all duration-200 select-none z-20 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-[#E5E5E5] dark:border-[#222222]">
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2.5 focus-visible:outline-none overflow-hidden"
          title="Maximus Home"
        >
          {/* Refined Geometric Emblem */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-[#171717] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A]">
            <span className="font-mono font-bold text-xs tracking-tighter">M</span>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#FAFAFA]">
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
            className="flex h-7 w-7 items-center justify-center rounded text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA] hover:bg-[#EFEFEF] dark:hover:bg-[#161616] transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {!collapsed && (
          <div className="px-2.5 pt-2 pb-1 text-[11px] font-mono uppercase tracking-wider text-[#8C8C8C] dark:text-[#555555]">
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
                  'flex items-center gap-3 rounded-md py-2 text-xs font-medium transition-colors duration-150 relative group',
                  collapsed ? 'justify-center px-2' : 'px-2.5',
                  isActive
                    ? 'bg-[#EFEFEF] dark:bg-[#151515] text-[#171717] dark:text-[#FAFAFA] font-medium'
                    : 'text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA] hover:bg-[#F2F2F2] dark:hover:bg-[#0E0E0E]'
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
                        : 'text-[#8C8C8C] dark:text-[#666666] group-hover:text-[#171717] dark:group-hover:text-[#FAFAFA]'
                    )}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                  {/* Subtle active left bar indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r bg-[#7C3AED] dark:bg-[#8B5CF6]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-2 border-t border-[#E5E5E5] dark:border-[#222222] space-y-1">
        {/* Onboarding / Career Setup Shortcut */}
        <NavLink
          to="/onboarding"
          title={collapsed ? 'Target Setup' : undefined}
          className={cn(
            'flex items-center gap-2 rounded-md p-2 text-xs text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA] hover:bg-[#F2F2F2] dark:hover:bg-[#0E0E0E] transition-colors',
            collapsed ? 'justify-center' : ''
          )}
        >
          <Sparkles className="h-4 w-4 shrink-0 text-[#7C3AED] dark:text-[#8B5CF6]" />
          {!collapsed && <span className="truncate">Career Onboarding</span>}
        </NavLink>

        {/* Theme and Collapse Controls */}
        <div
          className={cn(
            'flex items-center pt-1',
            collapsed ? 'flex-col gap-2' : 'justify-between px-2'
          )}
        >
          <ThemeToggle variant={collapsed ? 'compact' : 'segmented'} />

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#101010] text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA]"
            >
              <PanelLeftOpen className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
