'use client';

/**
 * cloudStorage.ts — Cloud-first data layer backed by Supabase.
 * Replaces localStorage / IndexedDB with Supabase tables so data
 * persists across devices and browser clears.
 *
 * All public API signatures are intentionally identical to storage.ts
 * so components can swap the import with zero changes.
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Hawker,
  DailyBillingRecord,
  MonthlyTrackerRow,
  NewspaperRateEntry,
  DailyRateRecord,
  NewspaperGroup,
  HawkerFreeQtyEntry,
  HawkerFreeQtySettings,
  CopiesEntry,
  CopiesRecord,
  NewspaperEntry,
} from './storage';
import { NEWSPAPERS, MASTER_DATA } from './mockData';

export type {
  Hawker,
  DailyBillingRecord,
  MonthlyTrackerRow,
  NewspaperRateEntry,
  DailyRateRecord,
  NewspaperGroup,
  HawkerFreeQtyEntry,
  HawkerFreeQtySettings,
  CopiesEntry,
  CopiesRecord,
  NewspaperEntry,
};

export { NEWSPAPERS };

function supabase() {
  return createClient();
}

// ─── Sync Status Emitter ──────────────────────────────────────────────────────

function emitSync(status: 'syncing' | 'synced' | 'error') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-sync-status', { detail: { status } }));
  }
}

// ─── Hawkers ─────────────────────────────────────────────────────────────────

export async function getHawkers(): Promise<Hawker[]> {
  const { data, error } = await supabase().from('hawkers').select('*').order('id', { ascending: true });
  if (error) {
    console.error('getHawkers error:', error.message);
    return MASTER_DATA;
  }
  if (!data || data.length === 0) {
    // Seed default hawkers on first load
    await seedHawkers();
    return MASTER_DATA;
  }
  return data.map(rowToHawker);
}

async function seedHawkers(): Promise<void> {
  const rows = MASTER_DATA.map(hawkerToRow);
  const { error } = await supabase().from('hawkers').upsert(rows, { onConflict: 'id' });
  if (error) console.error('seedHawkers error:', error.message);
}

export async function saveHawker(hawker: Hawker): Promise<Hawker> {
  emitSync('syncing');
  const existing = await getHawkers();
  let finalHawker = hawker;
  if (!hawker.id || hawker.id === 0) {
    const maxId = existing.length > 0 ? Math.max(...existing.map((h) => h.id)) : 0;
    finalHawker = { ...hawker, id: maxId + 1 };
  }
  const { error } = await supabase()
    .from('hawkers')
    .upsert(hawkerToRow(finalHawker), { onConflict: 'id' });
  if (error) { console.error('saveHawker error:', error.message); emitSync('error'); }
  else emitSync('synced');
  return finalHawker;
}

export async function deleteHawker(id: number): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('hawkers').delete().eq('id', id);
  if (error) { console.error('deleteHawker error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function deleteHawkers(ids: number[]): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('hawkers').delete().in('id', ids);
  if (error) { console.error('deleteHawkers error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function getHawkerById(id: number): Promise<Hawker | undefined> {
  const { data, error } = await supabase().from('hawkers').select('*').eq('id', id).maybeSingle();
  if (error) console.error('getHawkerById error:', error.message);
  return data ? rowToHawker(data) : undefined;
}

function rowToHawker(row: any): Hawker {
  return {
    id: row.id,
    name: row.name,
    contact: row.contact,
    area: row.area,
    paymentType: row.payment_type as Hawker['paymentType'],
    status: row.status as Hawker['status'],
    joinDate: row.join_date,
  };
}

function hawkerToRow(h: Hawker) {
  return {
    id: h.id,
    name: h.name,
    contact: h.contact,
    area: h.area,
    payment_type: h.paymentType,
    status: h.status,
    join_date: h.joinDate,
  };
}

// ─── Billing Records ──────────────────────────────────────────────────────────

export async function getBillingRecords(): Promise<DailyBillingRecord[]> {
  const { data, error } = await supabase()
    .from('billing_records')
    .select('*')
    .order('date', { ascending: false });
  if (error) {
    console.error('getBillingRecords error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToBilling);
}

export async function saveBillingRecord(record: DailyBillingRecord): Promise<void> {
  emitSync('syncing');
  const row = billingToRow(record);
  const { error } = await supabase()
    .from('billing_records')
    .upsert(row, { onConflict: 'id' });
  if (error) { console.error('saveBillingRecord error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function getBillingByHawker(hawkerId: number): Promise<DailyBillingRecord[]> {
  const { data, error } = await supabase()
    .from('billing_records')
    .select('*')
    .eq('hawker_id', hawkerId)
    .order('date', { ascending: false });
  if (error) {
    console.error('getBillingByHawker error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToBilling);
}

export async function getTodayBilling(date: string): Promise<DailyBillingRecord[]> {
  const { data, error } = await supabase()
    .from('billing_records')
    .select('*')
    .eq('date', date);
  if (error) {
    console.error('getTodayBilling error:', error.message);
    return [];
  }
  return (data ?? []).map(rowToBilling);
}

export async function getExistingBillingRecord(
  hawkerId: number,
  date: string
): Promise<DailyBillingRecord | null> {
  const { data, error } = await supabase()
    .from('billing_records')
    .select('*')
    .eq('hawker_id', hawkerId)
    .eq('date', date)
    .maybeSingle();
  if (error) {
    console.error('getExistingBillingRecord error:', error.message);
    return null;
  }
  return data ? rowToBilling(data) : null;
}

export async function deleteBillingRecordForHawkerDate(
  hawkerId: number,
  date: string
): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase()
    .from('billing_records')
    .delete()
    .eq('hawker_id', hawkerId)
    .eq('date', date);
  if (error) { console.error('deleteBillingRecordForHawkerDate error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

function rowToBilling(row: any): DailyBillingRecord {
  return {
    id: row.id,
    hawkerId: row.hawker_id,
    hawkerName: row.hawker_name,
    date: row.date,
    entries: row.entries ?? [],
    totalBill: Number(row.total_bill),
    whatsappSent: row.whatsapp_sent,
    paymentStatus: row.payment_status as DailyBillingRecord['paymentStatus'],
    paymentType: row.payment_type as DailyBillingRecord['paymentType'],
  };
}

function billingToRow(r: DailyBillingRecord) {
  return {
    id: r.id,
    hawker_id: r.hawkerId,
    hawker_name: r.hawkerName,
    date: r.date,
    entries: r.entries,
    total_bill: r.totalBill,
    whatsapp_sent: r.whatsappSent,
    payment_status: r.paymentStatus,
    payment_type: r.paymentType,
  };
}

// ─── Monthly Tracker (computed from billing) ──────────────────────────────────

export async function getMonthlyTracker(): Promise<MonthlyTrackerRow[]> {
  const [billing, hawkers] = await Promise.all([getBillingRecords(), getHawkers()]);
  return buildMonthlyTracker(billing, hawkers);
}

function buildMonthlyTracker(
  billing: DailyBillingRecord[],
  hawkers: Hawker[]
): MonthlyTrackerRow[] {
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
  for (const h of hawkers) {
    if (!map.has(h.id)) {
      map.set(h.id, { hawkerId: h.id, hawkerName: h.name, newspapers: {}, grandTotal: 0 });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.hawkerId - b.hawkerId);
}

// ─── Newspaper Rates ──────────────────────────────────────────────────────────

export async function getAllRates(): Promise<DailyRateRecord[]> {
  const { data, error } = await supabase()
    .from('daily_rates')
    .select('*')
    .order('date', { ascending: false });
  if (error) {
    console.error('getAllRates error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({ date: row.date, rates: row.rates ?? [] }));
}

export async function getRateForDate(newspaper: string, date: string): Promise<number> {
  const all = await getAllRates();
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    if (record.date <= date) {
      const entry = record.rates.find((r) => r.newspaper === newspaper);
      if (entry !== undefined) return entry.rate;
    }
  }
  const dynamicNp = (await getNewspaperList()).find((n) => n.name === newspaper);
  if (dynamicNp) return dynamicNp.rate;
  const np = NEWSPAPERS.find((n) => n.name === newspaper);
  return np?.rate ?? 0;
}

export async function getPreviousDayRate(newspaper: string, date: string): Promise<number> {
  const all = await getAllRates();
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date));
  for (const record of sorted) {
    if (record.date < date) {
      const entry = record.rates.find((r) => r.newspaper === newspaper);
      if (entry !== undefined) return entry.rate;
    }
  }
  return getRateForDate(newspaper, date);
}

export async function saveRatesForDate(date: string, rates: NewspaperRateEntry[]): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase()
    .from('daily_rates')
    .upsert({ date, rates }, { onConflict: 'date' });
  if (error) { console.error('saveRatesForDate error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function deleteRatesForDate(date: string): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('daily_rates').delete().eq('date', date);
  if (error) { console.error('deleteRatesForDate error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function getRatesForDate(date: string): Promise<NewspaperRateEntry[] | null> {
  const { data, error } = await supabase()
    .from('daily_rates')
    .select('rates')
    .eq('date', date)
    .maybeSingle();
  if (error) {
    console.error('getRatesForDate error:', error.message);
    return null;
  }
  return data?.rates ?? null;
}

// ─── Newspaper Groups ─────────────────────────────────────────────────────────

export async function getNewspaperGroups(): Promise<NewspaperGroup[]> {
  const { data, error } = await supabase().from('newspaper_groups').select('*');
  if (error) {
    console.error('getNewspaperGroups error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    newspapers: row.newspapers ?? [],
    color: row.color,
  }));
}

export async function saveNewspaperGroup(group: NewspaperGroup): Promise<NewspaperGroup> {
  emitSync('syncing');
  const row = {
    id: group.id || `grp-${Date.now()}`,
    name: group.name,
    newspapers: group.newspapers,
    color: group.color,
  };
  const { error } = await supabase()
    .from('newspaper_groups')
    .upsert(row, { onConflict: 'id' });
  if (error) { console.error('saveNewspaperGroup error:', error.message); emitSync('error'); }
  else emitSync('synced');
  return { ...group, id: row.id };
}

export async function deleteNewspaperGroup(id: string): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('newspaper_groups').delete().eq('id', id);
  if (error) { console.error('deleteNewspaperGroup error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

// ─── Hawker Free Qty Settings ─────────────────────────────────────────────────

export async function getAllFreeQtySettings(): Promise<HawkerFreeQtySettings[]> {
  const { data, error } = await supabase().from('hawker_free_qty').select('*');
  if (error) {
    console.error('getAllFreeQtySettings error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({ hawkerId: row.hawker_id, entries: row.entries ?? [] }));
}

export async function getFreeQtyForHawker(hawkerId: number): Promise<HawkerFreeQtyEntry[]> {
  const { data, error } = await supabase()
    .from('hawker_free_qty')
    .select('entries')
    .eq('hawker_id', hawkerId)
    .maybeSingle();
  if (error) {
    console.error('getFreeQtyForHawker error:', error.message);
    return [];
  }
  return data?.entries ?? [];
}

export async function saveFreeQtyForHawker(
  hawkerId: number,
  entries: HawkerFreeQtyEntry[]
): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase()
    .from('hawker_free_qty')
    .upsert({ hawker_id: hawkerId, entries }, { onConflict: 'hawker_id' });
  if (error) { console.error('saveFreeQtyForHawker error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

// ─── Copies Records ───────────────────────────────────────────────────────────

export async function getCopiesRecords(): Promise<CopiesRecord[]> {
  const { data, error } = await supabase()
    .from('copies_records')
    .select('*')
    .order('date', { ascending: false });
  if (error) {
    console.error('getCopiesRecords error:', error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    hawkerId: row.hawker_id,
    hawkerName: row.hawker_name,
    date: row.date,
    entries: row.entries ?? [],
  }));
}

export async function saveCopiesRecord(record: CopiesRecord): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase()
    .from('copies_records')
    .upsert(
      {
        id: record.id,
        hawker_id: record.hawkerId,
        hawker_name: record.hawkerName,
        date: record.date,
        entries: record.entries,
      },
      { onConflict: 'id' }
    );
  if (error) { console.error('saveCopiesRecord error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function deleteCopiesRecord(id: string): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('copies_records').delete().eq('id', id);
  if (error) { console.error('deleteCopiesRecord error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

// ─── Newspaper List ───────────────────────────────────────────────────────────

export async function getNewspaperList(): Promise<NewspaperEntry[]> {
  const { data, error } = await supabase()
    .from('newspapers_list')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.error('getNewspaperList error:', error.message);
    return NEWSPAPERS.map((n) => ({
      id: n.name.toLowerCase().replace(/\s+/g, '_'),
      name: n.name,
      rate: n.rate,
    }));
  }
  if (!data || data.length === 0) {
    await seedNewspaperList();
    return NEWSPAPERS.map((n) => ({
      id: n.name.toLowerCase().replace(/\s+/g, '_'),
      name: n.name,
      rate: n.rate,
    }));
  }
  return data.map((row) => ({ id: row.id, name: row.name, rate: Number(row.rate) }));
}

async function seedNewspaperList(): Promise<void> {
  const rows = NEWSPAPERS.map((n) => ({
    id: n.name.toLowerCase().replace(/\s+/g, '_'),
    name: n.name,
    rate: n.rate,
  }));
  const { error } = await supabase().from('newspapers_list').upsert(rows, { onConflict: 'id' });
  if (error) console.error('seedNewspaperList error:', error.message);
}

export async function saveNewspaperList(list: NewspaperEntry[]): Promise<void> {
  emitSync('syncing');
  const rows = list.map((n) => ({ id: n.id, name: n.name, rate: n.rate }));
  const { error } = await supabase().from('newspapers_list').upsert(rows, { onConflict: 'id' });
  if (error) { console.error('saveNewspaperList error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function addNewspaper(entry: Omit<NewspaperEntry, 'id'>): Promise<NewspaperEntry> {
  emitSync('syncing');
  const newEntry: NewspaperEntry = {
    id: `np_${Date.now()}`,
    name: entry.name.trim(),
    rate: entry.rate,
  };
  const { error } = await supabase().from('newspapers_list').insert(newEntry);
  if (error) { console.error('addNewspaper error:', error.message); emitSync('error'); }
  else emitSync('synced');
  return newEntry;
}

export async function updateNewspaper(
  id: string,
  updates: Partial<Omit<NewspaperEntry, 'id'>>
): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('newspapers_list').update(updates).eq('id', id);
  if (error) { console.error('updateNewspaper error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

export async function deleteNewspaper(id: string): Promise<void> {
  emitSync('syncing');
  const { error } = await supabase().from('newspapers_list').delete().eq('id', id);
  if (error) { console.error('deleteNewspaper error:', error.message); emitSync('error'); }
  else emitSync('synced');
}

// ─── Auth (unchanged — still uses local PIN-based auth) ───────────────────────

export interface AuthSession {
  role: 'admin' | 'hawker';
  hawkerId?: number;
  hawkerName?: string;
}

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getSession(): AuthSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem('bhand_auth_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  if (!isBrowser()) return;
  localStorage.setItem('bhand_auth_session', JSON.stringify(session));
}

export function clearSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem('bhand_auth_session');
}

export function loginAdmin(email: string, password: string): boolean {
  if (email === 'admin@bhandnews.in' && password === 'BhandNews@2026') {
    setSession({ role: 'admin' });
    return true;
  }
  return false;
}

export async function loginHawker(name: string, contact: string): Promise<Hawker | null> {
  const hawkers = await getHawkers();
  const hawker = hawkers.find(
    (h) => h.name.toLowerCase() === name.trim().toLowerCase() && h.contact === contact.trim()
  );
  if (hawker) {
    setSession({ role: 'hawker', hawkerId: hawker.id, hawkerName: hawker.name });
    return hawker;
  }
  return null;
}

// ─── No-op for backward compat ────────────────────────────────────────────────
export async function restoreFromBackupIfNeeded(): Promise<void> {
  // No-op: data is now on Supabase cloud, no local restore needed
}
