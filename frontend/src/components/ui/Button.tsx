import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 disabled:opacity-40 disabled:pointer-events-none select-none cursor-pointer';

    const variants = {
      // Crisp monochrome primary (#111827 / #FAFAFA)
      primary:
        'bg-[#111827] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A] hover:bg-[#1F2937] dark:hover:bg-[#E5E5E5] active:scale-[0.99] shadow-xs',
      // Purposeful violet accent
      accent:
        'bg-[#7C3AED] dark:bg-[#8B5CF6] text-white hover:bg-[#6D28D9] dark:hover:bg-[#7C3AED] active:scale-[0.99] shadow-xs',
      // Clean secondary surface
      secondary:
        'bg-[#FAFAFA] dark:bg-[#111111] text-[#111827] dark:text-[#FAFAFA] border border-[#E5E7EB] dark:border-[#222222] hover:bg-[#F3F4F6] dark:hover:bg-[#181818] hover:border-[#D1D5DB] dark:hover:border-[#333333]',
      // Subtle outline
      outline:
        'border border-[#E5E7EB] dark:border-[#222222] text-[#4B5563] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F9FAFB] dark:hover:bg-[#111111]',
      // Ghost
      ghost:
        'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#FAFAFA] hover:bg-[#F3F4F6] dark:hover:bg-[#111111]',
      // Danger
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-6 py-2.5 gap-2.5 h-11',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
