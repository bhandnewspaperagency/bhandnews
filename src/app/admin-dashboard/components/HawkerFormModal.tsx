'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { X, UserPlus, Save } from 'lucide-react';
import { Hawker } from '@/lib/mockData';

interface HawkerFormModalProps {
  hawker: Hawker | null;
  onClose: () => void;
  onSave: (data: Hawker) => void;
}

interface FormValues {
  name: string;
  contact: string;
  area: string;
  paymentType: 'Cash' | 'UPI' | 'Credit';
  status: 'Active' | 'Inactive';
  joinDate: string;
}

const AREAS = ['Nashik Road', 'Panchavati', 'Cidco', 'Satpur', 'Deolali', 'Gangapur Road', 'Trimbak Road'];

export default function HawkerFormModal({ hawker, onClose, onSave }: HawkerFormModalProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: hawker
      ? {
          name: hawker.name,
          contact: hawker.contact,
          area: hawker.area,
          paymentType: hawker.paymentType,
          status: hawker.status,
          joinDate: hawker.joinDate,
        }
      : {
          name: '',
          contact: '',
          area: 'Nashik Road',
          paymentType: 'Cash',
          status: 'Active',
          joinDate: '2026-04-23',
        },
  });

  const onSubmit = (data: FormValues) => {
    onSave({
      id: hawker?.id || 0,
      ...data,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(220,15%,88%)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[hsl(210,67%,23%)] flex items-center justify-center">
              <UserPlus size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {hawker ? 'Edit Hawker' : 'Add New Hawker'}
              </h2>
              <p className="text-xs text-slate-400">
                {hawker ? `Editing #${hawker.id} — ${hawker.name}` : 'Register a new hawker in the system'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className="label-text" htmlFor="hf-name">Full Name</label>
              <p className="text-xs text-slate-400 mb-1">Enter hawker&apos;s full name in UPPERCASE</p>
              <input
                id="hf-name"
                type="text"
                placeholder="e.g. AJAY BAGUL"
                className="input-field uppercase"
                {...register('name', {
                  required: 'Hawker name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' },
                })}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            {/* Contact */}
            <div>
              <label className="label-text" htmlFor="hf-contact">Contact Number</label>
              <p className="text-xs text-slate-400 mb-1">Used as login password</p>
              <input
                id="hf-contact"
                type="text"
                placeholder="10-digit mobile"
                maxLength={10}
                className="input-field font-mono"
                {...register('contact', {
                  required: 'Contact number is required',
                  pattern: { value: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit number' },
                })}
              />
              {errors.contact && <p className="mt-1 text-xs text-red-600">{errors.contact.message}</p>}
            </div>

            {/* Area */}
            <div>
              <label className="label-text" htmlFor="hf-area">Area / Route</label>
              <select id="hf-area" className="input-field" {...register('area', { required: 'Area is required' })}>
                {AREAS.map((a) => (
                  <option key={`area-${a}`} value={a}>{a}</option>
                ))}
              </select>
              {errors.area && <p className="mt-1 text-xs text-red-600">{errors.area.message}</p>}
            </div>

            {/* Payment Type */}
            <div>
              <label className="label-text" htmlFor="hf-payment">Payment Type</label>
              <select id="hf-payment" className="input-field" {...register('paymentType')}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="label-text" htmlFor="hf-status">Status</label>
              <select id="hf-status" className="input-field" {...register('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Join Date */}
            <div>
              <label className="label-text" htmlFor="hf-join">Join Date</label>
              <input
                id="hf-join"
                type="date"
                className="input-field"
                {...register('joinDate', { required: 'Join date is required' })}
              />
              {errors.joinDate && <p className="mt-1 text-xs text-red-600">{errors.joinDate.message}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[hsl(220,15%,88%)]">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} />
                  {hawker ? 'Save Changes' : 'Add Hawker'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}