'use client';

import React, { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, X } from 'lucide-react';

const BACKUP_KEYS = [
  { key: 'bhand_hawkers', label: 'Hawkers' },
  { key: 'bhand_billing', label: 'Billing Records' },
  { key: 'bhand_monthly', label: 'Monthly Tracker' },
  { key: 'bhand_newspaper_rates', label: 'Newspaper Rates' },
  { key: 'bhand_newspaper_groups', label: 'Newspaper Groups' },
];

interface BackupData {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  type: ToastType;
  message: string;
}

export default function BackupRestore() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<BackupData | null>(null);

  function showToast(type: ToastType, message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  function handleDownload() {
    const backup: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {},
    };

    let count = 0;
    for (const { key, label } of BACKUP_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          backup.data[key] = JSON.parse(raw);
          count++;
        } catch {
          backup.data[key] = raw;
          count++;
        }
      }
    }

    if (count === 0) {
      showToast('error', 'No data found in localStorage to backup.');
      return;
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `bhandnews-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('success', `Backup downloaded — ${count} data set${count !== 1 ? 's' : ''} saved.`);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as BackupData;
        if (!parsed.version || !parsed.data || typeof parsed.data !== 'object') {
          showToast('error', 'Invalid backup file format.');
          return;
        }
        setRestoreConfirm(parsed);
      } catch {
        showToast('error', 'Could not read the file. Make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
  }

  function handleRestoreConfirm() {
    if (!restoreConfirm) return;
    let count = 0;
    for (const { key } of BACKUP_KEYS) {
      if (restoreConfirm.data[key] !== undefined) {
        localStorage.setItem(key, JSON.stringify(restoreConfirm.data[key]));
        count++;
      }
    }
    setRestoreConfirm(null);
    showToast('success', `Restore complete — ${count} data set${count !== 1 ? 's' : ''} loaded. Refresh the page to see updated data.`);
  }

  const exportedDate = restoreConfirm
    ? new Date(restoreConfirm.exportedAt).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const restoredKeys = restoreConfirm
    ? BACKUP_KEYS.filter((b) => restoreConfirm.data[b.key] !== undefined)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Backup &amp; Restore</h2>
        <p className="text-sm text-slate-500 mt-1">
          Download all your data as a local JSON file, or restore from a previous backup.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Download Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Download size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Download Backup</h3>
              <p className="text-xs text-slate-500">Save all data to your device</p>
            </div>
          </div>

          <ul className="space-y-1.5">
            {BACKUP_KEYS.map(({ key, label }) => {
              const exists = typeof window !== 'undefined' && !!localStorage.getItem(key);
              return (
                <li key={key} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${exists ? 'bg-green-400' : 'bg-slate-300'}`} />
                  {label}
                  {!exists && <span className="text-xs text-slate-400">(empty)</span>}
                </li>
              );
            })}
          </ul>

          <button
            onClick={handleDownload}
            className="mt-auto w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            <Download size={16} />
            Download Backup File
          </button>
        </div>

        {/* Restore Backup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Upload size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Restore Backup</h3>
              <p className="text-xs text-slate-500">Load data from a backup file</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl py-8 gap-3 bg-slate-50">
            <Upload size={28} className="text-slate-300" />
            <p className="text-sm text-slate-500 text-center px-4">
              Select a <span className="font-medium text-slate-700">.json</span> backup file to restore your data
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 px-5 rounded-xl transition-colors"
            >
              <Upload size={15} />
              Choose File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Restoring will overwrite existing data for the keys present in the backup file.
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <ShieldCheck size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-500">
          Backups include: <span className="font-medium text-slate-700">Hawkers, Billing Records, Monthly Tracker, Newspaper Rates, and Newspaper Groups</span>. Auth session is excluded. Store your backup file safely — it contains all agency data.
        </p>
      </div>

      {/* Restore Confirmation Modal */}
      {restoreConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Confirm Restore</h3>
              <button onClick={() => setRestoreConfirm(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              This backup was exported on <span className="font-semibold text-slate-800">{exportedDate}</span>.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Data sets to restore</p>
              {restoredKeys.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={14} className="text-green-500" />
                  {label}
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                This will overwrite your current data for the above sets. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setRestoreConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Yes, Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success' ?'bg-green-600 text-white'
              : toast.type === 'error' ?'bg-red-600 text-white' :'bg-slate-800 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
