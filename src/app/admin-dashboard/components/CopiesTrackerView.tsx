'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, Search, TrendingUp, Users, Newspaper, PackageOpen, PackageCheck, Layers } from 'lucide-react';
import { getBillingRecords, getHawkers, NEWSPAPERS, getNewspaperGroups } from '@/lib/storage';
import type { DailyBillingRecord, Hawker, NewspaperGroup } from '@/lib/storage';

type ViewMode = 'daily' | 'fullday' | 'monthly';

interface CopiesRow {
  hawkerId: number;
  hawkerName: string;
  newspapers: Record<string, { supply: number; return: number; net: number }>;
  totalSupply: number;
  totalReturn: number;
  totalNet: number;
}

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function getMonthName(m: number) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m];
}

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

export default function CopiesTrackerView() {
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
  const [hawkers, setHawkers] = useState<Hawker[]>([]);
  const [groups, setGroups] = useState<NewspaperGroup[]>([]);

  useEffect(() => {
    setBillingRecords(getBillingRecords());
    setHawkers(getHawkers());
    setGroups(getNewspaperGroups());
  }, []);

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

  const filterEntriesByGroup = (entries: DailyBillingRecord['entries']) => {
    if (selectedGroupId === 'all') return entries;
    const npSet = new Set(activeNPs.map((n) => n.name));
    return entries.filter((e) => npSet.has(e.newspaper));
  };

  // Build copies row from billing entries
  function buildCopiesRow(entries: DailyBillingRecord['entries']): Pick<CopiesRow, 'newspapers' | 'totalSupply' | 'totalReturn' | 'totalNet'> {
    const newspapers: CopiesRow['newspapers'] = {};
    let totalSupply = 0;
    let totalReturn = 0;
    for (const e of entries) {
      newspapers[e.newspaper] = {
        supply: e.supplyQty,
        return: e.returnQty,
        net: e.netQty,
      };
      totalSupply += e.supplyQty;
      totalReturn += e.returnQty;
    }
    return { newspapers, totalSupply, totalReturn, totalNet: totalSupply - totalReturn };
  }

  // ─── Daily View ─────────────────────────────────────────────────────────────
  const dailyRows = useMemo<CopiesRow[]>(() => {
    const records = billingRecords.filter((b) => b.date === selectedDate);
    return records
      .filter(
        (r) =>
          r.hawkerName.toLowerCase().includes(search.toLowerCase()) ||
          String(r.hawkerId).includes(search)
      )
      .map((r) => {
        const filtered = filterEntriesByGroup(r.entries);
        const { newspapers, totalSupply, totalReturn, totalNet } = buildCopiesRow(filtered);
        return { hawkerId: r.hawkerId, hawkerName: r.hawkerName, newspapers, totalSupply, totalReturn, totalNet };
      })
      .filter((r) => selectedGroupId === 'all' || r.totalSupply > 0);
  }, [billingRecords, selectedDate, search, selectedGroupId, activeNPs]);

  // ─── Full Day Range View ─────────────────────────────────────────────────────
  const fullDayRows = useMemo<CopiesRow[]>(() => {
    const records = billingRecords.filter((b) => b.date >= rangeFrom && b.date <= rangeTo);
    const map = new Map<number, CopiesRow>();
    for (const r of records) {
      const filtered = filterEntriesByGroup(r.entries);
      if (selectedGroupId !== 'all' && filtered.length === 0) continue;
      if (!map.has(r.hawkerId)) {
        map.set(r.hawkerId, { hawkerId: r.hawkerId, hawkerName: r.hawkerName, newspapers: {}, totalSupply: 0, totalReturn: 0, totalNet: 0 });
      }
      const row = map.get(r.hawkerId)!;
      for (const e of filtered) {
        if (!row.newspapers[e.newspaper]) row.newspapers[e.newspaper] = { supply: 0, return: 0, net: 0 };
        row.newspapers[e.newspaper].supply += e.supplyQty;
        row.newspapers[e.newspaper].return += e.returnQty;
        row.newspapers[e.newspaper].net += e.netQty;
        row.totalSupply += e.supplyQty;
        row.totalReturn += e.returnQty;
        row.totalNet += e.netQty;
      }
    }
    return Array.from(map.values())
      .filter(
        (r) =>
          r.hawkerName.toLowerCase().includes(search.toLowerCase()) ||
          String(r.hawkerId).includes(search)
      )
      .sort((a, b) => a.hawkerId - b.hawkerId);
  }, [billingRecords, rangeFrom, rangeTo, search, selectedGroupId, activeNPs]);

  // ─── Monthly View ────────────────────────────────────────────────────────────
  const monthlyRows = useMemo<CopiesRow[]>(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const records = billingRecords.filter((b) => b.date.startsWith(prefix));
    const map = new Map<number, CopiesRow>();
    for (const r of records) {
      const filtered = filterEntriesByGroup(r.entries);
      if (selectedGroupId !== 'all' && filtered.length === 0) continue;
      if (!map.has(r.hawkerId)) {
        map.set(r.hawkerId, { hawkerId: r.hawkerId, hawkerName: r.hawkerName, newspapers: {}, totalSupply: 0, totalReturn: 0, totalNet: 0 });
      }
      const row = map.get(r.hawkerId)!;
      for (const e of filtered) {
        if (!row.newspapers[e.newspaper]) row.newspapers[e.newspaper] = { supply: 0, return: 0, net: 0 };
        row.newspapers[e.newspaper].supply += e.supplyQty;
        row.newspapers[e.newspaper].return += e.returnQty;
        row.newspapers[e.newspaper].net += e.netQty;
        row.totalSupply += e.supplyQty;
        row.totalReturn += e.returnQty;
        row.totalNet += e.netQty;
      }
    }
    return Array.from(map.values())
      .filter(
        (r) =>
          r.hawkerName.toLowerCase().includes(search.toLowerCase()) ||
          String(r.hawkerId).includes(search)
      )
      .sort((a, b) => a.hawkerId - b.hawkerId);
  }, [billingRecords, selectedMonth, search, selectedGroupId, activeNPs]);

  const activeRows = viewMode === 'daily' ? dailyRows : viewMode === 'fullday' ? fullDayRows : monthlyRows;

  const stats = useMemo(() => {
    let totalSupply = activeRows.reduce((s, r) => s + r.totalSupply, 0);
    let totalReturn = activeRows.reduce((s, r) => s + r.totalReturn, 0);
    const totalNet = activeRows.reduce((s, r) => s + r.totalNet, 0);
    let label = '';
    if (viewMode === 'daily') label = `Date: ${formatDate(selectedDate)}`;
    else if (viewMode === 'fullday') label = `${formatDate(rangeFrom)} – ${formatDate(rangeTo)}`;
    else {
      const [y, m] = selectedMonth.split('-').map(Number);
      label = `${getMonthName(m - 1)} ${y}`;
    }
    return { hawkers: activeRows.length, totalSupply, totalReturn, totalNet, label };
  }, [activeRows, viewMode, selectedDate, rangeFrom, rangeTo, selectedMonth]);

  const visibleNPs = activeNPs.slice(0, 8);

  const handleDownloadCSV = () => {
    const npNames = visibleNPs.map((n) => n.name);
    const header = ['#', 'Hawker', ...npNames.flatMap((np) => [`${np} Supply`, `${np} Return`, `${np} Net`]), 'Total Supply', 'Total Return', 'Net Copies'];
    const rows = activeRows.map((r) => [
      String(r.hawkerId),
      r.hawkerName,
      ...npNames.flatMap((np) => [
        String(r.newspapers[np]?.supply ?? 0),
        String(r.newspapers[np]?.return ?? 0),
        String(r.newspapers[np]?.net ?? 0),
      ]),
      String(r.totalSupply),
      String(r.totalReturn),
      String(r.totalNet),
    ]);
    const suffix = viewMode === 'daily' ? selectedDate : viewMode === 'fullday' ? `${rangeFrom}-to-${rangeTo}` : selectedMonth;
    downloadCSV(`copies-tracker-${suffix}.csv`, [header, ...rows]);
  };

  const handlePrint = () => {
    const npNames = visibleNPs.map((n) => n.name);
    let title = '';
    if (viewMode === 'daily') title = `Copies Tracker — ${formatDate(selectedDate)}`;
    else if (viewMode === 'fullday') title = `Copies Tracker — ${formatDate(rangeFrom)} to ${formatDate(rangeTo)}`;
    else {
      const [y, m] = selectedMonth.split('-').map(Number);
      title = `Copies Tracker — ${getMonthName(m - 1)} ${y}`;
    }
    const headerCells = ['#', 'Hawker', ...npNames.flatMap((np) => [`${np} S`, `${np} R`, `${np} Net`]), 'Supply', 'Return', 'Net']
      .map((h) => `<th>${h}</th>`).join('');
    const bodyRows = activeRows.map((r) =>
      `<tr><td>#${r.hawkerId}</td><td>${r.hawkerName}</td>${npNames.flatMap((np) =>
        [`<td>${r.newspapers[np]?.supply ?? 0}</td>`, `<td>${r.newspapers[np]?.return ?? 0}</td>`, `<td><b>${r.newspapers[np]?.net ?? 0}</b></td>`]
      ).join('')}<td><b>${r.totalSupply}</b></td><td>${r.totalReturn}</td><td><b>${r.totalNet}</b></td></tr>`
    ).join('');
    const footRow = `<tr><td colspan="${2 + npNames.length * 3}"><b>Grand Total</b></td><td><b>${stats.totalSupply}</b></td><td>${stats.totalReturn}</td><td><b>${stats.totalNet}</b></td></tr>`;
    const tableHtml = `<h2>${title}</h2><p>${activeRows.length} hawkers</p><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody><tfoot>${footRow}</tfoot></table>`;
    printTable(title, tableHtml);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Copies Tracker</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track newspaper copies taken (supply) and returned per hawker</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Users size={15} className="text-[hsl(210,67%,23%)]" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hawkers</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.hawkers}</p>
          <p className="text-xs text-slate-400 mt-0.5">{stats.label}</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <PackageOpen size={15} className="text-blue-600" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Total Supply</span>
          </div>
          <p className="text-2xl font-bold text-blue-800">{stats.totalSupply.toLocaleString('en-IN')}</p>
          <p className="text-xs text-blue-400 mt-0.5">Copies taken</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <PackageCheck size={15} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Total Return</span>
          </div>
          <p className="text-2xl font-bold text-amber-800">{stats.totalReturn.toLocaleString('en-IN')}</p>
          <p className="text-xs text-amber-400 mt-0.5">Copies returned</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Net Copies</span>
          </div>
          <p className="text-2xl font-bold text-emerald-800">{stats.totalNet.toLocaleString('en-IN')}</p>
          <p className="text-xs text-emerald-400 mt-0.5">Supply − Return</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        {/* Legend */}
        <div className="px-5 py-3 border-b border-[hsl(220,15%,88%)] bg-slate-50 flex items-center gap-4 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legend:</span>
          <span className="flex items-center gap-1.5 text-xs text-blue-700"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>S = Supply (Taken)</span>
          <span className="flex items-center gap-1.5 text-xs text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>R = Return</span>
          <span className="flex items-center gap-1.5 text-xs text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>Net = S − R</span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)] bg-slate-50">
                <th className="table-header text-left sticky left-0 bg-slate-50 z-10 w-10">#</th>
                <th className="table-header text-left sticky left-10 bg-slate-50 z-10 min-w-[150px]">Hawker</th>
                {visibleNPs.map((np) => (
                  <th key={`cth-${np.name}`} className="table-header text-center min-w-[120px] whitespace-nowrap" colSpan={3}>
                    {np.name}
                  </th>
                ))}
                <th className="table-header text-center min-w-[60px] bg-blue-50 text-blue-700">Supply</th>
                <th className="table-header text-center min-w-[60px] bg-amber-50 text-amber-700">Return</th>
                <th className="table-header text-center min-w-[60px] bg-emerald-50 text-emerald-700">Net</th>
              </tr>
              <tr className="border-b border-[hsl(220,15%,88%)] bg-slate-50/60">
                <th className="sticky left-0 bg-slate-50/60 z-10"></th>
                <th className="sticky left-10 bg-slate-50/60 z-10"></th>
                {visibleNPs.map((np) => (
                  <React.Fragment key={`csh-${np.name}`}>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-blue-600 text-center border-l border-[hsl(220,15%,93%)]">S</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-amber-600 text-center">R</th>
                    <th className="px-2 py-1.5 text-[10px] font-semibold text-emerald-600 text-center">Net</th>
                  </React.Fragment>
                ))}
                <th className="bg-blue-50"></th>
                <th className="bg-amber-50"></th>
                <th className="bg-emerald-50"></th>
              </tr>
            </thead>
            <tbody>
              {activeRows.length === 0 ? (
                <tr>
                  <td colSpan={3 + visibleNPs.length * 3 + 3} className="text-center py-12 text-slate-400 text-sm">
                    <Newspaper size={32} className="mx-auto mb-2 text-slate-200" />
                    No copies data for selected {viewMode === 'daily' ? 'date' : viewMode === 'fullday' ? 'range' : 'month'}
                  </td>
                </tr>
              ) : (
                activeRows.map((row, i) => (
                  <tr
                    key={`cr-${row.hawkerId}`}
                    className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50/80 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}
                  >
                    <td className="table-cell sticky left-0 bg-inherit z-10">
                      <span className="font-mono text-xs text-slate-500">#{String(row.hawkerId).padStart(2, '0')}</span>
                    </td>
                    <td className="table-cell sticky left-10 bg-inherit z-10 font-semibold text-slate-800 truncate max-w-[150px]">{row.hawkerName}</td>
                    {visibleNPs.map((np) => {
                      const d = row.newspapers[np.name];
                      return (
                        <React.Fragment key={`cr-${row.hawkerId}-${np.name}`}>
                          <td className="px-2 py-2.5 text-center tabular-nums border-l border-[hsl(220,15%,93%)]">
                            {d?.supply ? <span className="text-blue-700 font-medium">{d.supply}</span> : <span className="text-slate-200">—</span>}
                          </td>
                          <td className="px-2 py-2.5 text-center tabular-nums">
                            {d?.return ? <span className="text-amber-700">{d.return}</span> : <span className="text-slate-200">—</span>}
                          </td>
                          <td className="px-2 py-2.5 text-center tabular-nums">
                            {d?.net !== undefined && d.net > 0 ? (
                              <span className="text-emerald-700 font-semibold">{d.net}</span>
                            ) : d?.net === 0 && d?.supply > 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="table-cell text-center tabular-nums font-bold text-blue-700 bg-blue-50/50">{row.totalSupply}</td>
                    <td className="table-cell text-center tabular-nums font-medium text-amber-700 bg-amber-50/50">{row.totalReturn}</td>
                    <td className="table-cell text-center tabular-nums font-bold text-emerald-700 bg-emerald-50/50">{row.totalNet}</td>
                  </tr>
                ))
              )}
            </tbody>
            {activeRows.length > 0 && (
              <tfoot>
                <tr className="bg-[hsl(210,67%,23%)] text-white font-bold">
                  <td className="px-4 py-3 sticky left-0 bg-[hsl(210,67%,23%)] z-10"></td>
                  <td className="px-4 py-3 sticky left-10 bg-[hsl(210,67%,23%)] z-10 text-xs uppercase tracking-wide">Totals</td>
                  {visibleNPs.map((np) => {
                    const s = activeRows.reduce((sum, r) => sum + (r.newspapers[np.name]?.supply ?? 0), 0);
                    const ret = activeRows.reduce((sum, r) => sum + (r.newspapers[np.name]?.return ?? 0), 0);
                    const net = activeRows.reduce((sum, r) => sum + (r.newspapers[np.name]?.net ?? 0), 0);
                    return (
                      <React.Fragment key={`cft-${np.name}`}>
                        <td className="px-2 py-3 text-center tabular-nums text-xs border-l border-white/20">{s > 0 ? s : '—'}</td>
                        <td className="px-2 py-3 text-center tabular-nums text-xs">{ret > 0 ? ret : '—'}</td>
                        <td className="px-2 py-3 text-center tabular-nums text-xs">{net > 0 ? net : '—'}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-4 py-3 text-center tabular-nums">{stats.totalSupply}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{stats.totalReturn}</td>
                  <td className="px-4 py-3 text-center tabular-nums">{stats.totalNet}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-[hsl(220,15%,88%)] flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {activeRows.length} hawker{activeRows.length !== 1 ? 's' : ''}
            {viewMode === 'daily' && ` · ${formatDate(selectedDate)}`}
            {viewMode === 'fullday' && ` · ${formatDate(rangeFrom)} – ${formatDate(rangeTo)}`}
            {viewMode === 'monthly' && ` · ${selectedMonth}`}
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
