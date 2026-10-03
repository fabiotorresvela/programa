import type { MoneyEntry, MoneyLedger } from '../types';

const KEY = 'programa.finance.v1';

export type FinanceBackup = {
  app: 'programa';
  version: 1;
  exportedAt: string;
  entries: MoneyEntry[];
};

function normalizeEntry(entry: MoneyEntry): MoneyEntry {
  return {
    ...entry,
    ledger: entry.ledger === 'empresa' ? 'empresa' : 'personal',
  };
}

export function loadEntries(): MoneyEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MoneyEntry[];
    return Array.isArray(parsed) ? parsed.map(normalizeEntry) : [];
  } catch {
    return [];
  }
}

export function saveEntries(entries: MoneyEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries.map(normalizeEntry)));
}

export function makeBackup(entries: MoneyEntry[]): FinanceBackup {
  return {
    app: 'programa',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: entries.map(normalizeEntry),
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
  if (Array.isArray(parsed)) return parsed.map(normalizeEntry);
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.entries)) {
    return parsed.entries.map(normalizeEntry);
  }
  throw new Error('Formato de respaldo inválido');
}

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ledgerLabel(ledger: MoneyLedger) {
  return ledger === 'empresa' ? 'Empresa' : 'Personales';
}
