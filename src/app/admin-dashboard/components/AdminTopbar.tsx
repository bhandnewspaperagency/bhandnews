'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw, Bell, Search, Printer } from 'lucide-react';
import { toast } from 'sonner';

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  billing: 'Daily Billing Entry',
  hawkers: 'Hawker Registry',
  monthly: 'Monthly Tracker',
  reports: 'Reports & Analytics',
  settings: 'Settings',
};

interface AdminTopbarProps {
  activeSection: string;
}

export default function AdminTopbar({ activeSection }: AdminTopbarProps) {
  const [syncing, setSyncing] = useState(false);
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const d = new Date(2026, 3, 23);
    setDateStr(d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    // TODO: Backend — POST /api/google-sheets/sync to trigger bidirectional sync
    await new Promise((r) => setTimeout(r, 1800));
    setSyncing(false);
    toast.success('Google Sheets synced — 180 records updated successfully.');
  };

  const handlePrint = () => {
    // TODO: Backend — GET /api/reports/print-preview to generate printable PDF
    toast.info('Opening print preview…');
    window.print();
  };

  return (
    <header suppressHydrationWarning className="bg-white border-b border-[hsl(220,15%,88%)] px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{SECTION_LABELS[activeSection] || 'Dashboard'}</h1>
        <p className="text-xs text-slate-400">{dateStr}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
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
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Sync with Google Sheets"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{syncing ? 'Syncing…' : 'Sync Sheets'}</span>
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
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