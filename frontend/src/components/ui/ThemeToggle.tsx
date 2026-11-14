import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export interface ThemeToggleProps {
  className?: string;
  variant?: 'compact' | 'segmented';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  variant = 'compact',
}) => {
  const { theme, setTheme } = useTheme();

  if (variant === 'segmented') {
    const options: { id: Theme; label: string; icon: typeof Sun }[] = [
      { id: 'light', label: 'Light', icon: Sun },
      { id: 'dark', label: 'Dark', icon: Moon },
      { id: 'system', label: 'System', icon: Monitor },
    ];

    return (
      <div
        role="group"
        aria-label="Theme selector"
        className={cn(
          'inline-flex items-center rounded-lg border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#101010] p-0.5',
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              aria-pressed={isSelected}
              title={`Switch to ${opt.label} mode`}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors duration-150 cursor-pointer',
                isSelected
                  ? 'bg-white dark:bg-[#202020] text-[#171717] dark:text-[#FAFAFA] shadow-xs'
                  : 'text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact cycle button
  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  return (
    <button
      onClick={cycleTheme}
      title={`Current: ${theme}. Click to switch theme.`}
      aria-label={`Toggle theme, current is ${theme}`}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#F7F7F7] dark:bg-[#101010] text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-[#FAFAFA] hover:border-[#D4D4D4] dark:hover:border-[#333333] transition-colors duration-150 cursor-pointer',
        className
      )}
    >
      {theme === 'dark' && <Moon className="h-3.5 w-3.5" />}
      {theme === 'light' && <Sun className="h-3.5 w-3.5" />}
      {theme === 'system' && <Monitor className="h-3.5 w-3.5" />}
    </button>
  );
};
