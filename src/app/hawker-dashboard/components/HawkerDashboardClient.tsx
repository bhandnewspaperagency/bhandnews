'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, LogOut, IndianRupee, Calendar, BookOpen, CheckCircle2, Clock, AlertTriangle, Printer } from 'lucide-react';
import { getSession, clearSession, getBillingByHawker, getMonthlyTracker, getHawkerById, restoreFromBackupIfNeeded } from '@/lib/storage';
import type { DailyBillingRecord, MonthlyTrackerRow, Hawker } from '@/lib/storage';
import HawkerBillingTable from './HawkerBillingTable';
import HawkerMonthlyView from './HawkerMonthlyView';

export default function HawkerDashboardClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'billing' | 'monthly'>('billing');
  const [hawker, setHawker] = useState<Hawker | null>(null);
  const [myBills, setMyBills] = useState<DailyBillingRecord[]>([]);
  const [myMonthly, setMyMonthly] = useState<MonthlyTrackerRow | undefined>(undefined);

  useEffect(() => {
    restoreFromBackupIfNeeded().then(() => {
      const session = getSession();
      if (!session || session.role !== 'hawker' || !session.hawkerId) {
        router.push('/sign-up-login-screen');
        return;
      }
      const h = getHawkerById(session.hawkerId);
      if (!h) {
        router.push('/sign-up-login-screen');
        return;
      }
      setHawker(h);
      setMyBills(getBillingByHawker(session.hawkerId));
      const monthly = getMonthlyTracker().find((m) => m.hawkerId === session.hawkerId);
      setMyMonthly(monthly);
    });
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/sign-up-login-screen');
  };

  if (!hawker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(220,20%,97%)]">
        <div className="w-8 h-8 border-2 border-[hsl(210,67%,23%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const todayBill = myBills.find((b) => b.date === todayStr);
  const monthTotal = myBills.reduce((s, b) => s + b.totalBill, 0);
  const newspaperCount = myMonthly
    ? Object.values(myMonthly.newspapers).filter((v) => v > 0).length
    : 0;
  const lastBill = myBills[myBills.length - 1];

  const kpis = [
    {
      id: 'today',
      label: "Today\'s Bill",
      value: todayBill ? `₹${todayBill.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
      sub: todayBill ? `${todayBill.entries.length} newspapers · ${todayBill.paymentType}` : 'No entry yet today',
      icon: <IndianRupee size={20} />,
      color: 'text-[hsl(210,67%,23%)]',
      bg: 'bg-[hsl(210,67%,96%)]',
      alert: !todayBill,
    },
    {
      id: 'monthly',
      label: 'Total Billed',
      value: `₹${monthTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      sub: `${myBills.length} billing entries`,
      icon: <Calendar size={20} />,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      alert: false,
    },
    {
      id: 'papers',
      label: 'Newspapers Subscribed',
      value: String(newspaperCount),
      sub: 'Active newspaper titles',
      icon: <BookOpen size={20} />,
      color: 'text-green-700',
      bg: 'bg-green-50',
      alert: false,
    },
    {
      id: 'payment',
      label: 'Last Bill Status',
      value: lastBill?.paymentStatus || '—',
      sub: lastBill ? `₹${lastBill.totalBill.toFixed(2)} · ${lastBill.date}` : 'No bills yet',
      icon: lastBill?.paymentStatus === 'Paid' ? <CheckCircle2 size={20} /> : <Clock size={20} />,
      color: lastBill?.paymentStatus === 'Paid' ? 'text-green-700' : 'text-amber-700',
      bg: lastBill?.paymentStatus === 'Paid' ? 'bg-green-50' : 'bg-amber-50',
      alert: lastBill?.paymentStatus === 'Pending',
    },
  ];

  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)]">
      <header className="bg-white border-b border-[hsl(220,15%,88%)] px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[hsl(210,67%,23%)] rounded-xl flex items-center justify-center flex-shrink-0">
            <Newspaper size={18} className="text-white" />
          </div>
          <div>
            <div className="text-slate-900 font-bold text-sm leading-tight">Bhand News</div>
            <div className="text-slate-400 text-xs">Paper Agency</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
          >
            <Printer size={14} />
            Print
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(36,80%,52%)] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {hawker.name.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{hawker.name}</p>
              <p className="text-[10px] text-slate-400">Hawker #{String(hawker.id).padStart(2, '0')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 xl:px-8 2xl:px-10">
        {/* Hawker Info Banner */}
        <div className="bg-[hsl(210,67%,23%)] rounded-2xl p-5 sm:p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
            <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white" />
          </div>
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {hawker.name.charAt(0)}
              </div>
              <div>
                <p className="text-[hsl(210,50%,80%)] text-xs font-semibold uppercase tracking-wide mb-0.5">
                  Hawker ID #{String(hawker.id).padStart(2, '0')}
                </p>
                <h1 className="text-white text-xl font-bold">{hawker.name}</h1>
                <p className="text-[hsl(210,50%,80%)] text-sm mt-0.5">
                  {hawker.area} · {hawker.contact}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`status-badge px-3 py-1 ${hawker.status === 'Active' ? 'bg-green-500/20 text-green-200' : 'bg-red-500/20 text-red-200'}`}>
                {hawker.status}
              </span>
              <span className="status-badge px-3 py-1 bg-white/20 text-white/80">
                {hawker.paymentType}
              </span>
              <span className="text-xs text-[hsl(210,50%,75%)]">
                Since {new Date(hawker.joinDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi) => (
            <div
              key={`hkpi-${kpi.id}`}
              className={`kpi-card ${kpi.alert ? 'border-amber-300 bg-amber-50/60' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                  {kpi.icon}
                </div>
                {kpi.alert && <AlertTriangle size={14} className="text-amber-500" />}
              </div>
              <p className="card-label mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
          <div className="flex border-b border-[hsl(220,15%,88%)] px-5">
            {[
              { id: 'billing', label: 'My Billing History' },
              { id: 'monthly', label: 'Monthly Tracker' },
            ].map((tab) => (
              <button
                key={`htab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as 'billing' | 'monthly')}
                className={`px-4 py-3.5 text-sm transition-colors ${
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="p-0">
            {activeTab === 'billing' && <HawkerBillingTable bills={myBills} />}
            {activeTab === 'monthly' && <HawkerMonthlyView monthlyData={myMonthly} />}
          </div>
        </div>
      </main>
    </div>
  );
}