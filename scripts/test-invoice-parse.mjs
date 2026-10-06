import assert from 'assert';

function normalizeDigits(raw) {
  return raw.replace(/[^\d.,]/g, '').replace(/\s/g, '').trim();
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
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function extractInvoiceFields(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = [];
  const moneyRe = /(?:\$|COP|COL\$|USD)?\s*(\d{1,3}(?:[.\s]\d{3})+(?:[.,]\d{1,2})?|\d+[.,]\d{2}|\d{3,})/gi;
  for (const line of lines) {
    let match;
    const re = new RegExp(moneyRe.source, 'gi');
    while ((match = re.exec(line))) {
      const value = parseMoneyCandidate(match[1] || match[0]);
      if (value == null || value < 100) continue;
      let score = 0;
      const lower = line.toLowerCase();
      if (/total/.test(lower)) score += 40;
      if (/subtotal|iva/.test(lower)) score -= 15;
      candidates.push({ value, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  return { amount: candidates[0] ? String(candidates[0].value) : undefined };
}

assert.equal(parseMoneyCandidate('25.000'), 25000);
assert.equal(parseMoneyCandidate('$ 1.250.000'), 1250000);
assert.equal(extractInvoiceFields('Subtotal 10.000\nIVA 1.900\nTOTAL A PAGAR $ 11.900').amount, '11900');
console.log('invoice_parse_ok');
