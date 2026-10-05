import { useEffect, useMemo, useState } from 'react';
import type { MoneyEntry, MoneyKind, MoneyLedger, PaymentMethod } from '../types';
import { loadEntries, makeBackup, parseBackup, saveEntries, uid } from '../lib/storage';

export type DraftEntry = {
  kind: MoneyKind;
  ledger: MoneyLedger;
  paymentMethod: PaymentMethod;
  amount: string;
  note: string;
  category: string;
  person: string;
  date: string;
  photoDataUrl?: string;
};

const emptyDraft = (ledger: MoneyLedger = 'personal'): DraftEntry => ({
  kind: 'expense',
  ledger,
  paymentMethod: 'transferencia',
  amount: '',
  note: '',
  category: 'General',
  person: '',
  date: new Date().toISOString().slice(0, 10),
});

function summarize(entries: MoneyEntry[]) {
  const incomes = entries.filter((e) => e.kind === 'income');
  const income = incomes.reduce((s, e) => s + e.amount, 0);
  const incomeTransfer = incomes
    .filter((e) => (e.paymentMethod || 'transferencia') === 'transferencia')
    .reduce((s, e) => s + e.amount, 0);
  const incomeCash = incomes
    .filter((e) => e.paymentMethod === 'efectivo')
    .reduce((s, e) => s + e.amount, 0);
  const expenses = entries.filter((e) => e.kind === 'expense').reduce((s, e) => s + e.amount, 0);
  const loans = entries.filter((e) => e.kind === 'loan').reduce((s, e) => s + e.amount, 0);
  const byCategory = new Map<string, number>();
  for (const e of entries.filter((x) => x.kind === 'expense')) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const loanPeople = new Map<string, number>();
  for (const e of entries.filter((x) => x.kind === 'loan')) {
    const name = e.person || 'Sin nombre';
    loanPeople.set(name, (loanPeople.get(name) ?? 0) + e.amount);
  }
  return {
    income,
    incomeTransfer,
    incomeCash,
    expenses,
    loans,
    balance: income - expenses,
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    loanPeople: [...loanPeople.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Interpreta frases simples en español: "gasté 25000 en gasolina", "ingreso 800000 salario", "presté 100000 a Carlos" */
export function parseVoiceMoney(text: string): Partial<DraftEntry> {
  const lower = text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const amountMatch = lower.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)/);
  const amountRaw = amountMatch?.[1]?.replace(/\s/g, '').replace(/\./g, '').replace(',', '.') ?? '';
  const amount = amountRaw;

  let kind: MoneyKind = 'expense';
  if (/prest|le di|le deje|deuda a|cobrar a/.test(lower)) kind = 'loan';
  else if (/ingreso|cobre|recibi|ganancia|sueldo|salario|me pagaron/.test(lower)) kind = 'income';
  else if (/gaste|pague|compra|salida|gasto/.test(lower)) kind = 'expense';

  let ledger: MoneyLedger | undefined;
  if (/empresa|negocio|compania|compañia|oficina|factura de la empresa/.test(lower)) {
    ledger = 'empresa';
  } else if (/personal|mio|mío|casa|familia/.test(lower)) {
    ledger = 'personal';
  }

  let paymentMethod: PaymentMethod | undefined;
  if (/efectivo|cash|en mano|billete/.test(lower)) paymentMethod = 'efectivo';
  else if (/transfer|nequi|daviplata|bancolombia|consign|deposito|depósito/.test(lower)) {
    paymentMethod = 'transferencia';
  }

  let category = 'General';
  if (/gasolina|uber|taxi|transporte|peaje/.test(lower)) category = 'Transporte';
  else if (/comida|almuerzo|cena|cafe|mercado/.test(lower)) category = 'Comida';
  else if (/arriendo|renta|servicios|luz|agua|internet/.test(lower)) category = 'Hogar';
  else if (/salario|sueldo|nomina|honorario/.test(lower)) category = 'Salario';
  else if (/cliente|venta|comision|proveedor|insumo|inventario/.test(lower)) category = 'Ventas';
  else if (/nomina|emplead|proveedor|publicidad|herramienta/.test(lower)) category = 'Operación';

  let person = '';
  const personMatch = text.match(
    /(?:a|para)\s+([A-Za-zÁÉÍÓÚáéíóúñÑ][\wÁÉÍÓÚáéíóúñÑ]*(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ][\wÁÉÍÓÚáéíóúñÑ]*)?)/i,
  );
  if (kind === 'loan' && personMatch) person = personMatch[1];

  return {
    kind,
    ...(ledger ? { ledger } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    amount,
    note: text.trim(),
    category,
    person,
  };
}

export function useFinance() {
  const [entries, setEntries] = useState<MoneyEntry[]>(() => loadEntries());
  const [ledger, setLedger] = useState<MoneyLedger>('personal');
  const [draft, setDraft] = useState<DraftEntry>(() => emptyDraft('personal'));

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    setDraft((prev) => ({ ...prev, ledger }));
  }, [ledger]);

  const ledgerEntries = useMemo(
    () => entries.filter((e) => (e.ledger || 'personal') === ledger),
    [entries, ledger],
  );

  const addFromDraft = () => {
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) return false;
    const entry: MoneyEntry = {
      id: uid(),
      kind: draft.kind,
      ledger: draft.ledger || ledger,
      ...(draft.kind === 'income'
        ? { paymentMethod: draft.paymentMethod || 'transferencia' }
        : {}),
      amount,
      note: draft.note || draft.category,
      category: draft.category || 'General',
      person: draft.kind === 'loan' ? draft.person || 'Sin nombre' : undefined,
      date: draft.date,
      photoDataUrl: draft.photoDataUrl,
      createdAt: new Date().toISOString(),
    };
    setEntries((prev) => [entry, ...prev]);
    setDraft(emptyDraft(entry.ledger));
    return true;
  };

  const remove = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const exportText = () => JSON.stringify(makeBackup(entries), null, 2);

  const importFromText = (raw: string, mode: 'replace' | 'merge' = 'replace') => {
    const incoming = parseBackup(raw);
    if (mode === 'replace') {
      setEntries(incoming);
      return incoming.length;
    }
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const merged = [...prev];
      for (const entry of incoming) {
        if (!seen.has(entry.id)) {
          merged.push(entry);
          seen.add(entry.id);
        }
      }
      return merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    });
    return incoming.length;
  };

  const summary = useMemo(() => summarize(ledgerEntries), [ledgerEntries]);
  const personalSummary = useMemo(
    () => summarize(entries.filter((e) => (e.ledger || 'personal') === 'personal')),
    [entries],
  );
  const empresaSummary = useMemo(
    () => summarize(entries.filter((e) => e.ledger === 'empresa')),
    [entries],
  );

  return {
    entries,
    ledgerEntries,
    ledger,
    setLedger,
    draft,
    setDraft,
    addFromDraft,
    remove,
    summary,
    personalSummary,
    empresaSummary,
    exportText,
    importFromText,
    emptyDraft: () => setDraft(emptyDraft(ledger)),
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

export function paymentMethodLabel(method?: PaymentMethod) {
  return method === 'efectivo' ? 'Efectivo' : 'Transferencia';
}
