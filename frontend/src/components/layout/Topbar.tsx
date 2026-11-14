import React, { useEffect, useState } from 'react';
import { Menu, Activity, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export interface TopbarProps {
  onMenuToggle: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuToggle }) => {
  const [healthStatus, setHealthStatus] = useState<'checking' | 'healthy' | 'offline'>('checking');
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkHealth = async () => {
    setHealthStatus('checking');
    try {
      const res = await api.getHealth();
      if (res.status === 'ok' || res.status === 'healthy') {
        setHealthStatus('healthy');
      } else {
        setHealthStatus('offline');
      }
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealthStatus('offline');
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-[#E5E7EB] dark:border-[#222222] bg-white/95 dark:bg-black/95 px-5 sm:px-8 md:px-10 lg:px-12 backdrop-blur-xs select-none">
      {/* Left: Mobile trigger & Tagline */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-white lg:hidden cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Mobile Brand */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111827] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A]">
            <span className="font-semibold text-xs">M</span>
          </div>
          <span className="font-semibold text-base tracking-tight text-[#111827] dark:text-[#FAFAFA]">
            Maximus
          </span>
        </div>

        {/* Desktop Tagline subtitle in clean refined typography */}
        <p className="hidden md:block text-xs lg:text-sm text-[#6B7280] dark:text-[#888888] font-normal tracking-normal">
          Discover what you know. Prove what you can do. Build what comes next.
        </p>
      </div>

      {/* Right: Service Status & Theme Toggle */}
      <div className="flex items-center gap-3">
        {/* Backend Connectivity Status */}
        <div
          title={
            lastChecked
              ? `Backend service: ${healthStatus} (checked ${lastChecked})`
              : `Backend service: ${healthStatus}`
          }
          className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] px-3 py-1.5 text-xs"
        >
          <Activity className="h-3.5 w-3.5 text-[#9CA3AF] dark:text-[#666666]" />

          {healthStatus === 'checking' && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              Connecting
            </span>
          )}

          {healthStatus === 'healthy' && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              API Online
            </span>
          )}

          {healthStatus === 'offline' && (
            <span className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#737373] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9CA3AF] dark:bg-[#555555]"></span>
              API Standby
            </span>
          )}

          <button
            onClick={checkHealth}
            title="Refresh connection status"
            className="text-[#9CA3AF] dark:text-[#555555] hover:text-[#111827] dark:hover:text-[#FAFAFA] ml-1 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {/* Mobile Theme Toggle */}
        <div className="lg:hidden">
          <ThemeToggle variant="compact" />
        </div>
      </div>
    </header>
  );
};
