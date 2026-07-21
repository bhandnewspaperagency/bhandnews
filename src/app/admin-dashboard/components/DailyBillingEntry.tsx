'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Search, Send, CheckCircle2, AlertCircle, MessageSquare, ChevronDown, Printer, Info } from 'lucide-react';
import { getHawkers, saveBillingRecord, NEWSPAPERS, getRateForDate, getPreviousDayRate } from '@/lib/storage';
import type { Hawker, DailyBillingRecord } from '@/lib/storage';

interface BillingRow {
  supplyQty: number;
  returnQty: number;
  freePvc: number;
}

interface BillingFormValues {
  hawkerId: string;
  paymentType: 'Cash' | 'UPI' | 'Credit';
  date: string;
}

export default function DailyBillingEntry() {
  const [hawkers, setHawkers] = useState<Hawker[]>([]);
  const [selectedHawker, setSelectedHawker] = useState<Hawker | null>(null);
  const [hawkerSearch, setHawkerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [rows, setRows] = useState<BillingRow[]>(
    NEWSPAPERS.map(() => ({ supplyQty: 0, returnQty: 0, freePvc: 0 }))
  );
  // Resolved rates per newspaper for current bill date
  const [supplyRates, setSupplyRates] = useState<number[]>(NEWSPAPERS.map((np) => np.rate));
  const [returnRates, setReturnRates] = useState<number[]>(NEWSPAPERS.map((np) => np.rate));

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setHawkers(getHawkers());
  }, []);

  const { register, handleSubmit, setValue, watch } = useForm<BillingFormValues>({
    defaultValues: {
      hawkerId: '',
      paymentType: 'Cash',
      date: today,
    },
  });

  const paymentType = watch('paymentType');
  const billDate = watch('date');

  // Recalculate rates whenever billDate changes
  useEffect(() => {
    if (!billDate) return;
    const sRates = NEWSPAPERS.map((np) => getRateForDate(np.name, billDate));
    const rRates = NEWSPAPERS.map((np) => getPreviousDayRate(np.name, billDate));
    setSupplyRates(sRates);
    setReturnRates(rRates);
  }, [billDate]);

  const updateRow = (index: number, field: 'supplyQty' | 'returnQty' | 'freePvc', value: string) => {
    const numVal = parseInt(value) || 0;
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: numVal };
      return next;
    });
  };

  const getNetQty = (i: number) => Math.max(0, (rows[i]?.supplyQty || 0) - (rows[i]?.returnQty || 0));

  // Total = (supplyQty × supplyRate) - (returnQty × returnRate)
  const getTotal = (i: number) => {
    const supply = (rows[i]?.supplyQty || 0) * supplyRates[i];
    const ret = (rows[i]?.returnQty || 0) * returnRates[i];
    return Math.max(0, supply - ret);
  };

  const getTotalBill = () => NEWSPAPERS.reduce((sum, _, i) => sum + getTotal(i), 0);

  const ratesAreDifferent = (i: number) => supplyRates[i] !== returnRates[i];

  const filteredHawkers = hawkers.filter(
    (h) =>
      h.name.toLowerCase().includes(hawkerSearch.toLowerCase()) ||
      String(h.id).includes(hawkerSearch)
  ).slice(0, 8);

  const handleSelectHawker = (hawker: Hawker) => {
    setSelectedHawker(hawker);
    setValue('hawkerId', String(hawker.id));
    setHawkerSearch('');
  };

  const handleFormSubmit = async (formData: BillingFormValues) => {
    if (!selectedHawker) {
      toast.error('Please select a hawker before submitting.');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    const entries = NEWSPAPERS.map((np, i) => ({
      srNo: i + 1,
      newspaper: np.name,
      rate: supplyRates[i],
      supplyQty: rows[i]?.supplyQty || 0,
      returnQty: rows[i]?.returnQty || 0,
      netQty: getNetQty(i),
      total: getTotal(i),
    })).filter((e) => e.supplyQty > 0);

    const record: DailyBillingRecord = {
      id: `bill-${formData.date.replace(/-/g, '')}-${selectedHawker.id}-${Date.now()}`,
      hawkerId: selectedHawker.id,
      hawkerName: selectedHawker.name,
      date: formData.date,
      entries,
      totalBill: getTotalBill(),
      whatsappSent: false,
      paymentStatus: 'Pending',
      paymentType: formData.paymentType,
    };

    saveBillingRecord(record);
    setIsSubmitting(false);
    setSubmitted(true);
    toast.success(`Bill saved for ${selectedHawker.name} — ₹${getTotalBill().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  };

  const handleSendWhatsApp = async () => {
    if (!selectedHawker) return;
    setWhatsappSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setWhatsappSending(false);
    toast.success(`WhatsApp sent to ${selectedHawker.name} (${selectedHawker.contact})`, {
      description: `Bill amount: ₹${getTotalBill().toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    });
  };

  const handleReset = () => {
    setSelectedHawker(null);
    setRows(NEWSPAPERS.map(() => ({ supplyQty: 0, returnQty: 0, freePvc: 0 })));
    setSubmitted(false);
    setValue('hawkerId', '');
  };

  const hasRateDifference = NEWSPAPERS.some((_, i) => ratesAreDifferent(i));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Billing Entry</h2>
          <p className="text-sm text-slate-500 mt-0.5">Enter supply and return quantities for each newspaper</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </div>

      {/* Hawker Selector */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Step 1 — Select Hawker</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-text" htmlFor="hawker-search">Search by Name or Hawker ID</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="hawker-search"
                type="text"
                placeholder="Type name or ID…"
                className="input-field pl-9"
                value={hawkerSearch}
                onChange={(e) => setHawkerSearch(e.target.value)}
                autoComplete="off"
              />
            </div>
            {hawkerSearch.length > 0 && (
              <div className="absolute z-30 mt-1 bg-white border border-[hsl(220,15%,88%)] rounded-xl shadow-lg max-h-56 overflow-y-auto w-72 scrollbar-thin">
                {filteredHawkers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">No hawker found</p>
                ) : (
                  filteredHawkers.map((h) => (
                    <button
                      key={`hkr-opt-${h.id}`}
                      type="button"
                      onClick={() => handleSelectHawker(h)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[hsl(210,67%,23%)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {h.id}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{h.name}</p>
                        <p className="text-xs text-slate-400">{h.area} · {h.contact}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedHawker ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(210,67%,96%)] border border-[hsl(210,67%,85%)]">
              <div className="w-10 h-10 rounded-xl bg-[hsl(210,67%,23%)] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                {selectedHawker.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 truncate">{selectedHawker.name}</p>
                <p className="text-xs text-slate-500">{selectedHawker.area} · {selectedHawker.contact}</p>
              </div>
              <span className={`status-badge ${selectedHawker.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {selectedHawker.status}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-300">
              <AlertCircle size={18} className="text-slate-400" />
              <p className="text-sm text-slate-400">No hawker selected</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label-text" htmlFor="payment-type">Payment Type</label>
            <div className="relative">
              <select id="payment-type" className="input-field appearance-none pr-8" {...register('paymentType')}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Credit">Credit</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label-text" htmlFor="bill-date">Bill Date</label>
            <input id="bill-date" type="date" className="input-field" {...register('date')} />
          </div>
        </div>
      </div>

      {/* Rate Info Banner — shown when supply and return rates differ */}
      {hasRateDifference && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2.5">
          <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Rate change detected:</strong> Supply qty uses today&apos;s rate; return qty uses the previous day&apos;s rate.
            Columns show both rates where they differ.
          </p>
        </div>
      )}

      {/* Billing Table */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(220,15%,88%)]">
          <h3 className="text-sm font-semibold text-slate-700">Step 2 — Enter Newspaper Quantities</h3>
          <p className="text-xs text-slate-400 mt-0.5">Net Qty and Total are auto-calculated using date-based rates</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)]">
                <th className="table-header text-left w-8">Sr.</th>
                <th className="table-header text-left">Newspaper</th>
                <th className="table-header text-right">Supply Rate (₹)<br/><span className="font-normal normal-case text-slate-400 text-[10px]">(today)</span></th>
                <th className="table-header text-right">Return Rate (₹)<br/><span className="font-normal normal-case text-slate-400 text-[10px]">(prev day)</span></th>
                <th className="table-header text-center">Supply Qty<br/><span className="font-normal normal-case text-slate-400">(अंक)</span></th>
                <th className="table-header text-center">Return<br/><span className="font-normal normal-case text-slate-400">(परत)</span></th>
                <th className="table-header text-center">Free PVC<br/><span className="font-normal normal-case text-slate-400">(मोफत)</span></th>
                <th className="table-header text-center bg-blue-50">Net Qty</th>
                <th className="table-header text-right bg-blue-50">Total (₹)<br/><span className="font-normal normal-case text-slate-400">(रुपये)</span></th>
              </tr>
            </thead>
            <tbody>
              {NEWSPAPERS.map((np, i) => {
                const netQty = getNetQty(i);
                const total = getTotal(i);
                const hasEntry = rows[i]?.supplyQty > 0;
                const ratesDiffer = ratesAreDifferent(i);
                return (
                  <tr
                    key={`billing-row-${np.name}`}
                    className={`border-b border-[hsl(220,15%,93%)] transition-colors ${
                      hasEntry ? 'bg-[hsl(210,67%,98%)]' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <td className="table-cell text-xs text-slate-400 font-mono w-8">{i + 1}</td>
                    <td className="table-cell">
                      <span className={`text-sm font-medium ${hasEntry ? 'text-[hsl(210,67%,23%)]' : 'text-slate-700'}`}>
                        {np.name}
                      </span>
                    </td>
                    <td className="table-cell text-right font-mono text-sm text-slate-600">
                      {supplyRates[i]?.toFixed(2) ?? np.rate.toFixed(2)}
                    </td>
                    <td className="table-cell text-right font-mono text-sm">
                      <span className={ratesDiffer ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                        {returnRates[i]?.toFixed(2) ?? np.rate.toFixed(2)}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <input
                        type="number"
                        min={0}
                        value={rows[i]?.supplyQty || ''}
                        onChange={(e) => updateRow(i, 'supplyQty', e.target.value)}
                        className="w-20 text-center input-field text-sm tabular-nums"
                        placeholder="0"
                      />
                    </td>
                    <td className="table-cell text-center">
                      <input
                        type="number"
                        min={0}
                        value={rows[i]?.returnQty || ''}
                        onChange={(e) => updateRow(i, 'returnQty', e.target.value)}
                        className="w-20 text-center input-field text-sm tabular-nums"
                        placeholder="0"
                      />
                    </td>
                    <td className="table-cell text-center">
                      <input
                        type="number"
                        min={0}
                        value={rows[i]?.freePvc || ''}
                        onChange={(e) => updateRow(i, 'freePvc', e.target.value)}
                        className="w-20 text-center input-field text-sm tabular-nums"
                        placeholder="0"
                      />
                    </td>
                    <td className="table-cell text-center bg-blue-50/40">
                      <span className={`font-mono text-sm font-semibold ${netQty > 0 ? 'text-[hsl(210,67%,23%)]' : 'text-slate-300'}`}>
                        {netQty}
                      </span>
                    </td>
                    <td className="table-cell text-right bg-blue-50/40">
                      <span className={`font-mono text-sm font-semibold ${total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                        {total > 0 ? `₹${total.toFixed(2)}` : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[hsl(210,67%,23%)] text-white">
                <td colSpan={6} className="px-4 py-3 text-sm font-semibold">Grand Total</td>
                <td className="px-4 py-3 text-center font-mono font-bold">
                  {NEWSPAPERS.reduce((s, _, i) => s + (rows[i]?.freePvc || 0), 0)}
                </td>
                <td className="px-4 py-3 text-center font-mono font-bold">
                  {NEWSPAPERS.reduce((s, _, i) => s + getNetQty(i), 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-lg">
                  ₹{getTotalBill().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {submitted && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <CheckCircle2 size={16} />
              Bill saved to local storage
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!selectedHawker || whatsappSending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {whatsappSending ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <MessageSquare size={15} />
            )}
            Send WhatsApp
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[hsl(220,15%,88%)] text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting || !selectedHawker}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {isSubmitting ? 'Saving…' : 'Save Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}