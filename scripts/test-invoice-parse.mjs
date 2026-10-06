import assert from 'assert';

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}
function fixOcrMoneyNoise(raw) {
  return raw.replace(/[OoQ]/g, '0').replace(/[Il|]/g, '1').replace(/[^\d.,$\s]/g, ' ');
}
function normalizeDigits(raw) {
  return fixOcrMoneyNoise(raw).replace(/[^\d.,]/g, '').replace(/\s/g, '').trim();
}
function parseMoneyCandidate(raw) {
  let s = normalizeDigits(raw);
  if (!s) return null;
  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) s = `${parts[0]}.${parts[1]}`;
    else s = s.replace(/,/g, '');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) s = s.replace(/\./g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0 || n > 500000000) return null;
  return Math.round(n);
}
function isLikelyTotalLabel(line) {
  const lower = stripAccents(line.toLowerCase());
  return /t[o0]t[a4]l\s*a\s*p[a4]g[a4]r/.test(lower) || /\bt[o0]t[a4]l\b/.test(lower) || /v[a4]l[o0]r\s*t[o0]t[a4]l/.test(lower);
}
function isRejectLabel(line) {
  const lower = stripAccents(line.toLowerCase());
  return /sub\s*t[o0]t[a4]l|subtotal|\biva\b|propina|descuento|cambio/.test(lower);
}
const MONEY_RE = /(?:\$|COP|COL\$|USD)?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2}|\d{4,})/gi;
function extractInvoiceFields(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const candidates = [];
  const collect = (line, label, idx) => {
    const re = new RegExp(MONEY_RE.source, 'gi');
    let match;
    while ((match = re.exec(line))) {
      const value = parseMoneyCandidate(match[1] || match[0]);
      if (value == null || value < 100) continue;
      const lbl = stripAccents(`${label} ${line}`.toLowerCase());
      let score = 0;
      if (/t[o0]t[a4]l\s*a\s*p[a4]g[a4]r/.test(lbl)) score += 120;
      else if (/\bt[o0]t[a4]l\b/.test(lbl)) score += 70;
      if (isRejectLabel(lbl)) score -= 80;
      score += Math.round((idx / Math.max(1, lines.length - 1)) * 25);
      candidates.push({ value, score });
    }
  };
  for (let i = 0; i < lines.length; i++) collect(lines[i], lines[i], i);
  for (let i = 0; i < lines.length - 1; i++) {
    if (!isLikelyTotalLabel(lines[i])) continue;
    collect(lines[i + 1], lines[i], i + 1);
  }
  const joined = lines.join('\n');
  const totalPayRe = /t[o0]t[a4]l\s*a\s*p[a4]g[a4]r[\s:.\-]*\$?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2}|\d{3,})/gi;
  let m;
  while ((m = totalPayRe.exec(joined))) {
    const value = parseMoneyCandidate(m[1]);
    if (value != null) candidates.push({ value, score: 150 });
  }
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  const strong = candidates.find((c) => c.score >= 70);
  const best = strong || candidates[0];
  return { amount: best ? String(best.value) : undefined };
}

assert.equal(parseMoneyCandidate('25.000'), 25000);
assert.equal(extractInvoiceFields(`Subtotal 45.000\nIVA 8.550\nTOTAL A PAGAR $ 53.550\nEfectivo 60.000`).amount, '53550');
assert.equal(extractInvoiceFields(`SUBTOTAL 32.000\nTOTAL\n35.200`).amount, '35200');
assert.equal(extractInvoiceFields(`Valor total\n$ 128.900`).amount, '128900');
assert.equal(extractInvoiceFields(`T0TAL A PAG4R\n$ 77.500`).amount, '77500');
console.log('invoice_total_ok');
