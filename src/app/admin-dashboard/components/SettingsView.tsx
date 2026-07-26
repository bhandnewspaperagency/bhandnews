'use client';

import React, { useState, useEffect } from 'react';
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
  Newspaper,
  Pencil,
  X,
  Lock,
  Check,
  Search,
  Users,
} from 'lucide-react';
import { NEWSPAPERS } from '@/lib/mockData';
import { getNewspaperList, addNewspaper, updateNewspaper, deleteNewspaper, type NewspaperEntry, getHawkers, getFreeQtyForHawker, saveFreeQtyForHawker, type HawkerFreeQtyEntry } from '@/lib/storage';
import type { Hawker } from '@/lib/storage';

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

const SETTINGS_PIN = '2212';

const SECTION_TABS = [
  { id: 'rates', label: 'Newspaper Rates', icon: <IndianRupee size={16} /> },
  { id: 'free', label: 'Free PVC Manager', icon: <Gift size={16} /> },
  { id: 'payment', label: 'Payment Types', icon: <CreditCard size={16} /> },
  { id: 'billing', label: 'Billing Cycle', icon: <Calendar size={16} /> },
  { id: 'access', label: 'User Access', icon: <ShieldCheck size={16} /> },
  { id: 'newspapers', label: 'Newspapers', icon: <Newspaper size={16} /> },
];

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState('rates');
  const [saved, setSaved] = useState(false);

  // --- Newspaper Rates & Free Copies ---
  const [rates, setRates] = useState<NewspaperRate[]>(
    NEWSPAPERS.map((n) => ({ name: n.name, rate: n.rate, freeCopies: 2 }))
  );

  // --- Free PVC Manager ---
  const [allHawkers, setAllHawkers] = useState<Hawker[]>([]);
  const [freeQtySearch, setFreeQtySearch] = useState('');
  // freeQtyMap: hawkerId -> { [newspaperName]: qty }
  const [freeQtyMap, setFreeQtyMap] = useState<Record<number, Record<string, number>>>({});
  const [freeQtySaved, setFreeQtySaved] = useState(false);
  const [freeQtyNewspapers, setFreeQtyNewspapers] = useState<NewspaperEntry[]>([]);

  useEffect(() => {
    if (activeTab === 'free') {
      const hawkers = getHawkers();
      const npList = getNewspaperList();
      setAllHawkers(hawkers);
      setFreeQtyNewspapers(npList);
      // Load existing free qty for all hawkers
      const map: Record<number, Record<string, number>> = {};
      hawkers.forEach((h) => {
        const entries = getFreeQtyForHawker(h.id);
        const npMap: Record<string, number> = {};
        npList.forEach((np) => {
          const found = entries.find((e) => e.newspaper === np.name);
          npMap[np.name] = found ? found.freeQty : 0;
        });
        map[h.id] = npMap;
      });
      setFreeQtyMap(map);
    }
  }, [activeTab]);

  const handleFreeQtyChange = (hawkerId: number, newspaper: string, value: string) => {
    const num = parseInt(value) || 0;
    setFreeQtyMap((prev) => ({
      ...prev,
      [hawkerId]: { ...(prev[hawkerId] || {}), [newspaper]: num },
    }));
  };

  const handleSaveAllFreeQty = () => {
    allHawkers.forEach((h) => {
      const npMap = freeQtyMap[h.id] || {};
      const entries: HawkerFreeQtyEntry[] = freeQtyNewspapers.map((np) => ({
        newspaper: np.name,
        freeQty: npMap[np.name] || 0,
      }));
      saveFreeQtyForHawker(h.id, entries);
    });
    setFreeQtySaved(true);
    setTimeout(() => setFreeQtySaved(false), 2500);
  };

  const filteredFreeQtyHawkers = allHawkers.filter(
    (h) =>
      h.name.toLowerCase().includes(freeQtySearch.toLowerCase()) ||
      String(h.id).includes(freeQtySearch)
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

  // --- Newspaper Management ---
  const [newspapers, setNewspapers] = useState<NewspaperEntry[]>([]);
  const [npPinUnlocked, setNpPinUnlocked] = useState(false);
  const [npPinInput, setNpPinInput] = useState('');
  const [npPinError, setNpPinError] = useState('');
  const [editingNpId, setEditingNpId] = useState<string | null>(null);
  const [editNpName, setEditNpName] = useState('');
  const [editNpRate, setEditNpRate] = useState('');
  const [newNpName, setNewNpName] = useState('');
  const [newNpRate, setNewNpRate] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletePinInput, setDeletePinInput] = useState('');
  const [deletePinError, setDeletePinError] = useState('');

  useEffect(() => {
    setNewspapers(getNewspaperList());
  }, []);

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
    if (roleId === 'admin') return;
    setUserRoles((prev) =>
      prev.map((r) => (r.id === roleId ? { ...r, [perm]: !r[perm] } : r))
    );
  };

  // --- Newspaper Management Handlers ---
  const handleNpPinSubmit = () => {
    if (npPinInput === SETTINGS_PIN) {
      setNpPinUnlocked(true);
      setNpPinError('');
      setNpPinInput('');
    } else {
      setNpPinError('Incorrect PIN. Please try again.');
      setNpPinInput('');
    }
  };

  const handleAddNewspaper = () => {
    const name = newNpName.trim();
    const rate = parseFloat(newNpRate);
    if (!name || isNaN(rate) || rate < 0) return;
    const added = addNewspaper({ name, rate });
    setNewspapers((prev) => [...prev, added]);
    setNewNpName('');
    setNewNpRate('');
  };

  const handleStartEdit = (np: NewspaperEntry) => {
    setEditingNpId(np.id);
    setEditNpName(np.name);
    setEditNpRate(String(np.rate));
  };

  const handleSaveEdit = (id: string) => {
    const name = editNpName.trim();
    const rate = parseFloat(editNpRate);
    if (!name || isNaN(rate) || rate < 0) return;
    updateNewspaper(id, { name, rate });
    setNewspapers((prev) =>
      prev.map((n) => (n.id === id ? { ...n, name, rate } : n))
    );
    setEditingNpId(null);
  };

  const handleCancelEdit = () => {
    setEditingNpId(null);
    setEditNpName('');
    setEditNpRate('');
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirmId(id);
    setDeletePinInput('');
    setDeletePinError('');
  };

  const handleDeleteWithPin = () => {
    if (deletePinInput === SETTINGS_PIN) {
      deleteNewspaper(deleteConfirmId!);
      setNewspapers((prev) => prev.filter((n) => n.id !== deleteConfirmId));
      setDeleteConfirmId(null);
      setDeletePinInput('');
      setDeletePinError('');
    } else {
      setDeletePinError('Incorrect PIN.');
      setDeletePinInput('');
    }
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
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center min-w-[100px] ${
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

        {/* ── Free PVC Manager ── */}
        {activeTab === 'free' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">Free PVC Manager</h2>
                <p className="text-xs text-slate-500 mt-0.5">Set fixed free PVC copies per hawker per newspaper. These auto-fill in Daily Billing.</p>
              </div>
              <button
                onClick={handleSaveAllFreeQty}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  freeQtySaved
                    ? 'bg-green-100 text-green-700 border border-green-200' :'bg-[hsl(210,67%,23%)] text-white hover:bg-[hsl(210,67%,18%)]'
                }`}
              >
                {freeQtySaved ? <CheckCircle size={15} /> : <Save size={15} />}
                {freeQtySaved ? 'Saved!' : 'Save All'}
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4 pb-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search hawker by name or ID..."
                  value={freeQtySearch}
                  onChange={(e) => setFreeQtySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-slate-50 z-10 min-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} />
                        Hawker
                      </div>
                    </th>
                    {freeQtyNewspapers.map((np) => (
                      <th key={np.id} className="text-center px-3 py-3 font-semibold whitespace-nowrap min-w-[100px]">
                        {np.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFreeQtyHawkers.length === 0 ? (
                    <tr>
                      <td colSpan={freeQtyNewspapers.length + 1} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No hawkers found.
                      </td>
                    </tr>
                  ) : (
                    filteredFreeQtyHawkers.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 sticky left-0 bg-white hover:bg-slate-50/60 z-10">
                          <div className="font-medium text-slate-800 text-xs leading-tight">{h.name}</div>
                          <div className="text-[10px] text-slate-400">ID: {h.id}</div>
                        </td>
                        {freeQtyNewspapers.map((np) => (
                          <td key={np.id} className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              value={freeQtyMap[h.id]?.[np.name] || ''}
                              onChange={(e) => handleFreeQtyChange(h.id, np.name, e.target.value)}
                              placeholder="0"
                              className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)] tabular-nums"
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredFreeQtyHawkers.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Showing {filteredFreeQtyHawkers.length} of {allHawkers.length} hawkers
                </p>
                <button
                  onClick={handleSaveAllFreeQty}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    freeQtySaved
                      ? 'bg-green-100 text-green-700 border border-green-200' :'bg-[hsl(210,67%,23%)] text-white hover:bg-[hsl(210,67%,18%)]'
                  }`}
                >
                  {freeQtySaved ? <CheckCircle size={15} /> : <Save size={15} />}
                  {freeQtySaved ? 'Saved!' : 'Save All'}
                </button>
              </div>
            )}
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

        {/* ── Newspaper Management ── */}
        {activeTab === 'newspapers' && (
          <div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-slate-800">Newspaper Management</h2>
                <p className="text-xs text-slate-500 mt-0.5">Add, edit, or delete newspapers. Protected by PIN.</p>
              </div>
              {npPinUnlocked && (
                <button
                  onClick={() => setNpPinUnlocked(false)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                >
                  <Lock size={13} /> Lock
                </button>
              )}
            </div>

            {/* PIN Gate */}
            {!npPinUnlocked ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 gap-5">
                <div className="w-14 h-14 rounded-full bg-[hsl(210,67%,23%)]/10 flex items-center justify-center">
                  <Lock size={26} className="text-[hsl(210,67%,23%)]" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-800 text-base">PIN Required</p>
                  <p className="text-sm text-slate-500 mt-1">Enter your admin PIN to manage newspapers</p>
                </div>
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter PIN"
                    value={npPinInput}
                    onChange={(e) => { setNpPinInput(e.target.value); setNpPinError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleNpPinSubmit()}
                    className="w-full text-center tracking-widest text-lg border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)]"
                  />
                  {npPinError && (
                    <p className="text-xs text-red-500 font-medium">{npPinError}</p>
                  )}
                  <button
                    onClick={handleNpPinSubmit}
                    className="w-full py-2.5 bg-[hsl(210,67%,23%)] text-white rounded-xl text-sm font-semibold hover:bg-[hsl(210,67%,18%)] transition-colors"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                {/* Add New Newspaper */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Add New Newspaper</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Newspaper name"
                      value={newNpName}
                      onChange={(e) => setNewNpName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewspaper()}
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)] bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Rate (₹)"
                      min={0}
                      step={0.10}
                      value={newNpRate}
                      onChange={(e) => setNewNpRate(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddNewspaper()}
                      className="w-full sm:w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20 focus:border-[hsl(210,67%,23%)] bg-white"
                    />
                    <button
                      onClick={handleAddNewspaper}
                      disabled={!newNpName.trim() || !newNpRate}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[hsl(210,67%,23%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(210,67%,18%)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <Plus size={15} /> Add
                    </button>
                  </div>
                </div>

                {/* Newspaper List */}
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                        <th className="text-left px-4 py-3 font-semibold">#</th>
                        <th className="text-left px-4 py-3 font-semibold">Name</th>
                        <th className="text-center px-4 py-3 font-semibold">Rate (₹)</th>
                        <th className="text-center px-4 py-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {newspapers.map((np, idx) => (
                        <tr key={np.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                          {editingNpId === np.id ? (
                            <>
                              <td className="px-4 py-2">
                                <input
                                  type="text"
                                  value={editNpName}
                                  onChange={(e) => setEditNpName(e.target.value)}
                                  className="w-full border border-[hsl(210,67%,23%)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20"
                                  autoFocus
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  step={0.10}
                                  value={editNpRate}
                                  onChange={(e) => setEditNpRate(e.target.value)}
                                  className="w-20 text-center border border-[hsl(210,67%,23%)] rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(210,67%,23%)]/20"
                                />
                              </td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleSaveEdit(np.id)}
                                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                                    title="Save"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3 font-medium text-slate-800">{np.name}</td>
                              <td className="px-4 py-3 text-center text-slate-700">₹{np.rate.toFixed(2)}</td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleStartEdit(np)}
                                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Edit"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteConfirm(np.id)}
                                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {newspapers.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                            No newspapers added yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Delete Newspaper</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deleting &quot;{newspapers.find((n) => n.id === deleteConfirmId)?.name}&quot;. Enter PIN to confirm.
                </p>
              </div>
            </div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter PIN to confirm"
              value={deletePinInput}
              onChange={(e) => { setDeletePinInput(e.target.value); setDeletePinError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleDeleteWithPin()}
              className="w-full text-center tracking-widest border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
              autoFocus
            />
            {deletePinError && (
              <p className="text-xs text-red-500 font-medium text-center">{deletePinError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setDeleteConfirmId(null); setDeletePinInput(''); setDeletePinError(''); }}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWithPin}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
