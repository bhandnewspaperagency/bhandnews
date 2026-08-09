'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, Layers } from 'lucide-react';
import {
  getNewspaperGroups,
  saveNewspaperGroup,
  deleteNewspaperGroup,
  NEWSPAPERS,
} from '@/lib/cloudStorage';
import type { NewspaperGroup } from '@/lib/cloudStorage';

const GROUP_COLORS = [
  { label: 'Blue', value: 'hsl(210,67%,23%)' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Cyan', value: '#0891b2' },
  { label: 'Slate', value: '#475569' },
];

const ALL_NP_NAMES = NEWSPAPERS.map((n) => n.name);

interface GroupFormState {
  id: string;
  name: string;
  newspapers: string[];
  color: string;
}

const emptyForm = (): GroupFormState => ({
  id: '',
  name: '',
  newspapers: [],
  color: GROUP_COLORS[0].value,
});

export default function NewspaperGroups() {
  const [groups, setGroups] = useState<NewspaperGroup[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null); // null = not editing, 'new' = creating
  const [form, setForm] = useState<GroupFormState>(emptyForm());

  useEffect(() => {
    getNewspaperGroups().then(setGroups);
  }, []);

  const refresh = () => getNewspaperGroups().then(setGroups);

  const startNew = () => {
    setForm(emptyForm());
    setEditingId('new');
  };

  const startEdit = (g: NewspaperGroup) => {
    setForm({ id: g.id, name: g.name, newspapers: [...g.newspapers], color: g.color ?? GROUP_COLORS[0].value });
    setEditingId(g.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const group: NewspaperGroup = {
      id: editingId === 'new' ? `grp-${Date.now()}` : form.id,
      name: form.name.trim(),
      newspapers: form.newspapers,
      color: form.color,
    };
    saveNewspaperGroup(group).then(() => {
      refresh();
      cancelEdit();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this group?')) return;
    deleteNewspaperGroup(id).then(refresh);
  };

  const toggleNP = (np: string) => {
    setForm((prev) => ({
      ...prev,
      newspapers: prev.newspapers.includes(np)
        ? prev.newspapers.filter((n) => n !== np)
        : [...prev.newspapers, np],
    }));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Newspaper Groups</h2>
          <p className="text-sm text-slate-500 mt-0.5">Organise newspapers into groups for filtered tracking</p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(210,67%,23%)] hover:bg-[hsl(210,67%,18%)] transition-colors"
        >
          <Plus size={15} />
          New Group
        </button>
      </div>

      {/* Create / Edit Form */}
      {editingId !== null && (
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm">
            {editingId === 'new' ? 'Create New Group' : 'Edit Group'}
          </h3>

          {/* Name + Color */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Group Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Lokmat Group"
                className="input-field text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Color Tag</label>
              <div className="flex items-center gap-2 flex-wrap">
                {GROUP_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => setForm((p) => ({ ...p, color: c.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c.value ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Newspaper Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              Select Newspapers ({form.newspapers.length} selected)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {ALL_NP_NAMES.map((np) => {
                const checked = form.newspapers.includes(np);
                return (
                  <label
                    key={np}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-all select-none ${
                      checked
                        ? 'border-[hsl(210,67%,23%)] bg-[hsl(210,67%,97%)] text-[hsl(210,67%,23%)] font-medium'
                        : 'border-[hsl(220,15%,88%)] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggleNP(np)}
                    />
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                        checked ? 'bg-[hsl(210,67%,23%)] border-[hsl(210,67%,23%)]' : 'border-slate-300'
                      }`}
                    >
                      {checked && <Check size={10} className="text-white" />}
                    </span>
                    <span className="truncate">{np}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(210,67%,23%)] hover:bg-[hsl(210,67%,18%)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check size={14} />
              {editingId === 'new' ? 'Create Group' : 'Save Changes'}
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors"
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 && editingId === null ? (
        <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm p-12 text-center">
          <Layers size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">No groups yet</p>
          <p className="text-slate-400 text-xs mt-1">Create a group to organise newspapers for filtered tracking</p>
          <button
            onClick={startNew}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[hsl(210,67%,23%)] hover:bg-[hsl(210,67%,18%)] transition-colors"
          >
            <Plus size={14} />
            Create First Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden"
            >
              {/* Color bar + title */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ borderLeft: `4px solid ${g.color ?? GROUP_COLORS[0].value}` }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: g.color ?? GROUP_COLORS[0].value }}
                  />
                  <span className="font-semibold text-slate-800 text-sm truncate">{g.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">({g.newspapers.length})</span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(g)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[hsl(210,67%,23%)] hover:bg-[hsl(210,67%,97%)] transition-colors"
                    title="Edit group"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete group"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {/* Newspaper chips */}
              <div className="px-4 pb-4 pt-2 flex flex-wrap gap-1.5">
                {g.newspapers.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No newspapers assigned</span>
                ) : (
                  g.newspapers.map((np) => (
                    <span
                      key={np}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                    >
                      {np}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
