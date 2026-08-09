'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Lock, X } from 'lucide-react';

interface PinModalProps {
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  confirmIcon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

const CORRECT_PIN = '2212';

export default function PinModal({ title, description, confirmLabel, confirmIcon, onConfirm, onCancel }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (pin === CORRECT_PIN) {
      setError('');
      onConfirm();
    } else {
      setError('Incorrect PIN. Please try again.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <div className="text-xs text-slate-500 mt-1">{description}</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex-shrink-0 w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* PIN Entry */}
        <div className="px-5 py-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-2">
            <Lock size={12} />
            Enter PIN to confirm
          </label>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="••••"
            className={`w-full px-4 py-2.5 rounded-lg border text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 transition-colors ${
              error
                ? 'border-red-400 focus:ring-red-200 bg-red-50' :'border-slate-200 focus:ring-blue-200 bg-slate-50'
            }`}
          />
          {error && (
            <p className="text-xs text-red-600 mt-1.5 font-medium">{error}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pin.length !== 4}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirmIcon}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
