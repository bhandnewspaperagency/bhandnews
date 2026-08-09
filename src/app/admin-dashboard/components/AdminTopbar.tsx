'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Bell, Search, Printer, Menu, Wifi, WifiOff, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { getHawkers, getBillingRecords } from '@/lib/cloudStorage';

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  billing: 'Daily Billing Entry',
  hawkers: 'Hawker Registry',
  monthly: 'Monthly Tracker',
  reports: 'Reports & Analytics',
  settings: 'Settings',
  rates: 'Rate Management',
  tracker: 'Tracker',
  groups: 'Newspaper Groups',
  backup: 'Backup & Restore',
};

interface AdminTopbarProps {
  activeSection: string;
  onMenuToggle?: () => void;
}

type ConnectionState = 'online' | 'offline' | 'syncing';

function ConnectionBadge({ state }: { state: ConnectionState }) {
  if (state === 'offline') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex-shrink-0">
        <WifiOff size={12} />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }
  if (state === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium flex-shrink-0">
        <CloudUpload size={12} className="animate-pulse" />
        <span className="hidden sm:inline">Syncing</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-600 text-xs font-medium flex-shrink-0">
      <Wifi size={12} />
      <span className="hidden sm:inline">Online</span>
    </div>
  );
}

export default function AdminTopbar({ activeSection, onMenuToggle }: AdminTopbarProps) {
  const [syncing, setSyncing] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');

  useEffect(() => {
    const d = new Date();
    setDateStr(d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  }, []);

  useEffect(() => {
    // Set initial state
    setConnectionState(navigator.onLine ? 'online' : 'offline');

    const handleOnline = () => {
      setConnectionState('online');
      toast.success('Back online — data will sync automatically.');
    };
    const handleOffline = () => {
      setConnectionState('offline');
      toast.warning('You are offline — changes saved locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setConnectionState('syncing');
    await new Promise((r) => setTimeout(r, 800));
    const [hawkers, billing] = await Promise.all([getHawkers(), getBillingRecords()]);
    setSyncing(false);
    setConnectionState(navigator.onLine ? 'online' : 'offline');
    toast.success(`Data synced — ${hawkers.length} hawkers · ${billing.length} billing records loaded from cloud.`);
  };

  const handlePrint = () => {
    toast.info('Opening print preview…');
    window.print();
  };

  return (
    <header suppressHydrationWarning className="bg-white border-b border-[hsl(220,15%,88%)] px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-9 h-9 rounded-lg border border-[hsl(220,15%,88%)] flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{SECTION_LABELS[activeSection] || 'Dashboard'}</h1>
          <p className="text-xs text-slate-400 hidden sm:block">{dateStr}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Connection State Badge */}
        <ConnectionBadge state={syncing ? 'syncing' : connectionState} />

        {/* Search — hidden on small screens */}
        <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2 w-48 lg:w-64">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search hawkers, bills…"
            className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none w-full"
          />
        </div>

        {/* Sync */}
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Sync with Google Sheets"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync'}</span>
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="hidden sm:flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
          title="Print current view"
        >
          <Printer size={14} />
          <span className="hidden sm:inline">Print</span>
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg border border-[hsl(220,15%,88%)] flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-lg bg-[hsl(210,67%,23%)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          AD
        </div>
      </div>
    </header>
  );
}