import { createWorker, PSM } from 'tesseract.js';

export type InvoiceScanResult = {
  amount?: string;
  merchant?: string;
  rawText: string;
  confidence: number;
  matchedLine?: string;
};

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Corrige errores típicos de OCR en montos. */
function fixOcrMoneyNoise(raw: string) {
  return raw
    .replace(/[OoQ]/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[^\d.,$\s]/g, ' ');
}

function normalizeDigits(raw: string) {
  return fixOcrMoneyNoise(raw)
    .replace(/[^\d.,]/g, '')
    .replace(/\s/g, '')
    .trim();
}

/** Convierte montos tipo 25.000 / 25,000.50 / $ 1.250.000 a entero COP. */
export function parseMoneyCandidate(raw: string): number | null {
  let s = normalizeDigits(raw);
  if (!s) return null;

  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) s = `${parts[0]}.${parts[1]}`;
    else s = s.replace(/,/g, '');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    } else if (parts.length === 2 && parts[1].length <= 2) {
      // 11900.50
      s = `${parts[0]}.${parts[1]}`;
    }
  }

  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Evitar NITs / teléfonos largos disfrazados
  if (n > 500_000_000) return null;
  return Math.round(n);
}

function isLikelyTotalLabel(line: string) {
  const lower = stripAccents(line.toLowerCase());
  // Tolerante a OCR: t0tal, tota1, pagar, pag4r, va1or
  return (
    /t[o0]t[a4]l\s*a\s*p[a4]g[a4]r/.test(lower) ||
    /v[a4]l[o0]r\s*a\s*p[a4]g[a4]r/.test(lower) ||
    /v[a4]l[o0]r\s*t[o0]t[a4]l/.test(lower) ||
    /importe\s*t[o0]t[a4]l/.test(lower) ||
    /grand\s*t[o0]t[a4]l/.test(lower) ||
    /neto\s*a\s*p[a4]g[a4]r/.test(lower) ||
    /total\s*factura/.test(lower) ||
    /total\s*compra/.test(lower) ||
    /total\s*venta/.test(lower) ||
    /monto\s*total/.test(lower) ||
    /\bt[o0]t[a4]l\b/.test(lower)
  );
}

function isRejectLabel(line: string) {
  const lower = stripAccents(line.toLowerCase());
  return (
    /sub\s*t[o0]t[a4]l|subtotal/.test(lower) ||
    /\biva\b|impuesto|propina|tip\b|descuento|cambio|vuelto/.test(lower) ||
    /cantidad|cant\b|nit\b|telefono|celular|fecha|hora|caja|factura\s*n/.test(lower)
  );
}

function scoreAmountContext(labelLine: string, valueLine: string, value: number, lineIndex: number, totalLines: number) {
  const label = stripAccents(`${labelLine} ${valueLine}`.toLowerCase());
  let score = 0;

  if (/t[o0]t[a4]l\s*a\s*p[a4]g[a4]r|v[a4]l[o0]r\s*a\s*p[a4]g[a4]r|neto\s*a\s*p[a4]g[a4]r/.test(label)) {
    score += 120;
  } else if (/v[a4]l[o0]r\s*t[o0]t[a4]l|importe\s*t[o0]t[a4]l|grand\s*t[o0]t[a4]l|total\s*factura|total\s*compra/.test(label)) {
    score += 95;
  } else if (/\bt[o0]t[a4]l\b/.test(label)) {
    score += 70;
  } else if (/p[a4]g[a4]r|amount|saldo/.test(label)) {
    score += 35;
  }

  if (isRejectLabel(label)) score -= 80;
  if (/\$|cop|col\$|pesos/.test(label)) score += 12;
  if (value >= 1000) score += 6;
  if (value >= 5000) score += 4;

  // Totales suelen estar abajo del ticket
  const bottomBias = lineIndex / Math.max(1, totalLines - 1);
  score += Math.round(bottomBias * 25);

  return score;
}

const MONEY_RE =
  /(?:\$|COP|COL\$|USD)?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2}|\d{4,})/gi;

function collectFromLine(
  line: string,
  label: string,
  lineIndex: number,
  totalLines: number,
  out: Array<{ value: number; score: number; line: string }>,
) {
  const re = new RegExp(MONEY_RE.source, 'gi');
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    const value = parseMoneyCandidate(match[1] || match[0]);
    if (value == null || value < 100) continue;
    out.push({
      value,
      score: scoreAmountContext(label, line, value, lineIndex, totalLines),
      line: `${label} | ${line}`.trim(),
    });
  }
}

