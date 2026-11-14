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
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[#E5E5E5] dark:border-[#222222] bg-white/90 dark:bg-black/90 px-4 md:px-6 backdrop-blur-xs select-none">
      {/* Left: Mobile trigger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#666666] dark:text-[#A3A3A3] hover:text-[#171717] dark:hover:text-white lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Mobile Brand */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-[#171717] dark:bg-[#FAFAFA] text-white dark:text-[#0A0A0A]">
            <span className="font-mono font-bold text-xs">M</span>
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#171717] dark:text-[#FAFAFA]">
            Maximus
          </span>
        </div>

        {/* Desktop Tagline subtitle */}
        <p className="hidden md:block text-xs text-[#8C8C8C] dark:text-[#666666] font-mono">
          Discover what you know. Prove what you can do. Build what comes next.
        </p>
      </div>

      {/* Right: Service Status & Theme Toggle */}
      <div className="flex items-center gap-2.5">
        {/* Backend Connectivity Status */}
        <div
          title={
            lastChecked
              ? `Backend status: ${healthStatus} (Last checked ${lastChecked})`
              : `Backend status: ${healthStatus}`
          }
          className="flex items-center gap-2 rounded border border-[#E5E5E5] dark:border-[#222222] bg-[#FAFAFA] dark:bg-[#0A0A0A] px-2.5 py-1 text-xs"
        >
          <Activity className="h-3 w-3 text-[#8C8C8C] dark:text-[#666666]" />

          {healthStatus === 'checking' && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              checking
            </span>
          )}

          {healthStatus === 'healthy' && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              api online
            </span>
          )}

          {healthStatus === 'offline' && (
            <span className="flex items-center gap-1.5 text-[#8C8C8C] dark:text-[#555555] font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8C8C8C] dark:bg-[#555555]"></span>
              api standby
            </span>
          )}

          <button
            onClick={checkHealth}
            title="Refresh status"
            className="text-[#8C8C8C] dark:text-[#555555] hover:text-[#171717] dark:hover:text-[#FAFAFA] ml-0.5 transition-colors"
          >
            <RefreshCw className="h-2.5 w-2.5" />
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
