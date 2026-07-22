'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, Search, TrendingUp, Users, Newspaper, Layers } from 'lucide-react';
import { getBillingRecords, getMonthlyTracker, getHawkers, NEWSPAPERS, getNewspaperGroups } from '@/lib/storage';
import type { DailyBillingRecord, MonthlyTrackerRow, Hawker, NewspaperGroup } from '@/lib/storage';

type ViewMode = 'daily' | 'fullday' | 'monthly';

// Lokmat = first 3 newspapers (indices 0,1,2) — paid directly to company
const LOKMAT_COUNT = 3;

interface DailySummaryRow {
  hawkerId: number;
  hawkerName: string;
  newspapers: Record<string, { supply: number; return: number; net: number; total: number }>;
  totalBill: number;
  paymentStatus: string;
  paymentType: string;
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function getMonthName(m: number) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
}

// ─── CSV Export ───────────────────────────────────────────────────────────────
function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Print/PDF Export ─────────────────────────────────────────────────────────
function printTable(title: string, html: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
      h2 { color: #1e3a5f; margin-bottom: 4px; }
      p { color: #666; margin-bottom: 12px; font-size: 11px; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #1e3a5f; color: white; padding: 6px 10px; text-align: left; font-size: 11px; }
      td { padding: 5px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
      tr:nth-child(even) td { background: #f8fafc; }
      tfoot td { background: #1e3a5f; color: white; font-weight: bold; padding: 6px 10px; }
      @media print { .no-print { display: none !important; } }
    </style></head>
    <body>
      ${html}
      <br/>
      <div class="no-print" style="margin-top:16px;">
        <button onClick="window.print()" style="padding:8px 18px;background:#1e3a5f;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;">🖨️ Print / Save as PDF</button>
      </div>
      <script>window.onload = function(){ window.focus(); window.print(); }<\/script>
    </body></html>
  `);
  win.document.close();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TrackerView() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [billingRecords, setBillingRecords] = useState<DailyBillingRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTrackerRow[]>([]);
  const [hawkers, setHawkers] = useState<Hawker[]>([]);
  const [groups, setGroups] = useState<NewspaperGroup[]>([]);

  useEffect(() => {
    setBillingRecords(getBillingRecords());
    setMonthlyData(getMonthlyTracker());
    setHawkers(getHawkers());
    setGroups(getNewspaperGroups());
  }, []);

  // ─── Active newspapers based on selected group ──────────────────────────────
  const activeNPs = useMemo(() => {
    if (selectedGroupId === 'all') return NEWSPAPERS;
    const group = groups.find((g) => g.id === selectedGroupId);
    if (!group || group.newspapers.length === 0) return NEWSPAPERS;
    return NEWSPAPERS.filter((np) => group.newspapers.includes(np.name));
  }, [selectedGroupId, groups]);

  const activeGroupColor = useMemo(() => {
    if (selectedGroupId === 'all') return undefined;
    return groups.find((g) => g.id === selectedGroupId)?.color;
  }, [selectedGroupId, groups]);

  // ─── Filter billing entries by active newspapers ────────────────────────────
  const filterEntriesByGroup = (entries: DailyBillingRecord['entries']) => {
    if (selectedGroupId === 'all') return entries;
    const npSet = new Set(activeNPs.map((n) => n.name));
    return entries.filter((e) => npSet.has(e.newspaper));
  };

  // ─── Daily View Data ────────────────────────────────────────────────────────
  const dailyRows = useMemo<DailySummaryRow[]>(() => {
    const records = billingRecords.filter((b) => b.date === selectedDate);
    return records
      .filter(
        (r) =>
          r.hawkerName.toLowerCase().includes(search.toLowerCase()) ||
          String(r.hawkerId).includes(search)
      )
      .map((r) => {
        const filteredEntries = filterEntriesByGroup(r.entries);
        const newspapers: DailySummaryRow['newspapers'] = {};
        for (const e of filteredEntries) {
          newspapers[e.newspaper] = {
            supply: e.supplyQty,
            return: e.returnQty,
            net: e.netQty,
            total: e.total,
          };
        }
        const totalBill = filteredEntries.reduce((s, e) => s + e.total, 0);
        return {
          hawkerId: r.hawkerId,
          hawkerName: r.hawkerName,
          newspapers,
          totalBill,
          paymentStatus: r.paymentStatus,
          paymentType: r.paymentType,
        };
      })
      .filter((r) => selectedGroupId === 'all' || r.totalBill > 0);
  }, [billingRecords, selectedDate, search, selectedGroupId, activeNPs]);

  // ─── Full Day (Date Range) View Data ────────────────────────────────────────
  const fullDayRows = useMemo(() => {
    const records = billingRecords.filter((b) => b.date >= rangeFrom && b.date <= rangeTo);
    const map = new Map<number, { hawkerName: string; totalBill: number; days: Set<string>; newspapers: Record<string, number> }>();
    for (const r of records) {
      const filteredEntries = filterEntriesByGroup(r.entries);
      if (selectedGroupId !== 'all' && filteredEntries.length === 0) continue;
      if (!map.has(r.hawkerId)) {
        map.set(r.hawkerId, { hawkerName: r.hawkerName, totalBill: 0, days: new Set(), newspapers: {} });
      }
      const row = map.get(r.hawkerId)!;
      const entryTotal = filteredEntries.reduce((s, e) => s + e.total, 0);
      row.totalBill += entryTotal;
      row.days.add(r.date);
      for (const e of filteredEntries) {
        row.newspapers[e.newspaper] = (row.newspapers[e.newspaper] || 0) + e.total;
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ hawkerId: id, ...v, daysCount: v.days.size }))
      .filter(
        (r) =>
          r.hawkerName.toLowerCase().includes(search.toLowerCase()) ||
          String(r.hawkerId).includes(search)
      )
      .sort((a, b) => a.hawkerId - b.hawkerId);
  }, [billingRecords, rangeFrom, rangeTo, search, selectedGroupId, activeNPs]);

  // ─── Monthly View Data ──────────────────────────────────────────────────────
  const monthlyRows = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const records = billingRecords.filter((b) => b.date.startsWith(prefix));
    const map = new Map<number, { hawkerName: string; totalBill: number; newspapers: Record<string, number> }>();
    for (const r of records) {
      const filteredEntries = filterEntriesByGroup(r.entries);
      if (selectedGroupId !== 'all' && filteredEntries.length === 0) continue;
      if (!map.has(r.hawkerId)) {
        map.set(r.hawkerId, { hawkerName: r.hawkerName, totalBill: 0, newspapers: {} });
      }
      const row = map.get(r.hawkerId)!;
      const entryTotal = filteredEntries.reduce((s, e) => s + e.total, 0);
      row.totalBill += entryTotal;
      for (const e of filteredEntries) {
        row.newspapers[e.newspaper] = (row.newspapers[e.newspaper] || 0) + e.total;
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ hawkerId: id, ...v }))
      .filter(
        (r) =>
          r.hawkerName.toLowerCase().includes(search.toLowerCase()) ||
          String(r.hawkerId).includes(search)
      )
      .sort((a, b) => a.hawkerId - b.hawkerId);
  }, [billingRecords, selectedMonth, search, selectedGroupId, activeNPs]);

  // ─── Summary Stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (viewMode === 'daily') {
      const total = dailyRows.reduce((s, r) => s + r.totalBill, 0);
      const lokmats = activeNPs.slice(0, LOKMAT_COUNT).map((n) => n.name);
      const transferToCompany = dailyRows.reduce((s, r) => s + lokmats.reduce((ls, np) => ls + (r.newspapers[np]?.total ?? 0), 0), 0);
      const cash = total - transferToCompany;
      return { hawkers: dailyRows.length, total, transferToCompany, cash, label: `Date: ${formatDate(selectedDate)}` };
    }
    if (viewMode === 'fullday') {
      const total = fullDayRows.reduce((s, r) => s + r.totalBill, 0);
      const lokmats = activeNPs.slice(0, LOKMAT_COUNT).map((n) => n.name);
      const transferToCompany = fullDayRows.reduce((s, r) => s + lokmats.reduce((ls, np) => ls + (r.newspapers[np] ?? 0), 0), 0);
      const cash = total - transferToCompany;
      return { hawkers: fullDayRows.length, total, transferToCompany, cash, label: `${formatDate(rangeFrom)} – ${formatDate(rangeTo)}` };
    }
    const total = monthlyRows.reduce((s, r) => s + r.totalBill, 0);
    const lokmats = activeNPs.slice(0, LOKMAT_COUNT).map((n) => n.name);
    const transferToCompany = monthlyRows.reduce((s, r) => s + lokmats.reduce((ls, np) => ls + (r.newspapers[np] ?? 0), 0), 0);
    const cash = total - transferToCompany;
    const [y, m] = selectedMonth.split('-').map(Number);
    return { hawkers: monthlyRows.length, total, transferToCompany, cash, label: `${getMonthName(m - 1)} ${y}` };
  }, [viewMode, dailyRows, fullDayRows, monthlyRows, selectedDate, rangeFrom, rangeTo, selectedMonth, activeNPs]);

  // ─── Download Handlers ──────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    const visibleNPs = activeNPs.slice(0, 8).map((n) => n.name);
    if (viewMode === 'daily') {
      const header = ['#', 'Hawker', ...visibleNPs, 'Total Bill', 'Payment'];
      const rows = dailyRows.map((r) => [
        String(r.hawkerId),
        r.hawkerName,
        ...visibleNPs.map((np) => String(r.newspapers[np]?.total?.toFixed(2) ?? '0.00')),
        r.totalBill.toFixed(2),
        r.paymentType,
      ]);
      downloadCSV(`daily-tracker-${selectedDate}.csv`, [header, ...rows]);
    } else if (viewMode === 'fullday') {
      const header = ['#', 'Hawker', 'Days', ...visibleNPs, 'Total Bill'];
      const rows = fullDayRows.map((r) => [
        String(r.hawkerId),
        r.hawkerName,
        String(r.daysCount),
        ...visibleNPs.map((np) => String(r.newspapers[np]?.toFixed(2) ?? '0.00')),
        r.totalBill.toFixed(2),
      ]);
      downloadCSV(`fullday-tracker-${rangeFrom}-to-${rangeTo}.csv`, [header, ...rows]);
    } else {
      const header = ['#', 'Hawker', ...visibleNPs, 'Total Bill'];
      const rows = monthlyRows.map((r) => [
        String(r.hawkerId),
        r.hawkerName,
        ...visibleNPs.map((np) => String(r.newspapers[np]?.toFixed(2) ?? '0.00')),
        r.totalBill.toFixed(2),
      ]);
      downloadCSV(`monthly-tracker-${selectedMonth}.csv`, [header, ...rows]);
    }
  };

  const handlePrint = () => {
    const visibleNPs = activeNPs.slice(0, 8).map((n) => n.name);
    let title = '';
    let tableHtml = '';

    if (viewMode === 'daily') {
      title = `Daily Tracker — ${formatDate(selectedDate)}`;
      const headerCells = ['#', 'Hawker', ...visibleNPs, 'Total', 'Payment']
        .map((h) => `<th>${h}</th>`).join('');
      const bodyRows = dailyRows.map((r) =>
        `<tr><td>#${r.hawkerId}</td><td>${r.hawkerName}</td>${visibleNPs.map((np) =>
          `<td>₹${r.newspapers[np]?.total?.toFixed(2) ?? '0.00'}</td>`).join('')}<td><b>₹${r.totalBill.toFixed(2)}</b></td><td>${r.paymentType}</td></tr>`
      ).join('');
      const totalBill = dailyRows.reduce((s, r) => s + r.totalBill, 0);
      const footRow = `<tr><td colspan="${2 + visibleNPs.length}"><b>Grand Total</b></td><td><b>₹${totalBill.toFixed(2)}</b></td><td></td></tr>`;
      tableHtml = `<h2>${title}</h2><p>${dailyRows.length} hawkers</p><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody><tfoot>${footRow}</tfoot></table>`;
    } else if (viewMode === 'fullday') {
      title = `Full Day Tracker — ${formatDate(rangeFrom)} to ${formatDate(rangeTo)}`;
      const headerCells = ['#', 'Hawker', 'Days', ...visibleNPs, 'Total']
        .map((h) => `<th>${h}</th>`).join('');
      const bodyRows = fullDayRows.map((r) =>
        `<tr><td>#${r.hawkerId}</td><td>${r.hawkerName}</td><td>${r.daysCount}</td>${visibleNPs.map((np) =>
          `<td>₹${r.newspapers[np]?.toFixed(2) ?? '0.00'}</td>`).join('')}<td><b>₹${r.totalBill.toFixed(2)}</b></td></tr>`
      ).join('');
      const totalBill = fullDayRows.reduce((s, r) => s + r.totalBill, 0);
      const footRow = `<tr><td colspan="${3 + visibleNPs.length}"><b>Grand Total</b></td><td><b>₹${totalBill.toFixed(2)}</b></td></tr>`;
      tableHtml = `<h2>${title}</h2><p>${fullDayRows.length} hawkers</p><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody><tfoot>${footRow}</tfoot></table>`;
    } else {
      const [y, m] = selectedMonth.split('-').map(Number);
      title = `Monthly Tracker — ${getMonthName(m - 1)} ${y}`;
      const headerCells = ['#', 'Hawker', ...visibleNPs, 'Total']
        .map((h) => `<th>${h}</th>`).join('');
      const bodyRows = monthlyRows.map((r) =>
        `<tr><td>#${r.hawkerId}</td><td>${r.hawkerName}</td>${visibleNPs.map((np) =>
          `<td>₹${r.newspapers[np]?.toFixed(2) ?? '0.00'}</td>`).join('')}<td><b>₹${r.totalBill.toFixed(2)}</b></td></tr>`
      ).join('');
      const totalBill = monthlyRows.reduce((s, r) => s + r.totalBill, 0);
      const footRow = `<tr><td colspan="${2 + visibleNPs.length}"><b>Grand Total</b></td><td><b>₹${totalBill.toFixed(2)}</b></td></tr>`;
      tableHtml = `<h2>${title}</h2><p>${monthlyRows.length} hawkers</p><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody><tfoot>${footRow}</tfoot></table>`;
    }

    printTable(title, tableHtml);
  };

  const visibleNPs = activeNPs.slice(0, 8);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Tracker</h2>
          <p className="text-sm text-slate-500 mt-0.5">Daily, full-day range, and monthly billing tracker</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(210,67%,23%)] hover:bg-[hsl(210,67%,18%)] transition-colors"
          >
            <FileText size={14} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['daily', 'fullday', 'monthly'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => { setViewMode(mode); setSearch(''); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === mode
                ? 'bg-white text-[hsl(210,67%,23%)] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {mode === 'daily' ? 'Daily' : mode === 'fullday' ? 'Full Day Range' : 'Monthly'}
          </button>
        ))}
      </div>

      {/* Date Controls + Group Filter */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          {viewMode === 'daily' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          )}
          {viewMode === 'fullday' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">From</label>
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">To</label>
                <input
                  type="date"
                  value={rangeTo}
                  min={rangeFrom}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
            </>
          )}
          {viewMode === 'monthly' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Select Month</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          )}

          {/* Group Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              <span className="flex items-center gap-1"><Layers size={11} /> Newspaper Group</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedGroupId('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selectedGroupId === 'all' ?'bg-[hsl(210,67%,23%)] text-white border-[hsl(210,67%,23%)]' :'text-slate-600 border-[hsl(220,15%,88%)] hover:bg-slate-50'
                }`}
              >
                All Newspapers
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    selectedGroupId === g.id
                      ? 'text-white border-transparent' :'text-slate-600 border-[hsl(220,15%,88%)] hover:bg-slate-50'
                  }`}
                  style={
                    selectedGroupId === g.id
                      ? { backgroundColor: g.color ?? 'hsl(210,67%,23%)', borderColor: g.color ?? 'hsl(210,67%,23%)' }
                      : {}
                  }
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedGroupId === g.id ? 'rgba(255,255,255,0.7)' : (g.color ?? 'hsl(210,67%,23%)') }}
                  />
                  {g.name}
                </button>
              ))}
              {groups.length === 0 && (
                <span className="text-xs text-slate-400 italic">No groups — create them in Newspaper Groups</span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Search Hawker</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name or ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Active group indicator */}
        {selectedGroupId !== 'all' && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{
              backgroundColor: activeGroupColor ? `${activeGroupColor}15` : 'hsl(210,67%,97%)',
              color: activeGroupColor ?? 'hsl(210,67%,23%)',
              border: `1px solid ${activeGroupColor ? `${activeGroupColor}30` : 'hsl(210,67%,88%)'}`,
            }}
          >
            <Layers size={12} />
            Showing: {groups.find((g) => g.id === selectedGroupId)?.name} — {activeNPs.length} newspaper{activeNPs.length !== 1 ? 's' : ''}: {activeNPs.map((n) => n.name).join(', ')}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users size={15} className="text-[hsl(210,67%,23%)]" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hawkers</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.hawkers}</p>
          <p className="text-xs text-slate-400 mt-0.5">{stats.label}</p>
        </div>
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-emerald-600" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Billing</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹{stats.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{stats.label}</p>
        </div>
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Newspaper size={15} className="text-violet-600" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg per Hawker</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            ₹{stats.hawkers > 0 ? (stats.total / stats.hawkers).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{stats.label}</p>
        </div>
        {/* Payment bifurcation cards */}
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Transfer to Company</span>
          </div>
          <p className="text-2xl font-bold text-indigo-800">
            ₹{stats.transferToCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-indigo-400 mt-0.5">Lokmat newspapers</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Cash</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">
            ₹{stats.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-emerald-400 mt-0.5">Other newspapers</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          {/* ── DAILY VIEW ── */}
          {viewMode === 'daily' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,88%)] bg-slate-50">
                  <th className="table-header text-left sticky left-0 bg-slate-50 z-10 w-10">#</th>
                  <th className="table-header text-left sticky left-10 bg-slate-50 z-10 min-w-[150px]">Hawker</th>
                  {visibleNPs.map((np) => (
                    <th key={`dh-${np.name}`} className="table-header text-right min-w-[80px] whitespace-nowrap">{np.name}</th>
                  ))}
                  <th className="table-header text-right min-w-[100px] bg-[hsl(210,67%,97%)]">Total</th>
                  <th className="table-header text-center min-w-[80px]">Payment</th>
                </tr>
              </thead>
              <tbody>
                {dailyRows.length === 0 ? (
                  <tr>
                    <td colSpan={4 + visibleNPs.length} className="text-center py-12 text-slate-400 text-sm">
                      No billing records for {formatDate(selectedDate)}
                    </td>
                  </tr>
                ) : (
                  dailyRows.map((row, i) => (
                    <tr key={`dr-${row.hawkerId}`} className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50/80 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="table-cell sticky left-0 bg-inherit z-10">
                        <span className="font-mono text-xs text-slate-500">#{String(row.hawkerId).padStart(2, '0')}</span>
                      </td>
                      <td className="table-cell sticky left-10 bg-inherit z-10 font-semibold text-slate-800 truncate max-w-[150px]">{row.hawkerName}</td>
                      {visibleNPs.map((np) => {
                        const val = row.newspapers[np.name]?.total ?? 0;
                        return (
                          <td key={`dr-${row.hawkerId}-${np.name}`} className="table-cell text-right tabular-nums">
                            {val > 0 ? <span className="text-slate-700">₹{val.toFixed(2)}</span> : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="table-cell text-right tabular-nums font-bold text-[hsl(210,67%,23%)] bg-[hsl(210,67%,98%)]">
                        ₹{row.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.paymentType === 'Cash' ? 'bg-green-100 text-green-700' :
                          row.paymentType === 'UPI'? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>{row.paymentType}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {dailyRows.length > 0 && (
                <tfoot>
                  <tr className="bg-[hsl(210,67%,23%)] text-white font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-[hsl(210,67%,23%)] z-10"></td>
                    <td className="px-4 py-3 sticky left-10 bg-[hsl(210,67%,23%)] z-10 text-xs uppercase tracking-wide">Totals</td>
                    {visibleNPs.map((np) => {
                      const t = dailyRows.reduce((s, r) => s + (r.newspapers[np.name]?.total ?? 0), 0);
                      return <td key={`dft-${np.name}`} className="px-4 py-3 text-right tabular-nums text-xs">₹{t.toFixed(0)}</td>;
                    })}
                    <td className="px-4 py-3 text-right tabular-nums">
                      ₹{dailyRows.reduce((s, r) => s + r.totalBill, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3"></td>
                  </tr>
                  {/* Transfer to Company row */}
                  <tr className="bg-indigo-50 border-t border-indigo-200">
                    <td className="px-4 py-2.5 sticky left-0 bg-indigo-50 z-10"></td>
                    <td className="px-4 py-2.5 sticky left-10 bg-indigo-50 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                        <span className="text-xs font-semibold text-indigo-700">Transfer to Company</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full hidden sm:inline">Lokmat</span>
                      </div>
                    </td>
                    {visibleNPs.map((np, idx) => {
                      const isLokmat = idx < LOKMAT_COUNT;
                      const t = isLokmat ? dailyRows.reduce((s, r) => s + (r.newspapers[np.name]?.total ?? 0), 0) : 0;
                      return (
                        <td key={`dft-tc-${np.name}`} className="px-4 py-2.5 text-right tabular-nums text-xs text-indigo-600">
                          {isLokmat && t > 0 ? `₹${t.toFixed(0)}` : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-800">
                      ₹{stats.transferToCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5"></td>
                  </tr>
                  {/* Cash row */}
                  <tr className="bg-emerald-50 border-t border-emerald-200">
                    <td className="px-4 py-2.5 sticky left-0 bg-emerald-50 z-10"></td>
                    <td className="px-4 py-2.5 sticky left-10 bg-emerald-50 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="text-xs font-semibold text-emerald-700">Cash</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full hidden sm:inline">Other</span>
                      </div>
                    </td>
                    {visibleNPs.map((np, idx) => {
                      const isOther = idx >= LOKMAT_COUNT;
                      const t = isOther ? dailyRows.reduce((s, r) => s + (r.newspapers[np.name]?.total ?? 0), 0) : 0;
                      return (
                        <td key={`dft-cash-${np.name}`} className="px-4 py-2.5 text-right tabular-nums text-xs text-emerald-600">
                          {isOther && t > 0 ? `₹${t.toFixed(0)}` : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-800">
                      ₹{stats.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2.5"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* ── FULL DAY RANGE VIEW ── */}
          {viewMode === 'fullday' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,88%)] bg-slate-50">
                  <th className="table-header text-left sticky left-0 bg-slate-50 z-10 w-10">#</th>
                  <th className="table-header text-left sticky left-10 bg-slate-50 z-10 min-w-[150px]">Hawker</th>
                  <th className="table-header text-center min-w-[60px]">Days</th>
                  {visibleNPs.map((np) => (
                    <th key={`fdh-${np.name}`} className="table-header text-right min-w-[80px] whitespace-nowrap">{np.name}</th>
                  ))}
                  <th className="table-header text-right min-w-[100px] bg-[hsl(210,67%,97%)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {fullDayRows.length === 0 ? (
                  <tr>
                    <td colSpan={4 + visibleNPs.length} className="text-center py-12 text-slate-400 text-sm">
                      No billing records for selected range
                    </td>
                  </tr>
                ) : (
                  fullDayRows.map((row, i) => (
                    <tr key={`fdr-${row.hawkerId}`} className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50/80 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="table-cell sticky left-0 bg-inherit z-10">
                        <span className="font-mono text-xs text-slate-500">#{String(row.hawkerId).padStart(2, '0')}</span>
                      </td>
                      <td className="table-cell sticky left-10 bg-inherit z-10 font-semibold text-slate-800 truncate max-w-[150px]">{row.hawkerName}</td>
                      <td className="table-cell text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">{row.daysCount}</span>
                      </td>
                      {visibleNPs.map((np) => {
                        const val = row.newspapers[np.name] ?? 0;
                        return (
                          <td key={`fdr-${row.hawkerId}-${np.name}`} className="table-cell text-right tabular-nums">
                            {val > 0 ? <span className="text-slate-700">₹{val.toFixed(2)}</span> : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="table-cell text-right tabular-nums font-bold text-[hsl(210,67%,23%)] bg-[hsl(210,67%,98%)]">
                        ₹{row.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {fullDayRows.length > 0 && (
                <tfoot>
                  <tr className="bg-[hsl(210,67%,23%)] text-white font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-[hsl(210,67%,23%)] z-10"></td>
                    <td className="px-4 py-3 sticky left-10 bg-[hsl(210,67%,23%)] z-10 text-xs uppercase tracking-wide">Totals</td>
                    <td className="px-4 py-3 text-center text-xs">—</td>
                    {visibleNPs.map((np) => {
                      const t = fullDayRows.reduce((s, r) => s + (r.newspapers[np.name] ?? 0), 0);
                      return <td key={`fdft-${np.name}`} className="px-4 py-3 text-right tabular-nums text-xs">₹{t.toFixed(0)}</td>;
                    })}
                    <td className="px-4 py-3 text-right tabular-nums">
                      ₹{fullDayRows.reduce((s, r) => s + r.totalBill, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {/* Transfer to Company row */}
                  <tr className="bg-indigo-50 border-t border-indigo-200">
                    <td className="px-4 py-2.5 sticky left-0 bg-indigo-50 z-10"></td>
                    <td className="px-4 py-2.5 sticky left-10 bg-indigo-50 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                        <span className="text-xs font-semibold text-indigo-700">Transfer to Company</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full hidden sm:inline">Lokmat</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"></td>
                    {visibleNPs.map((np, idx) => {
                      const isLokmat = idx < LOKMAT_COUNT;
                      const t = isLokmat ? fullDayRows.reduce((s, r) => s + (r.newspapers[np.name] ?? 0), 0) : 0;
                      return (
                        <td key={`fdft-tc-${np.name}`} className="px-4 py-2.5 text-right tabular-nums text-xs text-indigo-600">
                          {isLokmat && t > 0 ? `₹${t.toFixed(0)}` : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-800">
                      ₹{stats.transferToCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {/* Cash row */}
                  <tr className="bg-emerald-50 border-t border-emerald-200">
                    <td className="px-4 py-2.5 sticky left-0 bg-emerald-50 z-10"></td>
                    <td className="px-4 py-2.5 sticky left-10 bg-emerald-50 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="text-xs font-semibold text-emerald-700">Cash</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full hidden sm:inline">Other</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5"></td>
                    {visibleNPs.map((np, idx) => {
                      const isOther = idx >= LOKMAT_COUNT;
                      const t = isOther ? fullDayRows.reduce((s, r) => s + (r.newspapers[np.name] ?? 0), 0) : 0;
                      return (
                        <td key={`fdft-cash-${np.name}`} className="px-4 py-2.5 text-right tabular-nums text-xs text-emerald-600">
                          {isOther && t > 0 ? `₹${t.toFixed(0)}` : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-800">
                      ₹{stats.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}

          {/* ── MONTHLY VIEW ── */}
          {viewMode === 'monthly' && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(220,15%,88%)] bg-slate-50">
                  <th className="table-header text-left sticky left-0 bg-slate-50 z-10 w-10">#</th>
                  <th className="table-header text-left sticky left-10 bg-slate-50 z-10 min-w-[150px]">Hawker</th>
                  {visibleNPs.map((np) => (
                    <th key={`mh-${np.name}`} className="table-header text-right min-w-[80px] whitespace-nowrap">{np.name}</th>
                  ))}
                  <th className="table-header text-right min-w-[100px] bg-[hsl(210,67%,97%)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.length === 0 ? (
                  <tr>
                    <td colSpan={3 + visibleNPs.length} className="text-center py-12 text-slate-400 text-sm">
                      No billing records for selected month
                    </td>
                  </tr>
                ) : (
                  monthlyRows.map((row, i) => (
                    <tr key={`mr-${row.hawkerId}`} className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50/80 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="table-cell sticky left-0 bg-inherit z-10">
                        <span className="font-mono text-xs text-slate-500">#{String(row.hawkerId).padStart(2, '0')}</span>
                      </td>
                      <td className="table-cell sticky left-10 bg-inherit z-10 font-semibold text-slate-800 truncate max-w-[150px]">{row.hawkerName}</td>
                      {visibleNPs.map((np) => {
                        const val = row.newspapers[np.name] ?? 0;
                        return (
                          <td key={`mr-${row.hawkerId}-${np.name}`} className="table-cell text-right tabular-nums">
                            {val > 0 ? <span className="text-slate-700">₹{val.toFixed(2)}</span> : <span className="text-slate-200">—</span>}
                          </td>
                        );
                      })}
                      <td className="table-cell text-right tabular-nums font-bold text-[hsl(210,67%,23%)] bg-[hsl(210,67%,98%)]">
                        ₹{row.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthlyRows.length > 0 && (
                <tfoot>
                  <tr className="bg-[hsl(210,67%,23%)] text-white font-bold">
                    <td className="px-4 py-3 sticky left-0 bg-[hsl(210,67%,23%)] z-10"></td>
                    <td className="px-4 py-3 sticky left-10 bg-[hsl(210,67%,23%)] z-10 text-xs uppercase tracking-wide">Totals</td>
                    {visibleNPs.map((np) => {
                      const t = monthlyRows.reduce((s, r) => s + (r.newspapers[np.name] ?? 0), 0);
                      return <td key={`mft-${np.name}`} className="px-4 py-3 text-right tabular-nums text-xs">₹{t.toFixed(0)}</td>;
                    })}
                    <td className="px-4 py-3 text-right tabular-nums">
                      ₹{monthlyRows.reduce((s, r) => s + r.totalBill, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {/* Transfer to Company row */}
                  <tr className="bg-indigo-50 border-t border-indigo-200">
                    <td className="px-4 py-2.5 sticky left-0 bg-indigo-50 z-10"></td>
                    <td className="px-4 py-2.5 sticky left-10 bg-indigo-50 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0"></span>
                        <span className="text-xs font-semibold text-indigo-700">Transfer to Company</span>
                        <span className="text-[10px] text-indigo-400 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full hidden sm:inline">Lokmat</span>
                      </div>
                    </td>
                    {visibleNPs.map((np, idx) => {
                      const isLokmat = idx < LOKMAT_COUNT;
                      const t = isLokmat ? monthlyRows.reduce((s, r) => s + (r.newspapers[np.name] ?? 0), 0) : 0;
                      return (
                        <td key={`mft-tc-${np.name}`} className="px-4 py-2.5 text-right tabular-nums text-xs text-indigo-600">
                          {isLokmat && t > 0 ? `₹${t.toFixed(0)}` : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-800">
                      ₹{stats.transferToCompany.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {/* Cash row */}
                  <tr className="bg-emerald-50 border-t border-emerald-200">
                    <td className="px-4 py-2.5 sticky left-0 bg-emerald-50 z-10"></td>
                    <td className="px-4 py-2.5 sticky left-10 bg-emerald-50 z-10">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></span>
                        <span className="text-xs font-semibold text-emerald-700">Cash</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full hidden sm:inline">Other</span>
                      </div>
                    </td>
                    {visibleNPs.map((np, idx) => {
                      const isOther = idx >= LOKMAT_COUNT;
                      const t = isOther ? monthlyRows.reduce((s, r) => s + (r.newspapers[np.name] ?? 0), 0) : 0;
                      return (
                        <td key={`mft-cash-${np.name}`} className="px-4 py-2.5 text-right tabular-nums text-xs text-emerald-600">
                          {isOther && t > 0 ? `₹${t.toFixed(0)}` : <span className="text-slate-200">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5 text-right tabular-nums font-bold text-emerald-800">
                      ₹{stats.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 border-t border-[hsl(220,15%,88%)] flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {viewMode === 'daily' && `${dailyRows.length} hawker${dailyRows.length !== 1 ? 's' : ''} · ${formatDate(selectedDate)}`}
            {viewMode === 'fullday' && `${fullDayRows.length} hawker${fullDayRows.length !== 1 ? 's' : ''} · ${formatDate(rangeFrom)} – ${formatDate(rangeTo)}`}
            {viewMode === 'monthly' && `${monthlyRows.length} hawker${monthlyRows.length !== 1 ? 's' : ''} · ${selectedMonth}`}
            {selectedGroupId !== 'all' && ` · ${groups.find((g) => g.id === selectedGroupId)?.name}`}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={handleDownloadCSV} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
              <Download size={12} /> Download CSV
            </button>
            <span className="text-slate-300">|</span>
            <button onClick={handlePrint} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors">
              <FileText size={12} /> Print / PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
