'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Search, Edit2, Trash2, Phone, MapPin, Filter, ChevronUp, ChevronDown, X, UserPlus, Download } from 'lucide-react';
import { getHawkers, saveHawker, deleteHawker, deleteHawkers } from '@/lib/cloudStorage';
import type { Hawker } from '@/lib/cloudStorage';
import HawkerFormModal from './HawkerFormModal';
import PinModal from './PinModal';

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
interface DeleteConfirmModalProps {
  hawker: Hawker;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ hawker, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Delete Hawker?</h3>
          <p className="text-xs text-slate-500 mt-1">
            This will permanently remove{' '}
            <span className="font-semibold text-red-600">{hawker.name}</span>{' '}
            (ID: #{String(hawker.id).padStart(2, '0')}) from the registry. This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} />
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Delete Confirmation Modal ──────────────────────────────────────────
interface BulkDeleteConfirmModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function BulkDeleteConfirmModal({ count, onConfirm, onCancel }: BulkDeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Delete {count} Hawker{count > 1 ? 's' : ''}?</h3>
          <p className="text-xs text-slate-500 mt-1">
            This will permanently remove <span className="font-semibold text-red-600">{count} hawker{count > 1 ? 's' : ''}</span> from the registry. This action cannot be undone.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <Trash2 size={14} />
            Delete Permanently
          </button>
        </div>
      </div>
    </div>
  );
}

type SortKey = 'id' | 'name' | 'area' | 'paymentType' | 'status';
type SortDir = 'asc' | 'desc';

export default function HawkerRegistry() {
  const [hawkers, setHawkers] = useState<Hawker[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [paymentFilter, setPaymentFilter] = useState<'All' | 'Cash' | 'UPI' | 'Credit'>('All');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editHawker, setEditHawker] = useState<Hawker | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Hawker | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    getHawkers().then(setHawkers);
  }, []);

  const filtered = useMemo(() => {
    return hawkers
      .filter((h) => {
        const matchSearch =
          h.name.toLowerCase().includes(search.toLowerCase()) ||
          String(h.id).includes(search) ||
          h.contact.includes(search) ||
          h.area.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'All' || h.status === statusFilter;
        const matchPayment = paymentFilter === 'All' || h.paymentType === paymentFilter;
        return matchSearch && matchStatus && matchPayment;
      })
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        const cmp = typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [hawkers, search, statusFilter, paymentFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleRow = (id: number) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === paginated.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(paginated.map((h) => h.id)));
  };

  const handleDelete = (id: number) => {
    deleteHawker(id).then(() => {
      getHawkers().then(setHawkers);
      setDeleteConfirm(null);
      toast.success('Hawker removed from registry.');
    });
  };

  const handleBulkDelete = () => {
    const count = selectedRows.size;
    deleteHawkers(Array.from(selectedRows)).then(() => {
      getHawkers().then(setHawkers);
      setSelectedRows(new Set());
      setShowBulkDeleteConfirm(false);
      toast.success(`${count} hawkers removed from registry.`);
    });
  };

  const handleSaveHawker = (data: Hawker) => {
    saveHawker(data).then((saved) => {
      getHawkers().then(setHawkers);
      if (editHawker) {
        toast.success(`${saved.name} updated successfully.`);
      } else {
        toast.success(`${saved.name} added to registry.`);
      }
      setShowModal(false);
      setEditHawker(null);
    });
  };

  const handleExportCSV = () => {
    const rows = filtered;
    if (rows.length === 0) {
      toast.error('No data to export.');
      return;
    }
    const header = ['ID', 'Name', 'Contact', 'Area', 'Payment Type', 'Status', 'Newspapers', 'Notes'];
    const csvRows = rows.map((h) => [
      String(h.id),
      h.name,
      h.contact,
      h.area,
      h.paymentType,
      h.status,
      (h.newspapers ?? []).join('; '),
      h.notes ?? '',
    ]);
    const csv = [header, ...csvRows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hawker-registry-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} hawkers to CSV.`);
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <span className="inline-flex flex-col ml-1">
      <ChevronUp size={9} className={sortKey === col && sortDir === 'asc' ? 'text-[hsl(210,67%,23%)]' : 'text-slate-300'} />
      <ChevronDown size={9} className={sortKey === col && sortDir === 'desc' ? 'text-[hsl(210,67%,23%)]' : 'text-slate-300'} />
    </span>
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hawker Registry</h2>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} hawkers · {hawkers.filter(h => h.status === 'Active').length} active</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors min-h-[44px]">
            <Download size={14} />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => { setEditHawker(null); setShowModal(true); }}
            className="btn-primary flex items-center gap-2 min-h-[44px]"
          >
            <UserPlus size={15} />
            <span>Add Hawker</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, ID, contact, area…"
            className="input-field pl-9 text-sm w-full min-h-[44px]"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter size={13} className="text-slate-400" />
          {(['All', 'Active', 'Inactive'] as const).map((s) => (
            <button
              key={`sf-${s}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                statusFilter === s
                  ? 'bg-[hsl(210,67%,23%)] text-white'
                  : 'bg-white border border-[hsl(220,15%,88%)] text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Cash', 'UPI', 'Credit'] as const).map((p) => (
            <button
              key={`pf-${p}`}
              onClick={() => { setPaymentFilter(p); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors min-h-[36px] ${
                paymentFilter === p
                  ? 'bg-[hsl(36,80%,52%)] text-white'
                  : 'bg-white border border-[hsl(220,15%,88%)] text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        {/* Bulk action bar */}
        {selectedRows.size > 0 && (
          <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-[hsl(210,67%,23%)] text-white animate-slide-up">
            <span className="text-sm font-semibold">{selectedRows.size} hawker{selectedRows.size > 1 ? 's' : ''} selected</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 text-sm font-semibold text-red-300 hover:text-red-100 transition-colors"
              >
                <Trash2 size={14} />
                Delete Selected
              </button>
              <button onClick={() => setSelectedRows(new Set())} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Mobile card list */}
        <div className="block sm:hidden divide-y divide-[hsl(220,15%,93%)]">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16">
              <Search size={32} className="text-slate-200" />
              <p className="text-slate-400 font-medium">No hawkers match your filters</p>
            </div>
          ) : (
            paginated.map((h) => (
              <div
                key={`mob-hkr-${h.id}`}
                className={`px-4 py-3 space-y-2 ${selectedRows.has(h.id) ? 'bg-[hsl(210,67%,98%)]' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(h.id)}
                    onChange={() => toggleRow(h.id)}
                    className="w-4 h-4 rounded border-slate-300 accent-[hsl(210,67%,23%)] flex-shrink-0"
                  />
                  <div className="w-8 h-8 rounded-lg bg-[hsl(210,67%,23%)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {h.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{h.name}</p>
                    <p className="text-xs text-slate-400 font-mono">#{String(h.id).padStart(2, '0')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditHawker(h); setShowModal(true); }}
                      className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    {deleteConfirm?.id === h.id ? (
                      <>
                        <button onClick={() => handleDelete(h.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                          <Trash2 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setDeleteConfirm(h)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap pl-11">
                  <span className="flex items-center gap-1 text-xs text-slate-500"><Phone size={11} className="text-slate-400" />{h.contact}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={11} className="text-slate-400" />{h.area}</span>
                  <span className={`status-badge ${h.paymentType === 'Cash' ? 'bg-blue-50 text-blue-700' : h.paymentType === 'UPI' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>{h.paymentType}</span>
                  <span className={`status-badge ${h.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{h.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)]">
                <th className="table-header w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginated.length && paginated.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-300 accent-[hsl(210,67%,23%)]"
                  />
                </th>
                <th className="table-header text-left cursor-pointer select-none" onClick={() => toggleSort('id')}>
                  ID <SortIcon col="id" />
                </th>
                <th className="table-header text-left cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  Hawker Name <SortIcon col="name" />
                </th>
                <th className="table-header text-left">Contact</th>
                <th className="table-header text-left cursor-pointer select-none" onClick={() => toggleSort('area')}>
                  Area <SortIcon col="area" />
                </th>
                <th className="table-header text-center cursor-pointer select-none" onClick={() => toggleSort('paymentType')}>
                  Payment Type <SortIcon col="paymentType" />
                </th>
                <th className="table-header text-center cursor-pointer select-none" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
                <th className="table-header text-left">Joined</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-slate-200" />
                      <p className="text-slate-400 font-medium">No hawkers match your filters</p>
                      <p className="text-xs text-slate-400">Try adjusting your search or filter criteria</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((h, i) => (
                  <tr
                    key={`hkr-row-${h.id}`}
                    className={`border-b border-[hsl(220,15%,93%)] hover:bg-slate-50/80 transition-colors group ${
                      selectedRows.has(h.id) ? 'bg-[hsl(210,67%,98%)]' : i % 2 === 0 ? '' : 'bg-slate-50/30'
                    }`}
                  >
                    <td className="table-cell text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(h.id)}
                        onChange={() => toggleRow(h.id)}
                        className="w-4 h-4 rounded border-slate-300 accent-[hsl(210,67%,23%)]"
                      />
                    </td>
                    <td className="table-cell">
                      <span className="font-mono text-xs font-bold text-slate-500">#{String(h.id).padStart(2, '0')}</span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[hsl(210,67%,23%)] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {h.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-800 text-sm truncate max-w-[160px]">{h.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <Phone size={12} className="text-slate-400" />
                        {h.contact}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 text-slate-500 text-sm">
                        <MapPin size={12} className="text-slate-400" />
                        {h.area}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${
                        h.paymentType === 'Cash' ? 'bg-blue-50 text-blue-700' :
                        h.paymentType === 'UPI' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'
                      }`}>
                        {h.paymentType}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`status-badge ${h.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="table-cell text-sm text-slate-500">
                      {new Date(h.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditHawker(h); setShowModal(true); }}
                          className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        {deleteConfirm?.id === h.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(h.id)}
                              className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600 hover:bg-red-100 transition-colors"
                              title="Confirm delete"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(h)}
                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 sm:px-5 py-3 bg-slate-50 border-t border-[hsl(220,15%,88%)] flex items-center justify-between">
          <p className="text-xs text-slate-500">{filtered.length} hawkers · Showing {Math.min((page - 1) * perPage + 1, filtered.length)}–{Math.min(page * perPage, filtered.length)}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg border border-[hsl(220,15%,88%)] bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronDown size={14} className="rotate-90" />
            </button>
            <span className="text-xs text-slate-600 px-2">Page {page} of {Math.max(1, totalPages)}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="w-8 h-8 rounded-lg border border-[hsl(220,15%,88%)] bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronDown size={14} className="-rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <HawkerFormModal
          hawker={editHawker}
          onSave={handleSaveHawker}
          onClose={() => { setShowModal(false); setEditHawker(null); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <PinModal
          title="Delete Hawker?"
          description={
            <>
              This will permanently remove{' '}
              <span className="font-semibold text-red-600">{deleteConfirm.name}</span>{' '}
              (ID: #{String(deleteConfirm.id).padStart(2, '0')}) from the registry. This action cannot be undone.
            </>
          }
          confirmLabel="Delete Permanently"
          confirmIcon={<Trash2 size={14} />}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <PinModal
          title={`Delete ${selectedRows.size} Hawker${selectedRows.size > 1 ? 's' : ''}?`}
          description={
            <>
              This will permanently remove{' '}
              <span className="font-semibold text-red-600">{selectedRows.size} hawker{selectedRows.size > 1 ? 's' : ''}</span>{' '}
              from the registry. This action cannot be undone.
            </>
          }
          confirmLabel="Delete Permanently"
          confirmIcon={<Trash2 size={14} />}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </div>
  );
}