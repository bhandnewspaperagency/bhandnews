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
  RATES: 'bhand_newspaper_rates',
  GROUPS: 'bhand_newspaper_groups',
  FREE_QTY: 'bhand_hawker_free_qty',
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

export function getExistingBillingRecord(hawkerId: number, date: string): DailyBillingRecord | null {
  const records = getBillingRecords();
  return records.find((b) => b.hawkerId === hawkerId && b.date === date) ?? null;
}

export function deleteBillingRecordForHawkerDate(hawkerId: number, date: string): void {
  const list = getBillingRecords();
  const filtered = list.filter((b) => !(b.hawkerId === hawkerId && b.date === date));
  write(KEYS.BILLING, filtered);
  rebuildMonthlyTracker();
}

// ─── Monthly Tracker ─────────────────────────────────────────────────────────

export function getMonthlyTracker(): MonthlyTrackerRow[] {
  seedIfNeeded();
  return read<MonthlyTrackerRow[]>(KEYS.MONTHLY) ?? MOCK_MONTHLY_TRACKER;
}

export function resetMonthlyTracker(): void {
  if (!isBrowser()) return;
  write(KEYS.MONTHLY, []);
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

// ─── Newspaper Rates ──────────────────────────────────────────────────────────

export interface NewspaperRateEntry {
  newspaper: string;
  rate: number;
}

export interface DailyRateRecord {
  date: string; // YYYY-MM-DD
  rates: NewspaperRateEntry[];
}

/**
 * Get all daily rate records, sorted by date descending.
 */
export function getAllRates(): DailyRateRecord[] {
  return read<DailyRateRecord[]>(KEYS.RATES) ?? [];
}

/**
 * Get the rate for a specific newspaper on a specific date.
 * Falls back to the most recent rate before that date, then to the default NEWSPAPERS rate.
 */
export function getRateForDate(newspaper: string, date: string): number {
  const all = getAllRates();
  // Sort descending by date
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  // Find the most recent record on or before the given date
  for (const record of sorted) {
    if (record.date <= date) {
      const entry = record.rates.find((r) => r.newspaper === newspaper);
      if (entry !== undefined) return entry.rate;
    }
  }
  // Fallback to default rate from NEWSPAPERS
  const np = NEWSPAPERS.find((n) => n.name === newspaper);
  return np?.rate ?? 0;
}

/**
 * Get the most recent rate record strictly BEFORE the given date (for return qty calculation).
 * This represents the rate on the day the papers were originally supplied.
 */
export function getPreviousDayRate(newspaper: string, date: string): number {
  const all = getAllRates();
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    if (record.date < date) {
      const entry = record.rates.find((r) => r.newspaper === newspaper);
      if (entry !== undefined) return entry.rate;
    }
  }
  // Fallback: same as current date rate
  return getRateForDate(newspaper, date);
}

/**
 * Save or update rates for a specific date.
 */
export function saveRatesForDate(date: string, rates: NewspaperRateEntry[]): void {
  const all = getAllRates();
  const idx = all.findIndex((r) => r.date === date);
  if (idx >= 0) {
    all[idx] = { date, rates };
  } else {
    all.push({ date, rates });
  }
  write(KEYS.RATES, all);
}

/**
 * Delete rate record for a specific date.
 */
export function deleteRatesForDate(date: string): void {
  const all = getAllRates().filter((r) => r.date !== date);
  write(KEYS.RATES, all);
}

/**
 * Get rates for a specific date (exact match).
 */
export function getRatesForDate(date: string): NewspaperRateEntry[] | null {
  const record = getAllRates().find((r) => r.date === date);
  return record?.rates ?? null;
}

// ─── Newspaper Groups ─────────────────────────────────────────────────────────

export interface NewspaperGroup {
  id: string;
  name: string;
  newspapers: string[]; // list of newspaper names
  color?: string; // optional color tag
}

export function getNewspaperGroups(): NewspaperGroup[] {
  return read<NewspaperGroup[]>(KEYS.GROUPS) ?? [];
}

export function saveNewspaperGroup(group: NewspaperGroup): NewspaperGroup {
  const list = getNewspaperGroups();
  const idx = list.findIndex((g) => g.id === group.id);
  if (idx >= 0) {
    list[idx] = group;
  } else {
    const newGroup = { ...group, id: group.id || `grp-${Date.now()}` };
    list.push(newGroup);
    write(KEYS.GROUPS, list);
    return newGroup;
  }
  write(KEYS.GROUPS, list);
  return group;
}

export function deleteNewspaperGroup(id: string): void {
  const list = getNewspaperGroups().filter((g) => g.id !== id);
  write(KEYS.GROUPS, list);
}

// ─── Hawker Free Qty Settings ─────────────────────────────────────────────────

export interface HawkerFreeQtyEntry {
  newspaper: string;
  freeQty: number;
}

export interface HawkerFreeQtySettings {
  hawkerId: number;
  entries: HawkerFreeQtyEntry[];
}

export function getAllFreeQtySettings(): HawkerFreeQtySettings[] {
  return read<HawkerFreeQtySettings[]>(KEYS.FREE_QTY) ?? [];
}

export function getFreeQtyForHawker(hawkerId: number): HawkerFreeQtyEntry[] {
  const all = getAllFreeQtySettings();
  return all.find((s) => s.hawkerId === hawkerId)?.entries ?? [];
}

export function saveFreeQtyForHawker(hawkerId: number, entries: HawkerFreeQtyEntry[]): void {
  const all = getAllFreeQtySettings();
  const idx = all.findIndex((s) => s.hawkerId === hawkerId);
  if (idx >= 0) {
    all[idx] = { hawkerId, entries };
  } else {
    all.push({ hawkerId, entries });
  }
  write(KEYS.FREE_QTY, all);
}
