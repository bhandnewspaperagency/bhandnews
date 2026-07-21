'use client';

import {
  Hawker,
  DailyBillingRecord,
  MonthlyTrackerRow,
  MASTER_DATA,
  MOCK_DAILY_BILLING,
  MOCK_MONTHLY_TRACKER,
  NEWSPAPERS,
  MONTHLY_CHART_DATA,
  NEWSPAPER_VOLUME_DATA,
  PAYMENT_STATUS_DATA,
} from './mockData';

export type { Hawker, DailyBillingRecord, MonthlyTrackerRow };
export { NEWSPAPERS, MONTHLY_CHART_DATA, NEWSPAPER_VOLUME_DATA, PAYMENT_STATUS_DATA };

const KEYS = {
  HAWKERS: 'bhand_hawkers',
  BILLING: 'bhand_billing',
  MONTHLY: 'bhand_monthly',
  AUTH: 'bhand_auth_session',
  SEEDED: 'bhand_seeded_v1',
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function read<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded — silently ignore
  }
}

export function seedIfNeeded(): void {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEYS.SEEDED)) return;
  write(KEYS.HAWKERS, MASTER_DATA);
  write(KEYS.BILLING, MOCK_DAILY_BILLING);
  write(KEYS.MONTHLY, MOCK_MONTHLY_TRACKER);
  localStorage.setItem(KEYS.SEEDED, '1');
}

// ─── Hawkers ────────────────────────────────────────────────────────────────

export function getHawkers(): Hawker[] {
  seedIfNeeded();
  return read<Hawker[]>(KEYS.HAWKERS) ?? MASTER_DATA;
}

export function saveHawker(hawker: Hawker): Hawker {
  const list = getHawkers();
  const idx = list.findIndex((h) => h.id === hawker.id);
  if (idx >= 0) {
    list[idx] = hawker;
  } else {
    const newId = list.length > 0 ? Math.max(...list.map((h) => h.id)) + 1 : 1;
    hawker = { ...hawker, id: newId };
    list.push(hawker);
  }
  write(KEYS.HAWKERS, list);
  return hawker;
}

export function deleteHawker(id: number): void {
  const list = getHawkers().filter((h) => h.id !== id);
  write(KEYS.HAWKERS, list);
}

export function deleteHawkers(ids: number[]): void {
  const set = new Set(ids);
  const list = getHawkers().filter((h) => !set.has(h.id));
  write(KEYS.HAWKERS, list);
}

export function getHawkerById(id: number): Hawker | undefined {
  return getHawkers().find((h) => h.id === id);
}

// ─── Billing ─────────────────────────────────────────────────────────────────

export function getBillingRecords(): DailyBillingRecord[] {
  seedIfNeeded();
  return read<DailyBillingRecord[]>(KEYS.BILLING) ?? MOCK_DAILY_BILLING;
}

export function saveBillingRecord(record: DailyBillingRecord): void {
  const list = getBillingRecords();
  const idx = list.findIndex((b) => b.id === record.id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  write(KEYS.BILLING, list);
  // Rebuild monthly tracker after new billing entry
  rebuildMonthlyTracker();
}

export function getBillingByHawker(hawkerId: number): DailyBillingRecord[] {
  return getBillingRecords().filter((b) => b.hawkerId === hawkerId);
}

export function getTodayBilling(date: string): DailyBillingRecord[] {
  return getBillingRecords().filter((b) => b.date === date);
}

// ─── Monthly Tracker ─────────────────────────────────────────────────────────

export function getMonthlyTracker(): MonthlyTrackerRow[] {
  seedIfNeeded();
  return read<MonthlyTrackerRow[]>(KEYS.MONTHLY) ?? MOCK_MONTHLY_TRACKER;
}

function rebuildMonthlyTracker(): void {
  const billing = getBillingRecords();
  const hawkers = getHawkers();
  const map = new Map<number, MonthlyTrackerRow>();

  for (const bill of billing) {
    if (!map.has(bill.hawkerId)) {
      map.set(bill.hawkerId, {
        hawkerId: bill.hawkerId,
        hawkerName: bill.hawkerName,
        newspapers: {},
        grandTotal: 0,
      });
    }
    const row = map.get(bill.hawkerId)!;
    for (const entry of bill.entries) {
      row.newspapers[entry.newspaper] = (row.newspapers[entry.newspaper] || 0) + entry.total;
    }
    row.grandTotal += bill.totalBill;
  }

  // Ensure all hawkers appear even if no billing
  for (const h of hawkers) {
    if (!map.has(h.id)) {
      map.set(h.id, { hawkerId: h.id, hawkerName: h.name, newspapers: {}, grandTotal: 0 });
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => a.hawkerId - b.hawkerId);
  write(KEYS.MONTHLY, rows);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthSession {
  role: 'admin' | 'hawker';
  hawkerId?: number;
  hawkerName?: string;
}

export function getSession(): AuthSession | null {
  return read<AuthSession>(KEYS.AUTH);
}

export function setSession(session: AuthSession): void {
  write(KEYS.AUTH, session);
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(KEYS.AUTH);
}

export function loginAdmin(email: string, password: string): boolean {
  if (email === 'admin@bhandnews.in' && password === 'BhandNews@2026') {
    setSession({ role: 'admin' });
    return true;
  }
  return false;
}

export function loginHawker(name: string, contact: string): Hawker | null {
  let hawker = getHawkers().find(
    (h) => h.name.toLowerCase() === name.trim().toLowerCase() && h.contact === contact.trim()
  );
  if (hawker) {
    setSession({ role: 'hawker', hawkerId: hawker.id, hawkerName: hawker.name });
    return hawker;
  }
  return null;
}
