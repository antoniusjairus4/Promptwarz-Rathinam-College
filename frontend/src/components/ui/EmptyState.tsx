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
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#080808] p-8 text-center',
        className
      )}
    >
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-white dark:bg-[#111111] text-[#666666] dark:text-[#A3A3A3] mb-3">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-[#171717] dark:text-[#FAFAFA]">{title}</h3>
      <p className="mt-1.5 max-w-md text-xs text-[#666666] dark:text-[#A3A3A3] leading-relaxed">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
