import type { MoneyEntry } from '../types';

const KEY = 'programa.finance.v1';

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

export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
