'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react';
import { getMonthlyTracker, NEWSPAPERS } from '@/lib/cloudStorage';
import type { MonthlyTrackerRow } from '@/lib/cloudStorage';
import { toast } from 'sonner';

const VISIBLE_NEWSPAPERS = NEWSPAPERS?.slice(0, 8);

export default function MonthlyTrackerView() {
  const [data, setData] = useState<MonthlyTrackerRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const perPage = 10;

  useEffect(() => {
    getMonthlyTracker().then(setData);
  }, []);

  const filtered = useMemo(() =>
    data?.filter(
      (r) =>
        r?.hawkerName?.toLowerCase()?.includes(search?.toLowerCase()) ||
        String(r?.hawkerId)?.includes(search)
    ),
    [data, search]
  );

  const totalPages = Math.ceil(filtered?.length / perPage);
  const paginated = filtered?.slice((page - 1) * perPage, page * perPage);

  const columnTotals = VISIBLE_NEWSPAPERS?.map((np) =>
    filtered?.reduce((sum, row) => sum + (row?.newspapers?.[np?.name] || 0), 0)
  );
  const grandTotalSum = filtered?.reduce((sum, row) => sum + row?.grandTotal, 0);

  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) {
      toast.error('No data to export.');
      return;
    }
    const npNames = VISIBLE_NEWSPAPERS?.map((np) => np?.name) ?? [];
    const header = ['ID', 'Hawker Name', ...npNames, 'Grand Total'];
    const csvRows = filtered.map((row) => [
      String(row?.hawkerId),
      row?.hawkerName,
      ...npNames.map((np) => String(row?.newspapers?.[np]?.toFixed(2) ?? '0.00')),
      row?.grandTotal?.toFixed(2),
    ]);
    const csv = [header, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} rows to CSV.`);
  };

  const handleReset = () => {
    getMonthlyTracker().then((fresh) => {
      setData(fresh);
      setSearch('');
      setPage(1);
      setShowConfirm(false);
      toast.success('Monthly tracker has been reset to zero. You can start fresh entries now.');
    });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Confirm Reset Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <RotateCcw size={18} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Reset Monthly Tracker?</h3>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              This will reset the <strong>monthly tracker display to zero</strong>. Your billing records will be preserved. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Monthly Tracker</h2>
          <p className="text-sm text-slate-500 mt-0.5">Newspaper-wise monthly billing per hawker</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            <RotateCcw size={14} />
            Reset to Zero
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>
      <div className="relative max-w-xs">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search hawker…"
          className="input-field pl-9 text-sm"
          value={search}
          onChange={(e) => { setSearch(e?.target?.value); setPage(1); }}
        />
      </div>
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)] bg-slate-50">
                <th className="table-header text-left sticky left-0 bg-slate-50 z-10 w-10">ID</th>
                <th className="table-header text-left sticky left-10 bg-slate-50 z-10 min-w-[160px]">Hawker Name</th>
                {VISIBLE_NEWSPAPERS?.map((np) => (
                  <th key={`mth-col-${np?.name}`} className="table-header text-right min-w-[90px] whitespace-nowrap">
                    {np?.name}
                  </th>
                ))}
                <th className="table-header text-right min-w-[100px] bg-[hsl(210,67%,97%)]">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {paginated?.length === 0 ? (
                <tr>
                  <td colSpan={VISIBLE_NEWSPAPERS.length + 3} className="px-6 py-10 text-center text-slate-400 text-sm">
                    No records found. Start adding daily billing entries to populate the tracker.
                  </td>
                </tr>
              ) : (
                paginated?.map((row, i) => (
                  <tr
                    key={`mtr-${row?.hawkerId}`}
                    className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}
                  >
                    <td className="table-cell sticky left-0 bg-inherit z-10">
                      <span className="font-mono text-xs text-slate-500">#{String(row?.hawkerId)?.padStart(2, '0')}</span>
                    </td>
                    <td className="table-cell sticky left-10 bg-inherit z-10 font-semibold text-slate-800 truncate max-w-[160px]">
                      {row?.hawkerName}
                    </td>
                    {VISIBLE_NEWSPAPERS?.map((np) => {
                      const val = row?.newspapers?.[np?.name] || 0;
                      return (
                        <td key={`mtr-${row?.hawkerId}-${np?.name}`} className="table-cell text-right tabular-nums">
                          {val > 0 ? (
                            <span className="text-slate-700">₹{val?.toFixed(2)}</span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="table-cell text-right tabular-nums font-bold text-[hsl(210,67%,23%)] bg-[hsl(210,67%,98%)]">
                      ₹{row?.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-[hsl(210,67%,23%)] text-white font-bold">
                <td className="px-4 py-3 sticky left-0 bg-[hsl(210,67%,23%)] z-10 text-xs"></td>
                <td className="px-4 py-3 sticky left-10 bg-[hsl(210,67%,23%)] z-10 text-xs uppercase tracking-wide">
                  Column Totals
                </td>
                {columnTotals?.map((total, i) => (
                  <td key={`col-total-${i}`} className="px-4 py-3 text-right tabular-nums text-xs">
                    ₹{total?.toFixed(0)}
                  </td>
                ))}
                <td className="px-4 py-3 text-right tabular-nums">
                  ₹{grandTotalSum?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-[hsl(220,15%,88%)] flex items-center justify-between">
          <p className="text-xs text-slate-500">{filtered?.length} hawkers · {filtered?.length > 0 ? `Showing ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered?.length)}` : 'No records'}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-[hsl(220,15%,88%)] bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-slate-600 px-2">Page {page} of {Math.max(1, totalPages)}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="w-8 h-8 rounded-lg border border-[hsl(220,15%,88%)] bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}