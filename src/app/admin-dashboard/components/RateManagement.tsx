'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Save, X, ChevronDown, TrendingUp, Calendar, IndianRupee } from 'lucide-react';
import {
  getAllRates,
  saveRatesForDate,
  deleteRatesForDate,
  getRatesForDate,
  NEWSPAPERS,
} from '@/lib/storage';
import type { DailyRateRecord, NewspaperRateEntry } from '@/lib/storage';

export default function RateManagement() {
  const [rateRecords, setRateRecords] = useState<DailyRateRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rateInputs, setRateInputs] = useState<Record<string, string>>({});
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const loadRates = useCallback(() => {
    const all = getAllRates().sort((a, b) => b.date.localeCompare(a.date));
    setRateRecords(all);
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const initFormForDate = (date: string) => {
    const existing = getRatesForDate(date);
    const inputs: Record<string, string> = {};
    NEWSPAPERS.forEach((np) => {
      const found = existing?.find((r) => r.newspaper === np.name);
      inputs[np.name] = found ? String(found.rate) : String(np.rate);
    });
    setRateInputs(inputs);
  };

  const handleNewRate = () => {
    setEditingDate(null);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    initFormForDate(new Date().toISOString().split('T')[0]);
    setShowForm(true);
  };

  const handleEditDate = (date: string) => {
    setEditingDate(date);
    setSelectedDate(date);
    initFormForDate(date);
    setShowForm(true);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    initFormForDate(date);
  };

  const handleRateChange = (newspaper: string, value: string) => {
    setRateInputs((prev) => ({ ...prev, [newspaper]: value }));
  };

  const handleSave = () => {
    const rates: NewspaperRateEntry[] = NEWSPAPERS.map((np) => ({
      newspaper: np.name,
      rate: parseFloat(rateInputs[np.name] || '0') || 0,
    }));

    const invalid = rates.filter((r) => r.rate <= 0);
    if (invalid.length > 0) {
      toast.error(`Please enter valid rates for all newspapers.`);
      return;
    }

    saveRatesForDate(selectedDate, rates);
    loadRates();
    setShowForm(false);
    setEditingDate(null);
    toast.success(`Rates saved for ${formatDate(selectedDate)}`);
  };

  const handleDelete = (date: string) => {
    if (!confirm(`Delete all rates for ${formatDate(date)}?`)) return;
    deleteRatesForDate(date);
    loadRates();
    toast.success(`Rates deleted for ${formatDate(date)}`);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDate(null);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
  };

  const getDayLabel = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    if (dateStr > today) return 'Upcoming';
    return 'Past';
  };

  const getDayBadgeClass = (dateStr: string) => {
    const label = getDayLabel(dateStr);
    if (label === 'Today') return 'bg-green-100 text-green-700';
    if (label === 'Tomorrow' || label === 'Upcoming') return 'bg-blue-100 text-blue-700';
    return 'bg-slate-100 text-slate-500';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Rate Management</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Set newspaper rates per date — used for accurate supply &amp; return billing calculations
          </p>
        </div>
        <button
          onClick={handleNewRate}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} />
          Set Rates for Date
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <TrendingUp size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">How rate-based billing works:</p>
          <ul className="space-y-0.5 text-amber-700 text-xs list-disc list-inside">
            <li><strong>Supply Qty</strong> is multiplied by the rate set for the <strong>billing date</strong></li>
            <li><strong>Return Qty</strong> is multiplied by the rate of the <strong>previous day</strong> (when papers were supplied)</li>
            <li>If no rate is set for a date, the system uses the most recent rate before that date</li>
            <li>Example: Lokmat ₹3.5 on Mon → ₹4.2 on Tue → Thu billing: supply × ₹3.5 (Thu rate), return × ₹4.2 (Tue rate)</li>
          </ul>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[hsl(220,15%,88%)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">
                {editingDate ? `Edit Rates — ${formatDate(editingDate)}` : 'Set Rates for a Date'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Enter the rate per newspaper for the selected date</p>
            </div>
            <button onClick={handleCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Date Picker */}
            <div className="max-w-xs">
              <label className="label-text flex items-center gap-1.5" htmlFor="rate-date">
                <Calendar size={13} />
                Select Date
              </label>
              <input
                id="rate-date"
                type="date"
                className="input-field"
                value={selectedDate}
                disabled={!!editingDate}
                onChange={(e) => handleDateChange(e.target.value)}
              />
              {!editingDate && (
                <p className="text-xs text-slate-400 mt-1">You can set rates for past, today, or future dates</p>
              )}
            </div>

            {/* Rate Table */}
            <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,88%)]">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-[hsl(220,15%,88%)]">
                    <th className="table-header text-left w-8">Sr.</th>
                    <th className="table-header text-left">Newspaper</th>
                    <th className="table-header text-right">Default Rate (₹)</th>
                    <th className="table-header text-center">Rate for {formatDate(selectedDate)} (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {NEWSPAPERS.map((np, i) => {
                    const inputVal = rateInputs[np.name] ?? String(np.rate);
                    const changed = parseFloat(inputVal) !== np.rate;
                    return (
                      <tr
                        key={`rate-row-${np.name}`}
                        className={`border-b border-[hsl(220,15%,93%)] transition-colors ${changed ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}
                      >
                        <td className="table-cell text-xs text-slate-400 font-mono w-8">{i + 1}</td>
                        <td className="table-cell">
                          <span className={`text-sm font-medium ${changed ? 'text-amber-700' : 'text-slate-700'}`}>
                            {np.name}
                          </span>
                        </td>
                        <td className="table-cell text-right font-mono text-sm text-slate-400">
                          ₹{np.rate.toFixed(2)}
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-slate-400 text-sm">₹</span>
                            <input
                              type="number"
                              min={0}
                              step={0.10}
                              value={inputVal}
                              onChange={(e) => handleRateChange(np.name, e.target.value)}
                              className={`w-24 text-center input-field text-sm tabular-nums ${changed ? 'border-amber-300 bg-amber-50 text-amber-800 font-semibold' : ''}`}
                              placeholder="0.00"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={15} />
                Save Rates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Records List */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(220,15%,88%)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Rate History &amp; Upcoming Rates</h3>
          <span className="text-xs text-slate-400">{rateRecords.length} date{rateRecords.length !== 1 ? 's' : ''} configured</span>
        </div>

        {rateRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
              <IndianRupee size={22} className="text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">No rates configured yet</p>
            <p className="text-xs text-slate-400 mt-1">Click &quot;Set Rates for Date&quot; to add rates for a specific day</p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(220,15%,93%)]">
            {rateRecords.map((record) => {
              const isExpanded = expandedDate === record.date;
              const dayLabel = getDayLabel(record.date);
              const badgeClass = getDayBadgeClass(record.date);

              return (
                <div key={`rate-record-${record.date}`}>
                  {/* Row Header */}
                  <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <button
                      onClick={() => setExpandedDate(isExpanded ? null : record.date)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[hsl(210,67%,23%)] text-white flex items-center justify-center flex-shrink-0">
                        <Calendar size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{formatDate(record.date)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}`}>
                            {dayLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {record.rates.length} newspapers · Avg ₹{(record.rates.reduce((s, r) => s + r.rate, 0) / record.rates.length).toFixed(2)}
                        </p>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditDate(record.date)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Edit rates"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(record.date)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete rates"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Rate Table */}
                  {isExpanded && (
                    <div className="px-5 pb-4 bg-slate-50/50">
                      <div className="overflow-x-auto rounded-xl border border-[hsl(220,15%,88%)] bg-white">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-slate-50 border-b border-[hsl(220,15%,88%)]">
                              <th className="table-header text-left">Newspaper</th>
                              <th className="table-header text-right">Rate (₹)</th>
                              <th className="table-header text-right">vs Default</th>
                            </tr>
                          </thead>
                          <tbody>
                            {record.rates.map((r) => {
                              const defaultRate = NEWSPAPERS.find((n) => n.name === r.newspaper)?.rate ?? r.rate;
                              const diff = r.rate - defaultRate;
                              return (
                                <tr key={`exp-${record.date}-${r.newspaper}`} className="border-b border-[hsl(220,15%,93%)] last:border-0">
                                  <td className="table-cell text-sm text-slate-700">{r.newspaper}</td>
                                  <td className="table-cell text-right font-mono text-sm font-semibold text-slate-900">
                                    ₹{r.rate.toFixed(2)}
                                  </td>
                                  <td className="table-cell text-right">
                                    {diff === 0 ? (
                                      <span className="text-xs text-slate-400">—</span>
                                    ) : diff > 0 ? (
                                      <span className="text-xs font-semibold text-green-600">+₹{diff.toFixed(2)}</span>
                                    ) : (
                                      <span className="text-xs font-semibold text-red-500">−₹{Math.abs(diff).toFixed(2)}</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
