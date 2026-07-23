'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Save, X, ChevronLeft, ChevronRight, TrendingUp, IndianRupee, Edit2, Check, Trash2 } from 'lucide-react';
import {
  getAllRates,
  saveRatesForDate,
  deleteRatesForDate,
  getRatesForDate,
  NEWSPAPERS,
} from '@/lib/storage';
import type { NewspaperRateEntry } from '@/lib/storage';

// ─── helpers ────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatWeekRange(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
  return `${monday.toLocaleDateString('en-IN', opts)} – ${sunday.toLocaleDateString('en-IN', opts)}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
interface DeleteRateConfirmModalProps {
  dateLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteRateConfirmModal({ dateLabel, onConfirm, onCancel }: DeleteRateConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Delete Rate Configuration?</h3>
          <p className="text-xs text-slate-500 mt-1">
            This will permanently remove the custom rates for{' '}
            <span className="font-semibold text-red-600">{dateLabel}</span>.
            The system will revert to default rates for that day. This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} />
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function RateManagement() {
  const todayISO = toISO(new Date());

  // week anchor = Monday of the displayed week
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  // editingDay = ISO date string of the day being edited, or null
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});

  // delete confirmation modal state
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);

  // all saved rate records (for lookup)
  const [, setAllRates] = useState<ReturnType<typeof getAllRates>>([]);

  // week dates (Mon…Sun)
  const weekDates: string[] = Array.from({ length: 7 }, (_, i) => toISO(addDays(weekStart, i)));

  const reload = useCallback(() => {
    setAllRates(getAllRates());
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── get effective rate for a newspaper on a date ──────────────────────────
  // (uses saved record for that exact date, or falls back to default)
  const getRateValue = (newspaper: string, dateISO: string): number => {
    const saved = getRatesForDate(dateISO);
    if (saved) {
      const entry = saved.find((r) => r.newspaper === newspaper);
      if (entry) return entry.rate;
    }
    return NEWSPAPERS.find((n) => n.name === newspaper)?.rate ?? 0;
  };

  const hasCustomRates = (dateISO: string): boolean => {
    return !!getRatesForDate(dateISO);
  };

  // ── edit helpers ──────────────────────────────────────────────────────────
  const startEdit = (dateISO: string) => {
    const inputs: Record<string, string> = {};
    NEWSPAPERS.forEach((np) => {
      inputs[np.name] = String(getRateValue(np.name, dateISO));
    });
    setRateInputs(inputs);
    setEditingDay(dateISO);
  };

  const cancelEdit = () => {
    setEditingDay(null);
    setRateInputs({});
  };

  const saveEdit = () => {
    if (!editingDay) return;
    const rates: NewspaperRateEntry[] = NEWSPAPERS.map((np) => ({
      newspaper: np.name,
      rate: parseFloat(rateInputs[np.name] || '0') || 0,
    }));
    if (rates.some((r) => r.rate <= 0)) {
      toast.error('Please enter valid rates for all newspapers.');
      return;
    }
    saveRatesForDate(editingDay, rates);
    reload();
    setEditingDay(null);
    setRateInputs({});
    toast.success(`Rates saved for ${formatShortDate(editingDay)}`);
  };

  const clearDay = (dateISO: string) => {
    deleteRatesForDate(dateISO);
    reload();
    setDeleteConfirmDate(null);
    toast.success(`Custom rates cleared for ${formatShortDate(dateISO)}`);
  };

  // ── week navigation ───────────────────────────────────────────────────────
  const prevWeek = () => setWeekStart((w) => addDays(w, -7));
  const nextWeek = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  const isCurrentWeek = toISO(weekStart) === toISO(getMonday(new Date()));

  // ── day badge ─────────────────────────────────────────────────────────────
  const getDayBadge = (dateISO: string) => {
    if (dateISO === todayISO) return { label: 'Today', cls: 'bg-green-100 text-green-700' };
    if (dateISO > todayISO) return { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700' };
    return null;
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rate Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Set newspaper rates week-by-week — used for accurate supply &amp; return billing
          </p>
        </div>
      </div>

      {/* ── Info Banner ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <TrendingUp size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">How rate-based billing works:</p>
          <ul className="space-y-0.5 text-amber-700 text-xs list-disc list-inside">
            <li><strong>Supply Qty</strong> × rate of the <strong>billing date</strong></li>
            <li><strong>Return Qty</strong> × rate of the <strong>previous day</strong> (when papers were supplied)</li>
            <li>If no custom rate is set, the system uses the default rate for that newspaper</li>
            <li>Example: Lokmat ₹3.5 Mon → ₹4.2 Tue → Thu billing: supply × ₹3.5, return × ₹4.2</li>
          </ul>
        </div>
      </div>

      {/* ── Week Navigator ── */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[hsl(220,15%,88%)] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Previous week"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-slate-800 min-w-[160px] text-center">
              {formatWeekRange(weekStart)}
            </span>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title="Next week"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {!isCurrentWeek && (
            <button
              onClick={goToday}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
            >
              Go to current week
            </button>
          )}
        </div>

        {/* ── Day Columns ── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-[hsl(220,15%,88%)]">
                <th className="table-header text-left w-36 sticky left-0 bg-slate-50 z-10">Newspaper</th>
                {weekDates.map((dateISO, i) => {
                  const badge = getDayBadge(dateISO);
                  const custom = hasCustomRates(dateISO);
                  const isEditing = editingDay === dateISO;
                  return (
                    <th key={dateISO} className={`table-header text-center min-w-[110px] ${isEditing ? 'bg-blue-50' : ''}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs font-bold ${dateISO === todayISO ? 'text-green-700' : 'text-slate-600'}`}>
                          {DAY_NAMES[i]}
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">{formatShortDate(dateISO)}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {badge && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                              {badge.label}
                            </span>
                          )}
                          {custom && !badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              Custom
                            </span>
                          )}
                          {custom && badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {NEWSPAPERS.map((np, npIdx) => (
                <tr
                  key={np.name}
                  className={`border-b border-[hsl(220,15%,93%)] ${npIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  {/* Newspaper name — sticky */}
                  <td className={`table-cell text-sm font-medium text-slate-700 sticky left-0 z-10 ${npIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                    {np.name}
                  </td>

                  {weekDates.map((dateISO) => {
                    const isEditing = editingDay === dateISO;
                    const rate = getRateValue(np.name, dateISO);
                    const isCustom = hasCustomRates(dateISO) && (() => {
                      const saved = getRatesForDate(dateISO);
                      return saved?.some((r) => r.newspaper === np.name && r.rate !== np.rate);
                    })();
                    const inputVal = isEditing ? (rateInputs[np.name] ?? String(rate)) : null;
                    const inputChanged = isEditing && parseFloat(inputVal ?? '0') !== np.rate;

                    return (
                      <td key={dateISO} className={`table-cell text-center ${isEditing ? 'bg-blue-50/60' : ''}`}>
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-0.5">
                            <span className="text-slate-400 text-xs">₹</span>
                            <input
                              type="number"
                              min={0}
                              step={0.10}
                              value={inputVal ?? ''}
                              onChange={(e) =>
                                setRateInputs((prev) => ({ ...prev, [np.name]: e.target.value }))
                              }
                              className={`w-20 text-center input-field text-sm tabular-nums py-1 ${
                                inputChanged ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold' : ''
                              }`}
                            />
                          </div>
                        ) : (
                          <span
                            className={`text-sm tabular-nums font-mono ${
                              isCustom ? 'text-purple-700 font-semibold' : 'text-slate-600'
                            }`}
                          >
                            ₹{rate.toFixed(2)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* ── Action row ── */}
              <tr className="border-t-2 border-[hsl(220,15%,85%)] bg-slate-50">
                <td className="table-cell text-xs text-slate-400 font-medium sticky left-0 bg-slate-50 z-10">Actions</td>
                {weekDates.map((dateISO) => {
                  const isEditing = editingDay === dateISO;
                  const custom = hasCustomRates(dateISO);
                  return (
                    <td key={dateISO} className="table-cell text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={saveEdit}
                            className="p-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                            title="Save rates"
                          >
                            <Check size={13} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 transition-colors"
                            title="Cancel"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => startEdit(dateISO)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit rates for this day"
                          >
                            <Edit2 size={13} />
                          </button>
                          {custom && (
                            <button
                              onClick={() => setDeleteConfirmDate(dateISO)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete custom rates (revert to default)"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Legend ── */}
        <div className="px-5 py-3 border-t border-[hsl(220,15%,88%)] flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <IndianRupee size={12} className="text-slate-400" />
            <span className="text-xs text-slate-500">Default rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-200 inline-block" />
            <span className="text-xs text-slate-500">Custom rate set</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-200 inline-block" />
            <span className="text-xs text-slate-500">Today</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-200 inline-block" />
            <span className="text-xs text-slate-500">Upcoming</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Save size={12} className="text-slate-400" />
            <span className="text-xs text-slate-400">Click ✏️ on any day column to edit its rates</span>
          </div>
        </div>
      </div>

      {/* Delete Rate Confirmation Modal */}
      {deleteConfirmDate && (
        <DeleteRateConfirmModal
          dateLabel={formatShortDate(deleteConfirmDate)}
          onConfirm={() => clearDay(deleteConfirmDate)}
          onCancel={() => setDeleteConfirmDate(null)}
        />
      )}
    </div>
  );
}
