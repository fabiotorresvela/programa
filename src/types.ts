export type View = 'home' | 'audio' | 'finance';

export type LessonSection = {
  id: string;
  title: string;
  durationLabel: string;
  summary: string;
  keyPoints: string[];
  practice: string;
  script: string;
};

export type Course = {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  coverTone: 'forest' | 'ink' | 'clay';
  description: string;
  sections: LessonSection[];
};

export type MoneyKind = 'expense' | 'income' | 'loan';

export type MoneyLedger = 'personal' | 'empresa';

export type PaymentMethod = 'transferencia' | 'efectivo';

export type MoneyEntry = {
  id: string;
  kind: MoneyKind;
  ledger: MoneyLedger;
  /** Forma de pago del ingreso (transferencia o efectivo). */
  paymentMethod?: PaymentMethod;
  amount: number;
  note: string;
  category: string;
  person?: string;
  date: string;
  photoDataUrl?: string;
  createdAt: string;
};
