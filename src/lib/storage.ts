'use client';

import { Hawker, DailyBillingRecord, MonthlyTrackerRow, MASTER_DATA, NEWSPAPERS, MONTHLY_CHART_DATA, NEWSPAPER_VOLUME_DATA, PAYMENT_STATUS_DATA,  } from './mockData';

export type { Hawker, DailyBillingRecord, MonthlyTrackerRow };
export { NEWSPAPERS, MONTHLY_CHART_DATA, NEWSPAPER_VOLUME_DATA, PAYMENT_STATUS_DATA };

const KEYS = {
  HAWKERS: 'bhand_hawkers',
  BILLING: 'bhand_billing',
  MONTHLY: 'bhand_monthly',
  AUTH: 'bhand_auth_session',
  SEEDED: 'bhand_seeded_v2',   // bumped version so old seed flag is ignored
  RATES: 'bhand_newspaper_rates',
  GROUPS: 'bhand_newspaper_groups',
  FREE_QTY: 'bhand_hawker_free_qty',
  COPIES: 'bhand_copies_tracker',
  NEWSPAPERS_LIST: 'bhand_newspapers_list',
};

// ─── IndexedDB Backup ─────────────────────────────────────────────────────────
// All writes are mirrored to IndexedDB so data survives localStorage clears.

const IDB_NAME = 'bhand_backup_db';
const IDB_STORE = 'kv_store';
const IDB_VERSION = 1;

let _idbReady: Promise<IDBDatabase> | null = null;

function openIDB(): Promise<IDBDatabase> {
  if (_idbReady) return _idbReady;
  _idbReady = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idbReady;
}

async function idbWrite(key: string, value: string): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // silent fail
    });
  } catch {
    // IndexedDB not available — silently ignore
  }
}

async function idbRead(key: string): Promise<string | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// ─── Core Read / Write ────────────────────────────────────────────────────────

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

/**
 * Write to localStorage AND mirror to IndexedDB backup.
 * IndexedDB is the safety net — if localStorage is ever cleared,
 * the next call to restoreFromBackupIfNeeded() will recover all data.
 */
function write<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    const serialised = JSON.stringify(value);
    localStorage.setItem(key, serialised);
    // Mirror to IndexedDB asynchronously (fire-and-forget)
    idbWrite(key, serialised).catch(() => {});
  } catch {
    // storage quota exceeded — still try IndexedDB
    idbWrite(key, JSON.stringify(value)).catch(() => {});
  }
}

/**
 * Restore all persisted keys from IndexedDB into localStorage.
 * Called once on app boot — recovers data if localStorage was cleared.
 */
export async function restoreFromBackupIfNeeded(): Promise<void> {
  if (!isBrowser()) return;

  const persistedKeys = [
    KEYS.HAWKERS,
    KEYS.BILLING,
    KEYS.MONTHLY,
    KEYS.RATES,
    KEYS.GROUPS,
    KEYS.FREE_QTY,
    KEYS.COPIES,
    KEYS.SEEDED,
    KEYS.NEWSPAPERS_LIST,
  ];

  for (const key of persistedKeys) {
    // Only restore if localStorage is missing this key
    if (localStorage.getItem(key) === null) {
      const backup = await idbRead(key);
      if (backup !== null) {
        try {
          localStorage.setItem(key, backup);
        } catch {
          // quota — skip
        }
      }
    }
  }
}

// ─── Seeding ──────────────────────────────────────────────────────────────────
/**
 * SAFE seed: only seeds hawkers if none exist at all.
 * NEVER overwrites billing records, Free PVC settings, or any other real data.
 */
