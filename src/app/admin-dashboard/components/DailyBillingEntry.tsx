'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Search, Send, CheckCircle2, AlertCircle, MessageSquare, ChevronDown, Printer, Info, Settings, X, Save, Trash2, Mic, MicOff, Volume2 } from 'lucide-react';
import { getHawkers, saveBillingRecord, getRateForDate, getPreviousDayRate, getFreeQtyForHawker, saveFreeQtyForHawker, getExistingBillingRecord, deleteBillingRecordForHawkerDate, getNewspaperList } from '@/lib/storage';
import type { Hawker, DailyBillingRecord, HawkerFreeQtyEntry, NewspaperEntry } from '@/lib/storage';
import PinModal from './PinModal';

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

// ─── Free Qty Settings Modal ──────────────────────────────────────────────────

interface FreeQtyModalProps {
  hawker: Hawker;
  newspapers: NewspaperEntry[];
  onClose: () => void;
  onSaved: (entries: HawkerFreeQtyEntry[]) => void;
}

function FreeQtyModal({ hawker, newspapers, onClose, onSaved }: FreeQtyModalProps) {
  const [freeQtys, setFreeQtys] = useState<number[]>(() => {
    const saved = getFreeQtyForHawker(hawker.id);
    return newspapers.map((np) => {
      const found = saved.find((e) => e.newspaper === np.name);
      return found ? found.freeQty : 0;
    });
  });

  const handleChange = (i: number, val: string) => {
    const num = parseInt(val) || 0;
    setFreeQtys((prev) => {
      const next = [...prev];
      next[i] = num;
      return next;
    });
  };

  const handleSave = () => {
    const entries: HawkerFreeQtyEntry[] = newspapers.map((np, i) => ({
      newspaper: np.name,
      freeQty: freeQtys[i],
    }));
    saveFreeQtyForHawker(hawker.id, entries);
    onSaved(entries);
    toast.success(`Free quantity settings saved for ${hawker.name}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Free PVC / Fixed Copies</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hawker: <span className="font-semibold text-[hsl(210,67%,23%)]">{hawker.name}</span> (ID: {hawker.id})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-1 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-slate-500 mb-3">
            Set the fixed free copies per newspaper for this hawker. These will auto-fill in the Free PVC column every time you open billing for this hawker.
          </p>
          {newspapers.map((np, i) => (
            <div key={`fq-${np.id}`} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm font-medium text-slate-700 flex-1">{np.name}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={freeQtys[i] || ''}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder="0"
                className="w-20 text-center input-field text-sm tabular-nums"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[hsl(210,67%,23%)] text-white hover:bg-[hsl(210,67%,18%)] transition-colors"
          >
            <Save size={14} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Voice Billing Modal ──────────────────────────────────────────────────────

interface VoiceBillingModalProps {
  hawkers: Hawker[];
  newspapers: NewspaperEntry[];
  onClose: () => void;
  onApply: (hawker: Hawker, npIndex: number, supply: number, returnQty: number) => void;
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function fuzzyMatch(query: string, target: string): number {
  const q = normalizeText(query);
  const t = normalizeText(target);
  if (t === q) return 1;
  if (t.includes(q) || q.includes(t)) return 0.9;
  // word overlap score
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);
  const matches = qWords.filter((w) => tWords.some((tw) => tw.includes(w) || w.includes(tw)));
  return matches.length / Math.max(qWords.length, tWords.length);
}

interface ParsedVoiceCommand {
  hawker: Hawker | null;
  newspaper: NewspaperEntry | null;
  supply: number;
  returnQty: number;
  confidence: number;
  rawText: string;
}

function parseVoiceCommand(
  text: string,
  hawkers: Hawker[],
  newspapers: NewspaperEntry[]
): ParsedVoiceCommand {
  const raw = text;
  const normalized = normalizeText(text);

  // ── 1. Extract supply and return numbers ──────────────────────────────────
  // Patterns: "supply 32 return 2", "supply 32 ret 2", "32 return 2", "32 2"
  let supply = 0;
  let returnQty = 0;

  const supplyReturnPattern = /supply\s+(\d+)\s+(?:return|ret|retur|retun)\s+(\d+)/i;
  const supplyOnlyReturnPattern = /(\d+)\s+(?:return|ret|retur|retun)\s+(\d+)/i;
  const twoNumbersAtEnd = /(\d+)\s+(\d+)\s*$/;

  let textForParsing = normalized;

  const m1 = textForParsing.match(supplyReturnPattern);
  if (m1) {
    supply = parseInt(m1[1]);
    returnQty = parseInt(m1[2]);
    textForParsing = textForParsing.replace(m1[0], '').trim();
  } else {
    const m2 = textForParsing.match(supplyOnlyReturnPattern);
    if (m2) {
      supply = parseInt(m2[1]);
      returnQty = parseInt(m2[2]);
      textForParsing = textForParsing.replace(m2[0], '').trim();
    } else {
      const m3 = textForParsing.match(twoNumbersAtEnd);
      if (m3) {
        supply = parseInt(m3[1]);
        returnQty = parseInt(m3[2]);
        textForParsing = textForParsing.replace(m3[0], '').trim();
      } else {
        // single number = supply only
        const singleNum = textForParsing.match(/(\d+)/);
        if (singleNum) {
          supply = parseInt(singleNum[1]);
          textForParsing = textForParsing.replace(singleNum[0], '').trim();
        }
      }
    }
  }

  // ── 2. Match newspaper ────────────────────────────────────────────────────
  let bestNp: NewspaperEntry | null = null;
  let bestNpScore = 0;

  for (const np of newspapers) {
    const score = fuzzyMatch(textForParsing, np.name);
    if (score > bestNpScore) {
      bestNpScore = score;
      bestNp = np;
    }
  }

  // ── 3. Match hawker ───────────────────────────────────────────────────────
  // Try ID match first (number at start)
  let bestHawker: Hawker | null = null;
  let bestHawkerScore = 0;

  const idMatch = normalized.match(/^(\d+)/);
  if (idMatch) {
    const idNum = parseInt(idMatch[1]);
    const found = hawkers.find((h) => h.id === idNum);
    if (found) {
      bestHawker = found;
      bestHawkerScore = 1;
    }
  }

  if (!bestHawker) {
    // Remove newspaper name tokens from text to isolate hawker name
    const npTokens = bestNp ? normalizeText(bestNp.name).split(/\s+/) : [];
    let hawkerText = textForParsing;
    for (const tok of npTokens) {
      hawkerText = hawkerText.replace(new RegExp(`\\b${tok}\\b`, 'g'), '').trim();
    }
    hawkerText = hawkerText.replace(/\b(supply|return|ret|retur|retun)\b/g, '').trim();

    for (const h of hawkers) {
      const score = fuzzyMatch(hawkerText, h.name);
      if (score > bestHawkerScore) {
        bestHawkerScore = score;
        bestHawker = h;
      }
    }
  }

  const confidence = (bestHawkerScore + bestNpScore) / 2;

  return {
    hawker: bestHawker,
    newspaper: bestNp,
    supply,
    returnQty,
    confidence,
    rawText: raw,
  };
}

function VoiceBillingModal({ hawkers, newspapers, onClose, onApply }: VoiceBillingModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceCommand | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (typeof window !== 'undefined' &&
        ((window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition)) ||
      null;
    if (!SpeechRecognitionAPI) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        setTranscript(final.trim());
        setInterimTranscript('');
        const result = parseVoiceCommand(final.trim(), hawkers, newspapers);
        setParsed(result);
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        toast.error(`Mic error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [hawkers, newspapers]);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setTranscript('');
    setInterimTranscript('');
    setParsed(null);
    setIsListening(true);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
  };

  const handleApply = () => {
    if (!parsed?.hawker || !parsed?.newspaper) return;
    const npIndex = newspapers.findIndex((np) => np.id === parsed.newspaper!.id);
    if (npIndex === -1) return;
    onApply(parsed.hawker, npIndex, parsed.supply, parsed.returnQty);
    onClose();
  };

  const handleManualParse = () => {
    if (!transcript.trim()) return;
    const result = parseVoiceCommand(transcript.trim(), hawkers, newspapers);
    setParsed(result);
  };

  const confidenceColor =
    !parsed ? '' :
    parsed.confidence >= 0.7 ? 'text-green-600' :
    parsed.confidence >= 0.4 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(210,67%,23%)] flex items-center justify-center">
              <Mic size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Voice Billing Entry</h3>
              <p className="text-xs text-slate-500">Speak hawker + newspaper + supply + return</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {!supported ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              Voice input is not supported in this browser. Please use Chrome or Edge.
            </div>
          ) : (
            <>
              {/* Example commands */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Example commands</p>
                <p className="text-xs text-slate-600 font-mono bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  &quot;Ajay Bagul Lokmat CNX supply 32 return 2&quot;
                </p>
                <p className="text-xs text-slate-600 font-mono bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  &quot;Hawker 5 Lokmat Big 45 return 3&quot;
                </p>
                <p className="text-xs text-slate-600 font-mono bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                  &quot;Ramesh Sakal supply 20 return 0&quot;
                </p>
              </div>

              {/* Mic button */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' :'bg-[hsl(210,67%,23%)] hover:bg-[hsl(210,67%,18%)]'
                  }`}
                >
                  {isListening ? (
                    <MicOff size={32} className="text-white" />
                  ) : (
                    <Mic size={32} className="text-white" />
                  )}
                </button>
                <p className="text-sm font-medium text-slate-600">
                  {isListening ? (
                    <span className="text-red-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-ping inline-block" />
                      Listening… speak now
                    </span>
                  ) : (
                    'Tap mic to start speaking'
                  )}
                </p>
              </div>

              {/* Transcript display */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Transcript
                </label>
                <div className="relative">
                  <textarea
                    value={transcript || interimTranscript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Voice transcript will appear here… or type manually"
                    rows={2}
                    className="w-full input-field text-sm resize-none pr-10"
                  />
                  {(transcript || interimTranscript) && (
                    <Volume2 size={14} className="absolute right-3 top-3 text-slate-400" />
                  )}
                </div>
                {transcript && (
                  <button
                    type="button"
                    onClick={handleManualParse}
                    className="mt-1.5 text-xs text-[hsl(210,67%,40%)] hover:underline font-medium"
                  >
                    Re-parse transcript →
                  </button>
                )}
              </div>

              {/* Parsed result */}
              {parsed && (
                <div className={`rounded-xl border p-4 space-y-3 ${
                  parsed.confidence >= 0.6 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Parsed Result</p>
                    <span className={`text-xs font-semibold ${confidenceColor}`}>
                      {Math.round(parsed.confidence * 100)}% match
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Hawker</p>
                      {parsed.hawker ? (
                        <p className="text-sm font-bold text-slate-900">
                          #{parsed.hawker.id} {parsed.hawker.name}
                        </p>
                      ) : (
                        <p className="text-sm text-red-500 font-medium">Not found</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Newspaper</p>
                      {parsed.newspaper ? (
                        <p className="text-sm font-bold text-slate-900">{parsed.newspaper.name}</p>
                      ) : (
                        <p className="text-sm text-red-500 font-medium">Not found</p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Supply Qty</p>
                      <p className="text-lg font-bold text-[hsl(210,67%,23%)] font-mono">{parsed.supply}</p>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">Return Qty</p>
                      <p className="text-lg font-bold text-amber-600 font-mono">{parsed.returnQty}</p>
                    </div>
                  </div>
                  {parsed.confidence < 0.4 && (
                    <p className="text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                      Low confidence match. Please verify the hawker and newspaper before applying.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!parsed?.hawker || !parsed?.newspaper}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-[hsl(210,67%,23%)] text-white hover:bg-[hsl(210,67%,18%)] disabled:opacity-40 transition-colors"
          >
            <CheckCircle2 size={14} />
            Apply to Billing
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyBillingEntry() {
  const [hawkers, setHawkers] = useState<Hawker[]>([]);
  const [newspapers, setNewspapers] = useState<NewspaperEntry[]>([]);
  const [selectedHawker, setSelectedHawker] = useState<Hawker | null>(null);
  const [hawkerSearch, setHawkerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [showFreeQtyModal, setShowFreeQtyModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [lokmtPaymentType, setLokmtPaymentType] = useState<'Transfer' | 'Cash'>('Transfer');
  const [isDataPreloaded, setIsDataPreloaded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteBillingConfirm, setShowDeleteBillingConfirm] = useState(false);
  const [rows, setRows] = useState<BillingRow[]>([]);
  // Resolved rates per newspaper for current bill date
  const [supplyRates, setSupplyRates] = useState<number[]>([]);
  const [returnRates, setReturnRates] = useState<number[]>([]);

  // Use local date (not UTC) to avoid IST timezone shift
  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  // Load hawkers and dynamic newspaper list on mount
  useEffect(() => {
    setHawkers(getHawkers());
    const npList = getNewspaperList();
    setNewspapers(npList);
    setRows(npList.map(() => ({ supplyQty: 0, returnQty: 0, freePvc: 0 })));
    // Initialize rates from Rate Management for today
    const todayDate = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${mo}-${day}`;
    })();
    setSupplyRates(npList.map((np) => getRateForDate(np.name, todayDate)));
    setReturnRates(npList.map((np) => getPreviousDayRate(np.name, todayDate)));
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

  // Recalculate rates whenever billDate or newspapers change
  useEffect(() => {
    if (!billDate || newspapers.length === 0) return;
    const sRates = newspapers.map((np) => getRateForDate(np.name, billDate));
    const rRates = newspapers.map((np) => getPreviousDayRate(np.name, billDate));
    setSupplyRates(sRates);
    setReturnRates(rRates);
  }, [billDate, newspapers]);

  // When hawker or date changes, try to load existing saved record
  useEffect(() => {
    if (!selectedHawker || !billDate || newspapers.length === 0) return;
    const existing = getExistingBillingRecord(selectedHawker.id, billDate);
    if (existing && existing.entries.length > 0) {
      // Pre-populate rows from saved record
      const newRows = newspapers.map((np) => {
        const entry = existing.entries.find((e) => e.newspaper === np.name);
        if (entry) {
          return {
            supplyQty: entry.supplyQty,
            returnQty: entry.returnQty,
            freePvc: entry.netQty !== undefined
              ? Math.max(0, entry.supplyQty - entry.netQty)
              : 0,
          };
        }
        // fallback: apply free qty settings
        const saved = getFreeQtyForHawker(selectedHawker.id);
        const freeEntry = saved.find((e) => e.newspaper === np.name);
        return { supplyQty: 0, returnQty: 0, freePvc: freeEntry ? freeEntry.freeQty : 0 };
      });
      setRows(newRows);
      setValue('paymentType', existing.paymentType as 'Cash' | 'UPI' | 'Credit');
      setIsDataPreloaded(true);
      setSubmitted(true);
    } else {
      setIsDataPreloaded(false);
      setSubmitted(false);
    }
  }, [selectedHawker, billDate, newspapers]);

  const updateRow = (index: number, field: 'supplyQty' | 'returnQty' | 'freePvc', value: string) => {
    const numVal = parseInt(value) || 0;
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: numVal };
      return next;
    });
  };

  const getNetQty = (i: number) => Math.max(0, (rows[i]?.supplyQty || 0) - (rows[i]?.freePvc || 0));

  // Total = (NetQty × bill date's rate) - (ReturnQty × previous day's rate)
  const getTotal = (i: number) => {
    const netQty = getNetQty(i);
    const ret = (rows[i]?.returnQty || 0) * returnRates[i];
    return Math.max(0, netQty * supplyRates[i] - ret);
  };

  const getTotalBill = () => newspapers.reduce((sum, _, i) => sum + getTotal(i), 0);

  // Lokmat = first 3 newspapers (indices 0, 1, 2)
  const LOKMAT_COUNT = 3;
  const getLokmtSubtotal = () => newspapers.slice(0, LOKMAT_COUNT).reduce((sum, _, i) => sum + getTotal(i), 0);
  const getOtherSubtotal = () => newspapers.slice(LOKMAT_COUNT).reduce((sum, _, i) => sum + getTotal(LOKMAT_COUNT + i), 0);

  const ratesAreDifferent = (i: number) => supplyRates[i] !== returnRates[i];

  const filteredHawkers = hawkers.filter(
    (h) =>
      h.name.toLowerCase().includes(hawkerSearch.toLowerCase()) ||
      String(h.id).includes(hawkerSearch)
  ).slice(0, 8);

  // Auto-fill Free PVC from saved settings when hawker is selected
  const applyFreeQtySettings = (hawker: Hawker) => {
    const saved = getFreeQtyForHawker(hawker.id);
    if (saved.length > 0) {
      setRows((prev) =>
        prev.map((row, i) => {
          const entry = saved.find((e) => e.newspaper === newspapers[i]?.name);
          return entry ? { ...row, freePvc: entry.freeQty } : row;
        })
      );
    }
  };

  const handleSelectHawker = (hawker: Hawker) => {
    setSelectedHawker(hawker);
    setValue('hawkerId', String(hawker.id));
    setHawkerSearch('');
    setIsDataPreloaded(false);
    setSubmitted(false);
    setShowResetConfirm(false);
    // Reset rows first, then apply saved free qty settings
    const saved = getFreeQtyForHawker(hawker.id);
    setRows(
      newspapers.map((np) => {
        const entry = saved.find((e) => e.newspaper === np.name);
        return { supplyQty: 0, returnQty: 0, freePvc: entry ? entry.freeQty : 0 };
      })
    );
    // The useEffect for selectedHawker+billDate will fire and load existing record if any
  };

  // When free qty settings are saved from modal, update current rows too
  const handleFreeQtySaved = (entries: HawkerFreeQtyEntry[]) => {
    setRows((prev) =>
      prev.map((row, i) => {
        const entry = entries.find((e) => e.newspaper === newspapers[i]?.name);
        return entry !== undefined ? { ...row, freePvc: entry.freeQty } : row;
      })
    );
  };

  // Handle voice billing apply: select hawker + fill newspaper row
  const handleVoiceApply = (hawker: Hawker, npIndex: number, supply: number, returnQty: number) => {
    // Select hawker if not already selected
    if (!selectedHawker || selectedHawker.id !== hawker.id) {
      handleSelectHawker(hawker);
    }
    // Apply supply/return to the specific newspaper row
    setRows((prev) => {
      const next = [...prev];
      if (next[npIndex]) {
        next[npIndex] = { ...next[npIndex], supplyQty: supply, returnQty };
      }
      return next;
    });
    toast.success(
      `Voice filled: ${hawker.name} → ${newspapers[npIndex]?.name} — Supply: ${supply}, Return: ${returnQty}`,
      { duration: 4000 }
    );
  };

  const handleFormSubmit = async (formData: BillingFormValues) => {
    if (!selectedHawker) {
      toast.error('Please select a hawker before submitting.');
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));

    const entries = newspapers.map((np, i) => ({
      srNo: i + 1,
      newspaper: np.name,
      rate: supplyRates[i],
      supplyQty: rows[i]?.supplyQty || 0,
      returnQty: rows[i]?.returnQty || 0,
      netQty: getNetQty(i),
      total: getTotal(i),
    })).filter((e) => e.supplyQty > 0);

    // Use a stable ID based on hawker+date so re-saving updates the same record
    const record: DailyBillingRecord = {
      id: `bill-${formData.date.replace(/-/g, '')}-${selectedHawker.id}`,
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
    setIsDataPreloaded(true);
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

  const handleSendSMS = () => {
    const date = billDate ?? today;
    const grandTotal = getTotalBill();
    const transferToCompany = getLokmtSubtotal();
    const cash = getOtherSubtotal();
    const formattedDate = new Date(date).toLocaleDateString('en-IN');
    const hawkerName = selectedHawker?.name ?? 'N/A';

    const message =
      `Bhand Newspaper Agency - Daily Billing\n` +
      `Date: ${formattedDate}\n` +
      `Hawker: ${hawkerName}\n` +
      `----------------------------\n` +
      `Grand Total: Rs.${grandTotal.toFixed(2)}\n` +
      `Transfer to Company (Lokmat): Rs.${transferToCompany.toFixed(2)}\n` +
      `Cash: Rs.${cash.toFixed(2)}`;

    const smsUrl = `sms:8830667147?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_self');
  };

  const handleReset = () => {
    setSelectedHawker(null);
    setRows(newspapers.map(() => ({ supplyQty: 0, returnQty: 0, freePvc: 0 })));
    setSubmitted(false);
    setIsDataPreloaded(false);
    setShowResetConfirm(false);
    setValue('hawkerId', '');
  };

  // Reset only the current day's data for the selected hawker
  const handleResetDayData = () => {
    if (!selectedHawker || !billDate) return;
    deleteBillingRecordForHawkerDate(selectedHawker.id, billDate);
    // Restore rows to free qty defaults only
    const saved = getFreeQtyForHawker(selectedHawker.id);
    setRows(
      newspapers.map((np) => {
        const entry = saved.find((e) => e.newspaper === np.name);
        return { supplyQty: 0, returnQty: 0, freePvc: entry ? entry.freeQty : 0 };
      })
    );
    setSubmitted(false);
    setIsDataPreloaded(false);
    setShowResetConfirm(false);
    toast.success(`Billing data reset for ${selectedHawker.name} on ${new Date(billDate).toLocaleDateString('en-IN')}`);
  };

  const handleDeleteBillingEntry = () => {
    if (!selectedHawker || !billDate) return;
    deleteBillingRecordForHawkerDate(selectedHawker.id, billDate);
    const saved = getFreeQtyForHawker(selectedHawker.id);
    setRows(
      newspapers.map((np) => {
        const entry = saved.find((e) => e.newspaper === np.name);
        return { supplyQty: 0, returnQty: 0, freePvc: entry ? entry.freeQty : 0 };
      })
    );
    setSubmitted(false);
    setIsDataPreloaded(false);
    setShowDeleteBillingConfirm(false);
    toast.success(`Billing entry deleted for ${selectedHawker.name} on ${new Date(billDate).toLocaleDateString('en-IN')}`);
  };

  const handlePrint = () => {
    const hawkerName = selectedHawker?.name ?? 'N/A';
    const hawkerArea = selectedHawker?.area ?? '';
    const hawkerContact = selectedHawker?.contact ?? '';
    const hawkerId = selectedHawker?.id ?? '';
    const date = billDate ?? today;
    const payType = paymentType;

    const tableRows = newspapers.map((np, i) => {
      const netQty = getNetQty(i);
      const total = getTotal(i);
      return `
        <tr>
          <td>${i + 1}</td>
          <td class="left">${np.name}</td>
          <td>${supplyRates[i]?.toFixed(2) ?? np.rate.toFixed(2)}</td>
          <td>${returnRates[i]?.toFixed(2) ?? np.rate.toFixed(2)}</td>
          <td>${rows[i]?.supplyQty || 0}</td>
          <td>${rows[i]?.returnQty || 0}</td>
          <td>${rows[i]?.freePvc || 0}</td>
          <td>${netQty}</td>
          <td class="right">${total > 0 ? '₹' + total.toFixed(2) : '—'}</td>
        </tr>`;
    }).join('');

    const totalFreePvc = newspapers.reduce((s, _, i) => s + (rows[i]?.freePvc || 0), 0);
    const totalNetQty = newspapers.reduce((s, _, i) => s + getNetQty(i), 0);
    const grandTotal = getTotalBill();

    const printContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Daily Bill — ${hawkerName} — ${date}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 10mm;
    }
    @page landscape {
      size: A4 landscape;
      margin: 10mm 12mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      color: #1e293b;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e3a5f;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header .agency {
      font-size: 16px;
      font-weight: 700;
      color: #1e3a5f;
    }
    .header .sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .header .bill-info {
      text-align: right;
      font-size: 10px;
      color: #475569;
    }
    .header .bill-info strong {
      font-size: 12px;
      color: #1e3a5f;
    }
    .hawker-bar {
      display: flex;
      gap: 24px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 10px;
    }
    .hawker-bar .field label {
      color: #94a3b8;
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .hawker-bar .field span {
      font-weight: 600;
      color: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
    }
    thead tr {
      background: #1e3a5f;
      color: #fff;
    }
    thead th {
      padding: 6px 7px;
      text-align: center;
      font-weight: 600;
      white-space: nowrap;
      border: 1px solid #1e3a5f;
    }
    thead th.left { text-align: left; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #eff6ff; }
    tbody td {
      padding: 5px 7px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    tbody td.left { text-align: left; }
    tbody td.right { text-align: right; font-weight: 600; }
    tfoot tr {
      background: #1e3a5f;
      color: #fff;
    }
    tfoot td {
      padding: 7px 7px;
      text-align: center;
      border: 1px solid #1e3a5f;
      font-weight: 700;
    }
    tfoot td.label { text-align: left; font-size: 12px; }
    tfoot td.grand { text-align: right; font-size: 13px; }
    .footer {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
    .sig-line {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
    .sig-line .box {
      border-top: 1px solid #1e3a5f;
      width: 140px;
      text-align: center;
      padding-top: 4px;
      font-size: 9px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="agency">Bhand Newspaper Agency</div>
      <div class="sub">Daily Billing Statement</div>
    </div>
    <div class="bill-info">
      <strong>Date: ${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong><br/>
      Payment: ${payType}
    </div>
  </div>

  <div class="hawker-bar">
    <div class="field"><label>Hawker ID</label><span>${hawkerId}</span></div>
    <div class="field"><label>Name</label><span>${hawkerName}</span></div>
    <div class="field"><label>Area</label><span>${hawkerArea}</span></div>
    <div class="field"><label>Contact</label><span>${hawkerContact}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Sr.</th>
        <th class="left">Newspaper</th>
        <th>Supply Rate (₹)</th>
        <th>Return Rate (₹)</th>
        <th>Supply Qty</th>
        <th>Return</th>
        <th>Free PVC</th>
        <th>Net Qty</th>
        <th>Total (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="6" class="label">Grand Total</td>
        <td>${totalFreePvc}</td>
        <td>${totalNetQty}</td>
        <td class="grand">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>

  <div class="sig-line"><div class="box">Authorised Signature</div></div>

  <div class="footer">
    <span>Printed on: ${new Date().toLocaleString('en-IN')}</span>
    <span>Bhand Newspaper Agency — Internal Copy</span>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      toast.error('Pop-up blocked. Please allow pop-ups and try again.');
      return;
    }
    win.document.write(printContent);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  const hasRateDifference = newspapers.some((_, i) => ratesAreDifferent(i));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Free Qty Settings Modal */}
      {showFreeQtyModal && selectedHawker && (
        <FreeQtyModal
          hawker={selectedHawker}
          newspapers={newspapers}
          onClose={() => setShowFreeQtyModal(false)}
          onSaved={handleFreeQtySaved}
        />
      )}

      {/* Voice Billing Modal */}
      {showVoiceModal && (
        <VoiceBillingModal
          hawkers={hawkers}
          newspapers={newspapers}
          onClose={() => setShowVoiceModal(false)}
          onApply={handleVoiceApply}
        />
      )}

      {/* Reset Day Data Confirmation */}
      {showResetConfirm && selectedHawker && (
        <PinModal
          title="Reset Day Data?"
          description={
            <>
              This will permanently clear the saved billing data for{' '}
              <span className="font-semibold text-[hsl(210,67%,23%)]">{selectedHawker.name}</span>{' '}
              on{' '}
              <span className="font-semibold">{new Date(billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>.
              You can re-enter fresh figures after resetting.
            </>
          }
          confirmLabel="Yes, Reset"
          confirmIcon={<X size={14} />}
          onConfirm={handleResetDayData}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}

      {/* Delete Billing Entry Confirmation Modal */}
      {showDeleteBillingConfirm && selectedHawker && (
        <PinModal
          title="Delete Billing Entry?"
          description={
            <>
              This will permanently delete the billing record for{' '}
              <span className="font-semibold text-red-600">{selectedHawker.name}</span>{' '}
              on{' '}
              <span className="font-semibold">{new Date(billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>.
              This action cannot be undone.
            </>
          }
          confirmLabel="Delete Permanently"
          confirmIcon={<Trash2 size={14} />}
          onConfirm={handleDeleteBillingEntry}
          onCancel={() => setShowDeleteBillingConfirm(false)}
        />
      )}

      <div className="flex items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Daily Billing Entry</h2>
          <p className="text-sm text-slate-500 mt-0.5">Enter supply and return quantities for each newspaper</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={() => setShowVoiceModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[hsl(210,67%,23%)] text-white hover:bg-[hsl(210,67%,18%)] transition-colors shadow-sm"
            title="Voice billing entry"
          >
            <Mic size={15} />
            <span className="hidden sm:inline">Voice Entry</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Hawker Selector */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-700">Step 1 — Select Hawker</h3>
          {selectedHawker && (
            <button
              type="button"
              onClick={() => setShowFreeQtyModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              title="Set fixed free copies per newspaper for this hawker"
            >
              <Settings size={13} />
              Free Qty Settings
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label-text" htmlFor="hawker-search">Search by Name or Hawker ID</label>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="hawker-search"
                type="text"
                placeholder="Type name or ID…"
                className="input-field pl-9 text-base"
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left min-h-[48px]"
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
              <select id="payment-type" className="input-field appearance-none pr-8 text-base min-h-[44px]" {...register('paymentType')}>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Credit">Credit</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="label-text" htmlFor="bill-date">Bill Date</label>
            <input id="bill-date" type="date" className="input-field text-base min-h-[44px]" {...register('date')} />
          </div>
        </div>
      </div>

      {/* Preloaded data banner */}
      {isDataPreloaded && selectedHawker && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2.5">
          <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-800 flex-1">
            <strong>Saved data loaded</strong> — Showing previously saved figures for{' '}
            <span className="font-semibold">{selectedHawker.name}</span> on{' '}
            {new Date(billDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}.
            Edit any field and re-save, or use <strong>Reset Day Data</strong> to start fresh.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteBillingConfirm(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={12} />
            Delete Entry
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
          >
            <X size={12} />
            Reset Day Data
          </button>
        </div>
      )}

      {/* Rate Info Banner */}
      {hasRateDifference && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2.5">
          <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>Rate change detected:</strong> Supply qty uses the bill date&apos;s rate; return qty uses the previous day&apos;s rate.
            Columns show both rates where they differ.
          </p>
        </div>
      )}

      {/* Billing Table */}
      <div className="bg-white rounded-xl border border-[hsl(220,15%,88%)] shadow-sm overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-[hsl(220,15%,88%)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Step 2 — Enter Newspaper Quantities</h3>
            <p className="text-xs text-slate-400 mt-0.5">Net Qty and Total are auto-calculated using date-based rates</p>
          </div>
          {selectedHawker && newspapers.some((np, i) => (rows[i]?.freePvc || 0) > 0) && (
            <span className="text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
              Free qty auto-filled
            </span>
          )}
        </div>

        {/* Mobile card layout */}
        <div className="block sm:hidden divide-y divide-[hsl(220,15%,93%)]">
          {newspapers.map((np, i) => {
            const netQty = getNetQty(i);
            const total = getTotal(i);
            const hasEntry = rows[i]?.supplyQty > 0;
            return (
              <React.Fragment key={`mob-billing-${np.id}`}>
                <div className={`px-4 py-3 space-y-2 ${hasEntry ? 'bg-[hsl(210,67%,98%)]' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${hasEntry ? 'text-[hsl(210,67%,23%)]' : 'text-slate-700'}`}>{np.name}</span>
                    <span className={`font-mono text-sm font-bold ${total > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                      {total > 0 ? `₹${total.toFixed(2)}` : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Supply</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={rows[i]?.supplyQty || ''}
                        onChange={(e) => updateRow(i, 'supplyQty', e.target.value)}
                        className="w-full text-center input-field text-sm tabular-nums min-h-[44px]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Return</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={rows[i]?.returnQty || ''}
                        onChange={(e) => updateRow(i, 'returnQty', e.target.value)}
                        className="w-full text-center input-field text-sm tabular-nums min-h-[44px]"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Net / Free</label>
                      <div className="flex items-center gap-1">
                        <span className={`font-mono text-sm font-semibold ${netQty > 0 ? 'text-[hsl(210,67%,23%)]' : 'text-slate-300'} flex-1 text-center`}>{netQty}</span>
                        <span
                          className="w-14 text-center text-xs tabular-nums min-h-[44px] flex items-center justify-center bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed select-none"
                          title="Edit via Free Qty Settings"
                        >{rows[i]?.freePvc || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Lokmat subtotal divider after 3rd newspaper */}
                {i === LOKMAT_COUNT - 1 && (
                  <div className="bg-indigo-50 border-y-2 border-indigo-200 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Lokmat Total</span>
                        <span className="text-[10px] text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded">(Direct Pay to Company)</span>
                      </div>
                      <span className="font-mono font-bold text-indigo-800 text-base">₹{getLokmtSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-600 font-medium">Payment:</span>
                      <div className="flex gap-2">
                        {(['Transfer', 'Cash'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setLokmtPaymentType(opt)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                              lokmtPaymentType === opt
                                ? 'bg-indigo-700 text-white border-indigo-700' :'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          {/* Mobile grand total */}
          <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Other Newspapers Total</span>
            <span className="font-mono font-bold text-slate-700">₹{getOtherSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-[hsl(210,67%,23%)] text-white px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">Grand Total</span>
            <span className="font-mono font-bold text-lg">₹{getTotalBill().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
          {/* Mobile payment bifurcation */}
          <div className="border-t border-slate-200">
            <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="text-xs font-semibold text-indigo-700">Transfer to Company</span>
                <span className="text-[10px] text-indigo-400">(Lokmat)</span>
              </div>
              <span className="font-mono font-bold text-indigo-800 text-sm">₹{getLokmtSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bg-green-50 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-xs font-semibold text-green-700">Cash</span>
                <span className="text-[10px] text-green-400">(Other Newspapers)</span>
              </div>
              <span className="font-mono font-bold text-green-800 text-sm">₹{getOtherSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Desktop table layout */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[hsl(220,15%,88%)]">
                <th className="table-header text-left w-8">Sr.</th>
                <th className="table-header text-left">Newspaper</th>
                <th className="table-header text-right">Supply Rate (₹)<br/><span className="font-normal normal-case text-slate-400 text-[10px]">(bill date)</span></th>
                <th className="table-header text-right">Return Rate (₹)<br/><span className="font-normal normal-case text-slate-400 text-[10px]">(prev day)</span></th>
                <th className="table-header text-center">Supply Qty<br/><span className="font-normal normal-case text-slate-400">(अंक)</span></th>
                <th className="table-header text-center">Return<br/><span className="font-normal normal-case text-slate-400">(परत)</span></th>
                <th className="table-header text-center">Free PVC<br/><span className="font-normal normal-case text-slate-400">(मोफत)</span></th>
                <th className="table-header text-center bg-blue-50">Net Qty</th>
                <th className="table-header text-right bg-blue-50">Total (₹)<br/><span className="font-normal normal-case text-slate-400">(रुपये)</span></th>
              </tr>
            </thead>
            <tbody>
              {newspapers.map((np, i) => {
                const netQty = getNetQty(i);
                const total = getTotal(i);
                const hasEntry = rows[i]?.supplyQty > 0;
                const ratesDiffer = ratesAreDifferent(i);
                const hasFreeQty = (rows[i]?.freePvc || 0) > 0;
                return (
                  <React.Fragment key={`billing-row-${np.id}`}>
                    <tr
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
                          inputMode="numeric"
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
                          inputMode="numeric"
                          min={0}
                          value={rows[i]?.returnQty || ''}
                          onChange={(e) => updateRow(i, 'returnQty', e.target.value)}
                          className="w-20 text-center input-field text-sm tabular-nums"
                          placeholder="0"
                        />
                      </td>
                      <td className="table-cell text-center">
                        <span
                          className={`inline-flex items-center justify-center w-20 min-h-[36px] rounded-lg border text-sm tabular-nums font-mono cursor-not-allowed select-none ${hasFreeQty ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
                          title="Edit via Free Qty Settings"
                        >{rows[i]?.freePvc || 0}</span>
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
                    {/* Lokmat subtotal row after 3rd newspaper */}
                    {i === LOKMAT_COUNT - 1 && (
                      <tr className="border-b-2 border-indigo-300 bg-indigo-50">
                        <td colSpan={5} className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Lokmat Total</span>
                            <span className="text-[10px] text-indigo-500 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full">Direct Pay to Company</span>
                            <div className="flex items-center gap-1.5 ml-2">
                              <span className="text-xs text-indigo-600 font-medium">Payment:</span>
                              {(['Transfer', 'Cash'] as const).map((opt) => (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setLokmtPaymentType(opt)}
                                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                                    lokmtPaymentType === opt
                                      ? 'bg-indigo-700 text-white border-indigo-700' :'bg-white text-indigo-600 border-indigo-300 hover:bg-indigo-50'
                                  }`}
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td colSpan={2} className="px-4 py-2.5 text-center">
                          <span className="text-xs text-indigo-500 font-mono">
                            {newspapers.slice(0, LOKMAT_COUNT).reduce((s, _, j) => s + (rows[j]?.freePvc || 0), 0)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="text-xs text-indigo-500 font-mono">
                            {newspapers.slice(0, LOKMAT_COUNT).reduce((s, _, j) => s + getNetQty(j), 0)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right bg-indigo-100/60">
                          <span className="font-mono font-bold text-indigo-800 text-sm">
                            ₹{getLokmtSubtotal().toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-200">
                <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-slate-500">Other Newspapers Total</td>
                <td className="px-4 py-2 text-center font-mono text-xs text-slate-500">
                  {newspapers.slice(LOKMAT_COUNT).reduce((s, _, j) => s + (rows[LOKMAT_COUNT + j]?.freePvc || 0), 0)}
                </td>
                <td className="px-4 py-2 text-center font-mono text-xs text-slate-500">
                  {newspapers.slice(LOKMAT_COUNT).reduce((s, _, j) => s + getNetQty(LOKMAT_COUNT + j), 0)}
                </td>
                <td className="px-4 py-2 text-right font-mono font-semibold text-slate-700">
                  ₹{getOtherSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr className="bg-[hsl(210,67%,23%)] text-white">
                <td colSpan={6} className="px-4 py-3 text-sm font-semibold">Grand Total</td>
                <td className="px-4 py-3 text-center font-mono font-bold">
                  {newspapers.reduce((s, _, i) => s + (rows[i]?.freePvc || 0), 0)}
                </td>
                <td className="px-4 py-3 text-center font-mono font-bold">
                  {newspapers.reduce((s, _, i) => s + getNetQty(i), 0)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold text-lg">
                  ₹{getTotalBill().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
              {/* Desktop payment bifurcation */}
              <tr className="bg-indigo-50 border-t border-indigo-200">
                <td colSpan={7} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="text-xs font-semibold text-indigo-700">Transfer to Company</span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 rounded-full">Lokmat</span>
                  </div>
                </td>
                <td colSpan={2} className="px-4 py-2.5 text-right">
                  <span className="font-mono font-bold text-indigo-800 text-sm">₹{getLokmtSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </td>
              </tr>
              <tr className="bg-green-50 border-t border-green-200">
                <td colSpan={7} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-xs font-semibold text-green-700">Cash</span>
                    <span className="text-[10px] text-green-400 bg-green-100 border border-green-200 px-1.5 py-0.5 rounded-full">Other Newspapers</span>
                  </div>
                </td>
                <td colSpan={2} className="px-4 py-2.5 text-right">
                  <span className="font-mono font-bold text-green-800 text-sm">₹{getOtherSubtotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-[hsl(220,15%,88%)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          {submitted && (
            <div className="flex items-center gap-2 text-green-700 text-sm font-semibold">
              <CheckCircle2 size={16} />
              Bill saved to local storage
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 border border-[hsl(220,15%,88%)] hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            Clear Hawker
          </button>
          {isDataPreloaded && selectedHawker && (
            <button
              type="button"
              onClick={() => setShowDeleteBillingConfirm(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
            >
              <Trash2 size={14} />
              Delete Entry
            </button>
          )}
          {isDataPreloaded && selectedHawker && (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
            >
              <X size={14} />
              Reset Day Data
            </button>
          )}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!selectedHawker || whatsappSending}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[44px]"
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
            onClick={handleSendSMS}
            disabled={!selectedHawker}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[hsl(220,15%,88%)] text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            <Send size={15} />
            Send SMS
          </button>
          <button
            type="button"
            onClick={handleSendSMS}
            disabled={!selectedHawker}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <MessageSquare size={15} />
            Send SMS
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[hsl(220,15%,88%)] text-slate-600 hover:bg-slate-50 transition-colors min-h-[44px]"
          >
            <Printer size={15} />
            Print
          </button>
          <button
            type="button"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting || !selectedHawker}
            className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            {isSubmitting ? 'Saving…' : submitted ? 'Update Bill' : 'Save Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}