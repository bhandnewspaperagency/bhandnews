'use client';

import React, { useEffect, useState } from 'react';
import { IndianRupee, Users, MessageSquare, AlertTriangle, TrendingUp, FileText, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { getBillingRecords, getHawkers } from '@/lib/storage';
import type { DailyBillingRecord, Hawker } from '@/lib/storage';
import MonthlyTrendChart from './MonthlyTrendChart';
import NewspaperVolumeChart from './NewspaperVolumeChart';

interface DashboardOverviewProps {
  onNavigate: (section: string) => void;
}

export default function DashboardOverview({ onNavigate }: DashboardOverviewProps) {
  const [allBilling, setAllBilling] = useState<DailyBillingRecord[]>([]);
  const [allHawkers, setAllHawkers] = useState<Hawker[]>([]);

  useEffect(() => {
    setAllBilling(getBillingRecords());
    setAllHawkers(getHawkers());
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBills = allBilling.filter((b) => b.date === todayStr);
  const totalBillToday = todayBills.reduce((sum, b) => sum + b.totalBill, 0);
  const whatsappSent = todayBills.filter((b) => b.whatsappSent).length;
  const activeHawkers = allHawkers.filter((h) => h.status === 'Active').length;
  const pendingHawkers = Math.max(0, activeHawkers - todayBills.length);
  const avgBill = todayBills.length > 0 ? totalBillToday / todayBills.length : 0;
  const monthlyTotal = allBilling.reduce((s, b) => s + b.totalBill, 0);

  const kpiCards = [
    {
      id: 'total-bill',
      label: "Today\'s Total Bill",
      value: `₹${totalBillToday.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sub: `${todayBills.length} hawkers billed`,
      icon: <IndianRupee size={20} />,
      color: 'text-[hsl(210,67%,23%)]',
      bg: 'bg-[hsl(210,67%,96%)]',
      trend: todayBills.length > 0 ? `${todayBills.length} entries today` : 'No entries yet',
      trendUp: todayBills.length > 0,
      span: 'col-span-1 md:col-span-2',
      hero: true,
    },
    {
      id: 'pending',
      label: 'Pending Hawkers',
      value: String(pendingHawkers),
      sub: 'Not yet billed today',
      icon: <AlertTriangle size={20} />,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      trend: pendingHawkers > 0 ? 'Requires attention' : 'All billed ✓',
      trendUp: pendingHawkers === 0,
      span: 'col-span-1',
      hero: false,
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp Sent',
      value: `${whatsappSent}/${todayBills.length}`,
      sub: 'Notifications dispatched',
      icon: <MessageSquare size={20} />,
      color: 'text-green-700',
      bg: 'bg-green-50',
      trend: whatsappSent === todayBills.length && todayBills.length > 0 ? 'All sent ✓' : `${todayBills.length - whatsappSent} pending`,
      trendUp: whatsappSent === todayBills.length,
      span: 'col-span-1',
      hero: false,
    },
    {
      id: 'monthly',
      label: 'All-Time Total',
      value: `₹${monthlyTotal.toLocaleString('en-IN')}`,
      sub: `${allBilling.length} total records`,
      icon: <TrendingUp size={20} />,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      trend: 'Stored locally',
      trendUp: true,
      span: 'col-span-1',
      hero: false,
    },
    {
      id: 'hawkers',
      label: 'Active Hawkers',
      value: String(activeHawkers),
      sub: `${allHawkers.filter((h) => h.status === 'Inactive').length} inactive`,
      icon: <Users size={20} />,
      color: 'text-[hsl(210,67%,23%)]',
      bg: 'bg-[hsl(210,67%,96%)]',
      trend: 'Registry up to date',
      trendUp: true,
      span: 'col-span-1',
      hero: false,
    },
    {
      id: 'avg',
      label: 'Avg Bill / Hawker',
      value: `₹${avgBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sub: "Today\'s average",
      icon: <FileText size={20} />,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      trend: 'Normal range',
      trendUp: true,
      span: 'col-span-1',
      hero: false,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={`kpi-${card.id}`}
            className={`kpi-card ${card.span} ${card.hero ? 'border-l-4 border-l-[hsl(210,67%,23%)]' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                {card.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${card.trendUp ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {card.trend}
              </span>
            </div>
            <p className="card-label mb-1">{card.label}</p>
            <p className={`tabular-nums font-bold ${card.hero ? 'text-4xl' : 'text-2xl'} text-slate-900`}>
              {card.value}
            </p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[hsl(220,15%,88%)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Monthly Billing Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total bills collected per month (₹)</p>
            </div>
          </div>
          <MonthlyTrendChart />
        </div>
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Top Newspapers</h3>
              <p className="text-xs text-slate-400 mt-0.5">Net qty distributed</p>
            </div>
          </div>
          <NewspaperVolumeChart />
        </div>
      </div>

      {/* Recent Billing Activity */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(220,15%,88%)]">
          <h3 className="section-title">Today&apos;s Billing Activity</h3>
          <button
            onClick={() => onNavigate('billing')}
            className="text-xs font-semibold text-[hsl(210,67%,23%)] hover:underline flex items-center gap-1"
          >
            Add Entry <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)]">
                <th className="table-header text-left">Hawker</th>
                <th className="table-header text-left">Area</th>
                <th className="table-header text-right">Total Bill</th>
                <th className="table-header text-center">Payment</th>
                <th className="table-header text-center">WhatsApp</th>
                <th className="table-header text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No billing entries for today yet.</td>
                </tr>
              ) : (
                todayBills.map((bill, i) => {
                  const hawker = allHawkers.find((h) => h.id === bill.hawkerId);
                  return (
                    <tr
                      key={`recent-${bill.id}`}
                      className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[hsl(210,67%,23%)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {bill.hawkerId}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">{bill.hawkerName}</p>
                            <p className="text-xs text-slate-400 font-mono">{hawker?.contact}</p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-slate-500">{hawker?.area || '—'}</td>
                      <td className="table-cell text-right font-semibold tabular-nums text-slate-900">
                        ₹{bill.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`status-badge ${
                          bill.paymentType === 'Cash' ? 'bg-blue-50 text-blue-700' :
                          bill.paymentType === 'UPI' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {bill.paymentType}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        {bill.whatsappSent ? (
                          <CheckCircle2 size={16} className="text-green-600 mx-auto" />
                        ) : (
                          <Clock size={16} className="text-amber-500 mx-auto" />
                        )}
                      </td>
                      <td className="table-cell text-center">
                        <span className={`status-badge ${
                          bill.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' :
                          bill.paymentStatus === 'Partial' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {bill.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-slate-50 border-t border-[hsl(220,15%,88%)] flex items-center justify-between">
          <p className="text-xs text-slate-500">{todayBills.length} entries today · {pendingHawkers} hawkers pending</p>
          <button
            onClick={() => onNavigate('hawkers')}
            className="text-xs font-semibold text-[hsl(210,67%,23%)] hover:underline flex items-center gap-1"
          >
            View All Hawkers <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}