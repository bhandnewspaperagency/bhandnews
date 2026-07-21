'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, PieChart as PieIcon, Download } from 'lucide-react';
import MonthlyTrendChart from './MonthlyTrendChart';
import NewspaperVolumeChart from './NewspaperVolumeChart';
import PaymentStatusChart from './PaymentStatusChart';
import { MOCK_DAILY_BILLING, MASTER_DATA } from '@/lib/mockData';

export default function ReportsView() {
  const [activeReport, setActiveReport] = useState<'overview' | 'newspaper' | 'payment'>('overview');

  const todayBills = MOCK_DAILY_BILLING.filter((b) => b.date === '2026-04-23');
  const totalToday = todayBills.reduce((s, b) => s + b.totalBill, 0);
  const paidCount = todayBills.filter((b) => b.paymentStatus === 'Paid').length;
  const pendingCount = todayBills.filter((b) => b.paymentStatus === 'Pending').length;
  const partialCount = todayBills.filter((b) => b.paymentStatus === 'Partial').length;

  const REPORT_TABS = [
    { id: 'overview', label: 'Monthly Trend', icon: <TrendingUp size={14} /> },
    { id: 'newspaper', label: 'Newspaper Volume', icon: <BarChart3 size={14} /> },
    { id: 'payment', label: 'Payment Status', icon: <PieIcon size={14} /> },
  ] as const;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Billing and distribution insights for Bhand News Paper Agency</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors">
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: `₹${totalToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, color: 'text-[hsl(210,67%,23%)]', bg: 'bg-[hsl(210,67%,96%)]' },
          { label: 'Bills Paid', value: String(paidCount), color: 'text-green-700', bg: 'bg-green-50' },
          { label: 'Pending Payment', value: String(pendingCount), color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'Partial Payment', value: String(partialCount), color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map((s) => (
          <div key={`rpt-sum-${s.label}`} className={`rounded-xl p-4 ${s.bg} border border-transparent`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Chart Tabs */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[hsl(220,15%,88%)] px-5">
          {REPORT_TABS.map((tab) => (
            <button
              key={`rtab-${tab.id}`}
              onClick={() => setActiveReport(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm transition-colors ${
                activeReport === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeReport === 'overview' && (
            <div>
              <p className="text-xs text-slate-400 mb-4">Total monthly billing collections — Nov 2025 to Apr 2026</p>
              <MonthlyTrendChart />
            </div>
          )}
          {activeReport === 'newspaper' && (
            <div>
              <p className="text-xs text-slate-400 mb-4">Net copies distributed today by newspaper title</p>
              <div className="h-64">
                <NewspaperVolumeChart />
              </div>
            </div>
          )}
          {activeReport === 'payment' && (
            <div>
              <p className="text-xs text-slate-400 mb-4">Payment status distribution across all hawkers this month</p>
              <PaymentStatusChart />
            </div>
          )}
        </div>
      </div>

      {/* Top Hawkers Table */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(220,15%,88%)]">
          <h3 className="section-title">Top Hawkers by Bill Amount — April 2026</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)]">
                <th className="table-header text-left w-10">Rank</th>
                <th className="table-header text-left">Hawker</th>
                <th className="table-header text-left">Area</th>
                <th className="table-header text-right">Total Bill</th>
                <th className="table-header text-center">Payment</th>
                <th className="table-header text-center">WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DAILY_BILLING
                .filter((b) => b.date === '2026-04-23')
                .sort((a, b) => b.totalBill - a.totalBill)
                .map((bill, i) => {
                  const hawker = MASTER_DATA.find((h) => h.id === bill.hawkerId);
                  return (
                    <tr key={`top-${bill.id}`} className="border-b border-[hsl(220,15%,93%)] hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <span className={`font-bold text-sm tabular-nums ${
                          i === 0 ? 'text-[hsl(36,80%,52%)]' : i === 1 ? 'text-slate-400' : 'text-slate-300'
                        }`}>
                          #{i + 1}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[hsl(210,67%,23%)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {bill.hawkerId}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{bill.hawkerName}</span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-500 text-sm">{hawker?.area}</td>
                      <td className="table-cell text-right font-bold tabular-nums text-slate-900">
                        ₹{bill.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`status-badge ${
                          bill.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' :
                          bill.paymentStatus === 'Partial'? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </td>
                      <td className="table-cell text-center text-xs">
                        {bill.whatsappSent ? (
                          <span className="text-green-600 font-semibold">Sent ✓</span>
                        ) : (
                          <span className="text-amber-500 font-semibold">Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}