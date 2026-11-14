import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Sparkles } from 'lucide-react';
import { navItems } from './Sidebar';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative flex w-68 max-w-[80vw] flex-1 flex-col bg-[#FAFAFA] dark:bg-[#050505] border-r border-[#E5E7EB] dark:border-[#222222] p-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#222222]">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#111827] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A]">
              <span className="font-mono font-bold text-xs">M</span>
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#111827] dark:text-[#FAFAFA]">
              Maximus
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-3 flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    isActive
                      ? 'bg-[#F3F4F6] dark:bg-[#161616] text-[#111827] dark:text-[#FAFAFA] font-medium'
                      : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#0E0E0E]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        isActive
                          ? 'text-[#7C3AED] dark:text-[#8B5CF6]'
                          : 'text-[#9CA3AF] dark:text-[#666666]'
                      )}
                    />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#222222] space-y-3">
          <NavLink
            to="/onboarding"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] dark:border-[#222222] bg-white dark:bg-[#101010] p-2.5 text-xs font-medium text-[#111827] dark:text-[#FAFAFA]"
          >
            <Sparkles className="h-4 w-4 text-[#7C3AED] dark:text-[#8B5CF6]" />
            <span>Career Onboarding</span>
          </NavLink>

          <div className="flex justify-center pt-1">
            <ThemeToggle variant="segmented" />
          </div>
        </div>
      </div>
    </div>
  );
};
