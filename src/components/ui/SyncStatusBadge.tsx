'use client';

import React, { useState, useEffect } from 'react';
import { CloudOff, Loader2, CheckCircle2 } from 'lucide-react';

export type SyncStatus = 'syncing' | 'synced' | 'error' | 'idle';

export const SYNC_EVENT = 'supabase-sync-status';

export function emitSyncStatus(status: SyncStatus) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { status } }));
  }
}

export default function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>;

    const handler = (e: Event) => {
      const { status: s } = (e as CustomEvent<{ status: SyncStatus }>).detail;
      setStatus(s);
      setVisible(true);
      clearTimeout(hideTimer);
      // Auto-hide "synced" badge after 3 seconds
      if (s === 'synced') {
        hideTimer = setTimeout(() => setVisible(false), 3000);
      }
    };

    window.addEventListener(SYNC_EVENT, handler);
    return () => {
      window.removeEventListener(SYNC_EVENT, handler);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  if (status === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-medium flex-shrink-0 animate-fade-in">
        <Loader2 size={11} className="animate-spin" />
        <span className="hidden sm:inline">Syncing…</span>
      </div>
    );
  }

  if (status === 'synced') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200 text-green-600 text-xs font-medium flex-shrink-0">
        <CheckCircle2 size={11} />
        <span className="hidden sm:inline">Synced</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex-shrink-0">
        <CloudOff size={11} />
        <span className="hidden sm:inline">Sync Error</span>
      </div>
    );
  }

  return null;
}