export function extractInvoiceFields(text: string): Omit<InvoiceScanResult, 'rawText' | 'confidence'> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const candidates: Array<{ value: number; score: number; line: string }> = [];

  // 1) Patrones directos en una sola línea
  for (let i = 0; i < lines.length; i++) {
    collectFromLine(lines[i], lines[i], i, lines.length, candidates);
  }

  // 2) Etiqueta en una línea y monto en la siguiente (muy común en POS)
  for (let i = 0; i < lines.length - 1; i++) {
    if (!isLikelyTotalLabel(lines[i])) continue;
    collectFromLine(lines[i + 1], lines[i], i + 1, lines.length, candidates);
    // a veces hay una línea vacía OCR entre medio
    if (i + 2 < lines.length) {
      collectFromLine(lines[i + 2], lines[i], i + 2, lines.length, candidates);
    }
  }

  // 3) Regex específico TOTAL A PAGAR ... monto (misma o siguiente)
  const joined = lines.join('\n');
  const totalPayRe =
    /t[o0]t[a4]l\s*a\s*p[a4]g[a4]r[\s:.\-]*\$?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2}|\d{3,})/gi;
  let m: RegExpExecArray | null;
  while ((m = totalPayRe.exec(joined))) {
    const value = parseMoneyCandidate(m[1]);
    if (value == null) continue;
    candidates.push({ value, score: 150, line: m[0] });
  }

  candidates.sort((a, b) => b.score - a.score || b.value - a.value);

  // Si hay un candidato con score alto de total, úsalo; si no, el mejor disponible
  const strong = candidates.find((c) => c.score >= 70);
  const best = strong || candidates[0];

  let merchant: string | undefined;
  for (const line of lines.slice(0, 10)) {
    if (line.length < 3 || line.length > 48) continue;
    if (/nit|rut|fecha|factura|recibo|pos|iva|total|tel|www\.|@/i.test(line)) continue;
    if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ]{3,}/.test(line)) continue;
    merchant = line;
    break;
  }

  return {
    amount: best ? String(best.value) : undefined,
    merchant,
    matchedLine: best?.line,
  };
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo abrir la imagen'));
    img.src = dataUrl;
  });
}

/** Mejora contraste/escala y opcionalmente recorta la zona inferior (donde suele estar el total). */
async function prepareVariants(dataUrl: string): Promise<string[]> {
  const img = await loadImage(dataUrl);
  const variants: string[] = [];

  const render = (opts: {
    cropTopRatio?: number;
    targetMax?: number;
    contrast?: boolean;
  }) => {
    const cropTopRatio = opts.cropTopRatio ?? 0;
    const srcY = Math.floor(img.height * cropTopRatio);
    const srcH = img.height - srcY;
    const srcW = img.width;
    const targetMax = opts.targetMax ?? 1800;
    const scale = Math.min(2.2, Math.max(1, targetMax / Math.max(srcW, srcH)));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, srcY, srcW, srcH, 0, 0, w, h);

    if (opts.contrast) {
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        // contraste + umbral suave
        let v = (gray - 128) * 1.35 + 128;
        v = v > 170 ? 255 : v < 90 ? 0 : v;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
    }

    variants.push(canvas.toDataURL('image/png'));
  };

  // Completa
  render({ contrast: true, targetMax: 1700 });
  // Mitad inferior (totales)
  render({ cropTopRatio: 0.45, contrast: true, targetMax: 1800 });
  // Tercio inferior más agresivo
  render({ cropTopRatio: 0.62, contrast: true, targetMax: 1900 });

  return variants;
}

async function recognizeMany(
  images: string[],
  onProgress?: (pct: number) => void,
): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker('spa+eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(Math.min(99, Math.round(m.progress * 100)));
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    });

    const texts: string[] = [];
    let confSum = 0;
    for (let i = 0; i < images.length; i++) {
      onProgress?.(Math.round((i / images.length) * 100));
      const result = await worker.recognize(images[i]);
      texts.push(result.data.text || '');
      confSum += result.data.confidence || 0;
    }
    return {
      text: texts.join('\n'),
      confidence: confSum / Math.max(1, images.length),
    };
  } finally {
    await worker.terminate();
  }
}

export async function scanInvoiceImage(
  imageDataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<InvoiceScanResult> {
  onProgress?.(5);
  const variants = await prepareVariants(imageDataUrl);
  onProgress?.(15);
  const { text, confidence } = await recognizeMany(variants, onProgress);
  const fields = extractInvoiceFields(text);
  onProgress?.(100);
  return {
    ...fields,
    rawText: text,
    confidence,
  };
}
