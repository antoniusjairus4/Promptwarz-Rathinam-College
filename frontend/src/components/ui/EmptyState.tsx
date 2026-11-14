import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  children?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-10 text-center',
        className
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#111111] text-[#666666] dark:text-[#A3A3A3] mb-4 shadow-xs">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-[#737373] dark:text-[#A3A3A3] leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="md" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
