import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Service Unavailable',
  message,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 p-6 text-center text-rose-600 dark:text-rose-300',
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3 border border-rose-500/20">
        <AlertCircle className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-rose-900 dark:text-rose-200">{title}</h3>
      <p className="mt-1 max-w-md text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-1.5 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      )}
    </div>
  );
};
