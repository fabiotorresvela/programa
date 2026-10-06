import { createWorker } from 'tesseract.js';

export type InvoiceScanResult = {
  amount?: string;
  merchant?: string;
  rawText: string;
  confidence: number;
};

function normalizeDigits(raw: string) {
  return raw
    .replace(/[^\d.,]/g, '')
    .replace(/\s/g, '')
    .trim();
}

/** Convierte montos tipo 25.000 / 25,000.50 / $ 1.250.000 a número string entero COP. */
export function parseMoneyCandidate(raw: string): number | null {
  let s = normalizeDigits(raw);
  if (!s) return null;

  // 1.250.000,50 or 1,250,000.50
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // European/CO: 1.250.000,50
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,250,000.50
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) s = `${parts[0]}.${parts[1]}`;
    else s = s.replace(/,/g, '');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      // 25.000 or 1.250.000
      s = s.replace(/\./g, '');
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function scoreAmountLine(line: string, value: number) {
  const lower = line.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  let score = 0;
  if (/total\s*(a\s*pagar)?|valor\s*total|grand\s*total|importe\s*total|neto\s*a\s*pagar/.test(lower)) {
    score += 50;
  }
  if (/total|valor|pagar|amount|balance|saldo/.test(lower)) score += 25;
  if (/subtotal|iva|propina|tip|descuento|cambio|efectivo|cash/.test(lower)) score -= 15;
  if (value >= 1000) score += 8;
  if (value >= 10000) score += 6;
  if (/\$|cop|col\$|pesos/.test(lower)) score += 10;
  return score;
}

export function extractInvoiceFields(text: string): Omit<InvoiceScanResult, 'rawText' | 'confidence'> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: Array<{ value: number; score: number; line: string }> = [];
  const moneyRe =
    /(?:\$|COP|COL\$|USD)?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2}|\d{3,})/gi;

  for (const line of lines) {
    let match: RegExpExecArray | null;
    const re = new RegExp(moneyRe.source, 'gi');
    while ((match = re.exec(line))) {
      const value = parseMoneyCandidate(match[1] || match[0]);
      if (value == null || value < 100) continue;
      candidates.push({
        value,
        score: scoreAmountLine(line, value),
        line,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  const best = candidates[0];

  // Comercio: primeras líneas con letras, evitando NIT/fecha
  let merchant: string | undefined;
  for (const line of lines.slice(0, 8)) {
    if (line.length < 3 || line.length > 48) continue;
    if (/nit|rut|fecha|factura|recibo|pos|iva|total|tel|www\.|@/i.test(line)) continue;
    if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/.test(line)) continue;
    merchant = line.replace(/\s+/g, ' ').trim();
    break;
  }

  return {
    amount: best ? String(best.value) : undefined,
    merchant,
  };
}

async function downscaleImage(dataUrl: string, maxSide = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function scanInvoiceImage(
  imageDataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<InvoiceScanResult> {
  const prepared = await downscaleImage(imageDataUrl);
  const worker = await createWorker('spa+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const result = await worker.recognize(prepared);
    const rawText = result.data.text || '';
    const fields = extractInvoiceFields(rawText);
    return {
      ...fields,
      rawText,
      confidence: result.data.confidence || 0,
    };
  } finally {
    await worker.terminate();
  }
}
