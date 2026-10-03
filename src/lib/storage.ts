import type { MoneyEntry } from '../types';

const KEY = 'programa.finance.v1';

export type FinanceBackup = {
  app: 'programa';
  version: 1;
  exportedAt: string;
  entries: MoneyEntry[];
};

export function loadEntries(): MoneyEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MoneyEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: MoneyEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export function makeBackup(entries: MoneyEntry[]): FinanceBackup {
  return {
    app: 'programa',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

export function parseBackup(raw: string): MoneyEntry[] {
  const cleaned = raw
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as FinanceBackup | MoneyEntry[];
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
    return parsed.entries;
  }
  throw new Error('Formato de respaldo inválido');
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
