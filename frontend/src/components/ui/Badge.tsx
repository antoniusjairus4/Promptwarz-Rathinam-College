import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'cyan' | 'success' | 'warning' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const variants = {
    default:
      'bg-[#F9FAFB] dark:bg-[#161616] text-[#4B5563] dark:text-[#A3A3A3] border-[#E5E7EB] dark:border-[#262626]',
    accent:
      'bg-[#7C3AED]/10 dark:bg-[#8B5CF6]/15 text-[#7C3AED] dark:text-[#A78BFA] border-[#7C3AED]/20 dark:border-[#8B5CF6]/30',
    cyan:
      'bg-[#0891B2]/10 dark:bg-[#22D3EE]/15 text-[#0891B2] dark:text-[#22D3EE] border-[#0891B2]/20 dark:border-[#22D3EE]/30',
    success:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    warning:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    outline:
      'border-[#E5E7EB] dark:border-[#222222] text-[#6B7280] dark:text-[#A3A3A3] bg-transparent',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-mono font-medium tracking-tight transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
