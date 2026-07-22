'use client';

import React, { useState } from 'react';
import {
  IndianRupee,
  Gift,
  CreditCard,
  Calendar,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { NEWSPAPERS } from '@/lib/mockData';

interface NewspaperRate {
  name: string;
  rate: number;
  freeCopies: number;
}

interface PaymentType {
  id: string;
  label: string;
  enabled: boolean;
}

interface BillingCycle {
  startDay: number;
  endDay: number;
  dueDays: number;
  autoGenerate: boolean;
}

interface UserRole {
  id: string;
  role: string;
  canViewBilling: boolean;
  canEditRates: boolean;
  canManageHawkers: boolean;
  canViewReports: boolean;
  canAccessSettings: boolean;
}

const SECTION_TABS = [
  { id: 'rates', label: 'Newspaper Rates', icon: <IndianRupee size={16} /> },
  { id: 'free', label: 'Free Copy Limits', icon: <Gift size={16} /> },
  { id: 'payment', label: 'Payment Types', icon: <CreditCard size={16} /> },
  { id: 'billing', label: 'Billing Cycle', icon: <Calendar size={16} /> },
  { id: 'access', label: 'User Access', icon: <ShieldCheck size={16} /> },
];

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('rates');
  const [saved, setSaved] = useState(false);

  // --- Newspaper Rates & Free Copies ---
  const [rates, setRates] = useState<NewspaperRate[]>(
    NEWSPAPERS.map((n) => ({ name: n.name, rate: n.rate, freeCopies: 2 }))
  );

  // --- Payment Types ---
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([
    { id: 'cash', label: 'Cash', enabled: true },
    { id: 'upi', label: 'UPI', enabled: true },
    { id: 'credit', label: 'Credit', enabled: true },
    { id: 'transfer', label: 'Bank Transfer', enabled: false },
    { id: 'cheque', label: 'Cheque', enabled: false },
  ]);
  const [newPaymentLabel, setNewPaymentLabel] = useState('');

  // --- Billing Cycle ---
  const [billingCycle, setBillingCycle] = useState<BillingCycle>({
    startDay: 1,
    endDay: 31,
    dueDays: 7,
    autoGenerate: true,
  });

  // --- User Access ---
  const [userRoles, setUserRoles] = useState<UserRole[]>([
    {
      id: 'admin',
      role: 'Admin',
      canViewBilling: true,
      canEditRates: true,
      canManageHawkers: true,
      canViewReports: true,
      canAccessSettings: true,
    },
    {
      id: 'manager',
      role: 'Manager',
      canViewBilling: true,
      canEditRates: true,
      canManageHawkers: true,
      canViewReports: true,
      canAccessSettings: false,
    },
    {
      id: 'operator',
      role: 'Operator',
      canViewBilling: true,
      canEditRates: false,
      canManageHawkers: false,
      canViewReports: false,
      canAccessSettings: false,
    },
    {
      id: 'viewer',
      role: 'Viewer',
      canViewBilling: true,
      canEditRates: false,
      canManageHawkers: false,
      canViewReports: true,
      canAccessSettings: false,
    },
  ]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleRateChange = (index: number, field: 'rate' | 'freeCopies', value: string) => {
    const updated = [...rates];
    updated[index] = { ...updated[index], [field]: parseFloat(value) || 0 };
    setRates(updated);
  };

  const handleResetRates = () => {
    setRates(NEWSPAPERS.map((n) => ({ name: n.name, rate: n.rate, freeCopies: 2 })));
  };

  const togglePaymentType = (id: string) => {
    setPaymentTypes((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const addPaymentType = () => {
    const label = newPaymentLabel.trim();
    if (!label) return;
    setPaymentTypes((prev) => [
      ...prev,
      { id: label.toLowerCase().replace(/\s+/g, '_'), label, enabled: true },
    ]);
    setNewPaymentLabel('');
  };

  const removePaymentType = (id: string) => {
    setPaymentTypes((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleRolePermission = (roleId: string, perm: keyof Omit<UserRole, 'id' | 'role'>) => {
    if (roleId === 'admin') return; // Admin permissions are locked
    setUserRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, [perm]: !r[perm] } : r))
    );
  };

  const PERMISSIONS: { key: keyof Omit<UserRole, 'id' | 'role'>; label: string }[] = [
    { key: 'canViewBilling', label: 'View Billing' },
    { key: 'canEditRates', label: 'Edit Rates' },
    { key: 'canManageHawkers', label: 'Manage Hawkers' },
    { key: 'canViewReports', label: 'View Reports' },
    { key: 'canAccessSettings', label: 'Access Settings' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure defaults for rates, billing, payments, and access</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-100 text-green-700 border border-green-200' :'bg-[hsl(210,67%,23%)] text-white hover:bg-[hsl(210,67%,18%)]'
          }`}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center min-w-[120px] ${
              activeTab === tab.id
                ? 'bg-white text-[hsl(210,67%,23%)] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

        {/* ── Newspaper Rates ── */}
        {activeTab === 'rates' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-slate-800">Newspaper Rates</h2>
                <p className="text-xs text-slate-500 mt-0.5">Default per-copy rates used in billing</p>
              </div>
              <button
                onClick={handleResetRates}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw size={13} /> Reset to Default
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Newspaper</th>
                    <th className="text-center px-4 py-3 font-semibold">Rate (₹)</th>
                    <th className="text-center px-4 py-3 font-semibold">Free Copies / Hawker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rates.map((row, i) => (
                    <tr key={row.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          step={0.10}
                          value={row.rate}
                          onChange={(e) => handleRateChange(i, 'rate', e.target.value)}
                          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={row.freeCopies}
                          onChange={(e) => handleRateChange(i, 'freeCopies', e.target.value)}
                          className="w-20 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Free Copy Limits ── */}
        {activeTab === 'free' && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Free Copy Limits per Hawker</h2>
              <p className="text-xs text-slate-500 mt-0.5">Maximum free copies a hawker can receive per newspaper per day</p>
            </div>
            <div className="p-5 space-y-3">
              {rates.map((row, i) => (
                <div key={row.name} className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-50 last:border-0">
                  <span className="text-sm font-medium text-slate-700 flex-1">{row.name}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const updated = [...rates];
                        updated[i] = { ...updated[i], freeCopies: Math.max(0, updated[i].freeCopies - 1) };
                        setRates(updated);
                      }}
                      className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-base font-bold"
                    >−</button>
                    <span className="w-10 text-center font-semibold text-slate-800 text-sm">{row.freeCopies}</span>
                    <button
                      onClick={() => {
                        const updated = [...rates];
                        updated[i] = { ...updated[i], freeCopies: updated[i].freeCopies + 1 };
                        setRates(updated);
                      }}
                      className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-base font-bold"
                    >+</button>
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right">copies/day</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Payment Types ── */}
        {activeTab === 'payment' && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Accepted Payment Types</h2>
              <p className="text-xs text-slate-500 mt-0.5">Enable or disable payment methods available during billing</p>
            </div>
            <div className="p-5 space-y-2">
              {paymentTypes.map((pt) => (
                <div
                  key={pt.id}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-700">{pt.label}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${pt.enabled ? 'text-green-600' : 'text-slate-400'}`}>
                      {pt.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <button onClick={() => togglePaymentType(pt.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      {pt.enabled
                        ? <ToggleRight size={26} className="text-[hsl(210,67%,23%)]" />
                        : <ToggleLeft size={26} />}
                    </button>
                    <button
                      onClick={() => removePaymentType(pt.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                      title="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add new */}
              <div className="flex gap-2 pt-3">
                <input
                  type="text"
                  placeholder="Add new payment type..."
                  value={newPaymentLabel}
                  onChange={(e) => setNewPaymentLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPaymentType()}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                />
                <button
                  onClick={addPaymentType}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(210,67%,23%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(210,67%,18%)] transition-colors"
                >
                  <Plus size={15} /> Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Billing Cycle ── */}
        {activeTab === 'billing' && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Monthly Billing Cycle</h2>
              <p className="text-xs text-slate-500 mt-0.5">Configure the monthly billing period and due date rules</p>
            </div>
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Billing Start Day
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={billingCycle.startDay}
                      onChange={(e) => setBillingCycle((p) => ({ ...p, startDay: parseInt(e.target.value) || 1 }))}
                      className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                    />
                    <span className="text-sm text-slate-500">of every month</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Billing End Day
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={billingCycle.endDay}
                      onChange={(e) => setBillingCycle((p) => ({ ...p, endDay: parseInt(e.target.value) || 31 }))}
                      className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                    />
                    <span className="text-sm text-slate-500">of every month</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Payment Due (days after cycle end)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={billingCycle.dueDays}
                      onChange={(e) => setBillingCycle((p) => ({ ...p, dueDays: parseInt(e.target.value) || 0 }))}
                      className="w-24 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                    />
                    <span className="text-sm text-slate-500">days</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    Auto-Generate Monthly Bills
                  </label>
                  <button
                    onClick={() => setBillingCycle((p) => ({ ...p, autoGenerate: !p.autoGenerate }))}
                    className="flex items-center gap-2 mt-1"
                  >
                    {billingCycle.autoGenerate
                      ? <ToggleRight size={28} className="text-[hsl(210,67%,23%)]" />
                      : <ToggleLeft size={28} className="text-slate-400" />}
                    <span className={`text-sm font-medium ${billingCycle.autoGenerate ? 'text-[hsl(210,67%,23%)]' : 'text-slate-400'}`}>
                      {billingCycle.autoGenerate ? 'Enabled' : 'Disabled'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Summary card */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cycle Preview</p>
                <p className="text-sm text-slate-700">
                  Bills are generated from <strong>day {billingCycle.startDay}</strong> to{' '}
                  <strong>day {billingCycle.endDay}</strong> of each month.
                  Payment is due <strong>{billingCycle.dueDays} day{billingCycle.dueDays !== 1 ? 's' : ''}</strong> after the cycle ends.
                  Auto-generation is <strong>{billingCycle.autoGenerate ? 'on' : 'off'}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── User Access Controls ── */}
        {activeTab === 'access' && (
          <div>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">User Access Controls</h2>
              <p className="text-xs text-slate-500 mt-0.5">Define what each role can access. Admin permissions are locked.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-5 py-3 font-semibold">Role</th>
                    {PERMISSIONS.map((p) => (
                      <th key={p.key} className="text-center px-3 py-3 font-semibold whitespace-nowrap">{p.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userRoles.map((role) => (
                    <tr key={role.id} className={`hover:bg-slate-50/60 transition-colors ${role.id === 'admin' ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1.5 font-semibold text-sm ${
                          role.id === 'admin' ? 'text-amber-700' : 'text-slate-700'
                        }`}>
                          {role.id === 'admin' && <ShieldCheck size={14} className="text-amber-500" />}
                          {role.role}
                        </span>
                        {role.id === 'admin' && (
                          <span className="ml-2 text-[10px] text-amber-500 font-medium">locked</span>
                        )}
                      </td>
                      {PERMISSIONS.map((p) => (
                        <td key={p.key} className="px-3 py-3 text-center">
                          <button
                            onClick={() => toggleRolePermission(role.id, p.key)}
                            disabled={role.id === 'admin'}
                            className={`transition-colors ${role.id === 'admin' ? 'cursor-not-allowed opacity-70' : 'hover:scale-110'}`}
                          >
                            {role[p.key]
                              ? <ToggleRight size={22} className="text-[hsl(210,67%,23%)]" />
                              : <ToggleLeft size={22} className="text-slate-300" />}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