export function seedIfNeeded(): void {
  if (!isBrowser()) return;

  // Seed hawkers only if the hawkers key is completely absent
  if (localStorage.getItem(KEYS.HAWKERS) === null) {
    write(KEYS.HAWKERS, MASTER_DATA);
  }

  // Mark as seeded so we don't re-check unnecessarily
  if (!localStorage.getItem(KEYS.SEEDED)) {
    localStorage.setItem(KEYS.SEEDED, '1');
    // Also persist the seed flag to IndexedDB
    idbWrite(KEYS.SEEDED, '1').catch(() => {});
  }
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
  return read<DailyBillingRecord[]>(KEYS.BILLING) ?? [];
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
  return read<MonthlyTrackerRow[]>(KEYS.MONTHLY) ?? [];
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

export function getAllRates(): DailyRateRecord[] {
  return read<DailyRateRecord[]>(KEYS.RATES) ?? [];
}

export function getRateForDate(newspaper: string, date: string): number {
  const all = getAllRates();
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    if (record.date <= date) {
      const entry = record.rates.find((r) => r.newspaper === newspaper);
      if (entry !== undefined) return entry.rate;
    }
  }
  const np = NEWSPAPERS.find((n) => n.name === newspaper);
  return np?.rate ?? 0;
}

export function getPreviousDayRate(newspaper: string, date: string): number {
  const all = getAllRates();
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    if (record.date < date) {
      const entry = record.rates.find((r) => r.newspaper === newspaper);
      if (entry !== undefined) return entry.rate;
    }
  }
  return getRateForDate(newspaper, date);
}

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

export function deleteRatesForDate(date: string): void {
  const all = getAllRates().filter((r) => r.date !== date);
  write(KEYS.RATES, all);
}

export function getRatesForDate(date: string): NewspaperRateEntry[] | null {
  const record = getAllRates().find((r) => r.date === date);
  return record?.rates ?? null;
}

// ─── Newspaper Groups ─────────────────────────────────────────────────────────

export interface NewspaperGroup {
  id: string;
  name: string;
  newspapers: string[];
  color?: string;
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

// ─── Copies Tracker ───────────────────────────────────────────────────────────

export interface CopiesEntry {
  newspaper: string;
  supply: number;
  returned: number;
}

export interface CopiesRecord {
  id: string;
  hawkerId: number;
  hawkerName: string;
  date: string;
  entries: CopiesEntry[];
}

export function getCopiesRecords(): CopiesRecord[] {
  return read<CopiesRecord[]>(KEYS.COPIES) ?? [];
}

export function saveCopiesRecord(record: CopiesRecord): void {
  const list = getCopiesRecords();
  const idx = list.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    list[idx] = record;
  } else {
    list.push(record);
  }
  write(KEYS.COPIES, list);
}

export function deleteCopiesRecord(id: string): void {
  const list = getCopiesRecords().filter((r) => r.id !== id);
  write(KEYS.COPIES, list);
}

// ─── Newspaper List Management ────────────────────────────────────────────────

export interface NewspaperEntry {
  id: string;
  name: string;
  rate: number;
}

export function getNewspaperList(): NewspaperEntry[] {
  const stored = read<NewspaperEntry[]>(KEYS.NEWSPAPERS_LIST);
  if (stored && stored.length > 0) return stored;
  // Fall back to NEWSPAPERS from mockData
  return NEWSPAPERS.map((n) => ({ id: n.name.toLowerCase().replace(/\s+/g, '_'), name: n.name, rate: n.rate }));
}

export function saveNewspaperList(list: NewspaperEntry[]): void {
  write(KEYS.NEWSPAPERS_LIST, list);
}

export function addNewspaper(entry: Omit<NewspaperEntry, 'id'>): NewspaperEntry {
  const list = getNewspaperList();
  const newEntry: NewspaperEntry = {
    id: `np_${Date.now()}`,
    name: entry.name.trim(),
    rate: entry.rate,
  };
  list.push(newEntry);
  write(KEYS.NEWSPAPERS_LIST, list);
  return newEntry;
}

export function updateNewspaper(id: string, updates: Partial<Omit<NewspaperEntry, 'id'>>): void {
  const list = getNewspaperList();
  const idx = list.findIndex((n) => n.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    write(KEYS.NEWSPAPERS_LIST, list);
  }
}

export function deleteNewspaper(id: string): void {
  const list = getNewspaperList().filter((n) => n.id !== id);
  write(KEYS.NEWSPAPERS_LIST, list);
}
