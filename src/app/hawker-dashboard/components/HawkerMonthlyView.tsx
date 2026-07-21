'use client';

import React from 'react';
import { MonthlyTrackerRow, NEWSPAPERS } from '@/lib/mockData';
import { AlertTriangle } from 'lucide-react';

interface HawkerMonthlyViewProps {
  monthlyData: MonthlyTrackerRow | undefined;
}

export default function HawkerMonthlyView({ monthlyData }: HawkerMonthlyViewProps) {
  if (!monthlyData) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <AlertTriangle size={24} className="text-slate-300" />
        </div>
        <p className="text-slate-600 font-semibold">No monthly data available</p>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          Monthly subscription tracker data will appear here once your account is set up.
        </p>
      </div>
    );
  }

  const activeNewspapers = NEWSPAPERS.filter((np) => (monthlyData.newspapers[np.name] || 0) > 0);
  const inactiveNewspapers = NEWSPAPERS.filter((np) => !(monthlyData.newspapers[np.name] || 0));

  return (
    <div className="p-5 space-y-5">
      {/* Summary */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-[hsl(210,67%,96%)] rounded-xl border border-[hsl(210,67%,85%)]">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">April 2026 Grand Total</p>
          <p className="text-3xl font-bold tabular-nums text-[hsl(210,67%,23%)] mt-0.5">
            ₹{monthlyData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="border-l border-[hsl(210,67%,80%)] pl-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Titles</p>
          <p className="text-2xl font-bold text-slate-800 mt-0.5">{activeNewspapers.length}</p>
        </div>
        <div className="border-l border-[hsl(210,67%,80%)] pl-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inactive Titles</p>
          <p className="text-2xl font-bold text-slate-400 mt-0.5">{inactiveNewspapers.length}</p>
        </div>
      </div>

      {/* Active Newspapers */}
      {activeNewspapers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Active Subscriptions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeNewspapers.map((np) => {
              const amount = monthlyData.newspapers[np.name] || 0;
              const pct = Math.min(100, (amount / (monthlyData.grandTotal || 1)) * 100);
              return (
                <div
                  key={`hm-${np.name}`}
                  className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{np.name}</p>
                    <span className="text-xs text-slate-400 font-mono ml-2 flex-shrink-0">₹{np.rate}/copy</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums text-[hsl(210,67%,23%)]">
                    ₹{amount.toFixed(2)}
                  </p>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[hsl(210,67%,23%)] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{pct.toFixed(1)}% of total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Inactive Newspapers */}
      {inactiveNewspapers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Not Subscribed This Month</h4>
          <div className="flex flex-wrap gap-2">
            {inactiveNewspapers.map((np) => (
              <span
                key={`hmi-${np.name}`}
                className="px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-xs font-medium"
              >
                {np.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}