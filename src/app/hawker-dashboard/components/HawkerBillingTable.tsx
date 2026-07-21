'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { DailyBillingRecord } from '@/lib/mockData';

interface HawkerBillingTableProps {
  bills: DailyBillingRecord[];
}

export default function HawkerBillingTable({ bills }: HawkerBillingTableProps) {
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <AlertTriangle size={24} className="text-slate-300" />
        </div>
        <p className="text-slate-600 font-semibold">No billing records yet</p>
        <p className="text-sm text-slate-400 text-center max-w-xs">
          Your daily newspaper billing entries will appear here once the agency admin records them.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[hsl(220,15%,93%)]">
      {bills.map((bill) => (
        <div key={`hbill-${bill.id}`} className="hover:bg-slate-50/60 transition-colors">
          {/* Bill Row */}
          <button
            onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
            className="w-full px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="flex-shrink-0">
              {expandedBill === bill.id ? (
                <ChevronDown size={16} className="text-slate-400" />
              ) : (
                <ChevronRight size={16} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800">
                  {new Date(bill.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className={`status-badge ${
                  bill.paymentStatus === 'Paid' ? 'bg-green-50 text-green-700' :
                  bill.paymentStatus === 'Partial'? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                }`}>
                  {bill.paymentStatus}
                </span>
                <span className={`status-badge ${
                  bill.paymentType === 'Cash' ? 'bg-blue-50 text-blue-700' :
                  bill.paymentType === 'UPI'? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'
                }`}>
                  {bill.paymentType}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {bill.entries.length} newspapers · {bill.entries.reduce((s, e) => s + e.netQty, 0)} net copies
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-base font-bold tabular-nums text-slate-900">
                ₹{bill.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {bill.whatsappSent ? (
                  <>
                    <CheckCircle2 size={11} className="text-green-500" />
                    <span className="text-[10px] text-green-600">WhatsApp sent</span>
                  </>
                ) : (
                  <>
                    <Clock size={11} className="text-amber-400" />
                    <span className="text-[10px] text-amber-500">Not notified</span>
                  </>
                )}
              </div>
            </div>
          </button>

          {/* Expanded Detail */}
          {expandedBill === bill.id && (
            <div className="px-5 pb-4 animate-fade-in">
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-[hsl(220,15%,88%)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(220,15%,88%)]">
                      <th className="table-header text-left w-8">Sr.</th>
                      <th className="table-header text-left">Newspaper</th>
                      <th className="table-header text-right">Rate</th>
                      <th className="table-header text-right">Supply</th>
                      <th className="table-header text-right">Return</th>
                      <th className="table-header text-right">Net Qty</th>
                      <th className="table-header text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.entries.map((entry) => (
                      <tr key={`entry-${bill.id}-${entry.srNo}`} className="border-b border-[hsl(220,15%,93%)] last:border-0">
                        <td className="table-cell text-xs text-slate-400 font-mono">{entry.srNo}</td>
                        <td className="table-cell font-medium text-slate-800">{entry.newspaper}</td>
                        <td className="table-cell text-right font-mono text-slate-500">₹{entry.rate.toFixed(2)}</td>
                        <td className="table-cell text-right tabular-nums text-slate-600">{entry.supplyQty}</td>
                        <td className="table-cell text-right tabular-nums text-slate-500">{entry.returnQty}</td>
                        <td className="table-cell text-right tabular-nums font-semibold text-[hsl(210,67%,23%)]">{entry.netQty}</td>
                        <td className="table-cell text-right tabular-nums font-semibold text-slate-900">₹{entry.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[hsl(210,67%,23%)] text-white">
                      <td colSpan={5} className="px-4 py-2.5 text-xs font-bold text-right uppercase tracking-wide">Total Bill</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-sm">
                        {bill.entries.reduce((s, e) => s + e.netQty, 0)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-sm">
                        ₹{bill.totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}