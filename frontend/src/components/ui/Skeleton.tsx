import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Skeleton: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn('animate-pulse rounded bg-[#EFEFEF] dark:bg-[#1A1A1A]', className)}
      {...props}
    />
  );
};
