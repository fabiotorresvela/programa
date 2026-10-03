/** Utilidades de resumen extractivo (sin API de pago). */

export function cleanText(input: string) {
  return input
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function splitSentences(text: string): string[] {
  return cleanText(text)
    .split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡0-9"«])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40);
}

export function wordCount(text: string) {
  return cleanText(text).split(/\s+/).filter(Boolean).length;
}

/** ~140 palabras/minuto en narración pausada en español. */
export function estimateMinutes(text: string) {
  return Math.max(1, Math.round(wordCount(text) / 140));
}

export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function extractKeyPoints(text: string, max = 4): string[] {
  const sentences = splitSentences(text);
  if (!sentences.length) {
    return cleanText(text)
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 20)
      .slice(0, max);
  }
  const scored = sentences.map((s) => {
    let score = Math.min(s.length, 220);
    if (/\d/.test(s)) score += 20;
    if (/porque|importante|clave|principio|paso|resultado|ejemplo/i.test(s)) score += 25;
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((x) => x.s.replace(/\s+/g, ' '));
}

export function summarizeChunk(text: string, maxSentences = 5): string {
  const sentences = splitSentences(text);
  if (!sentences.length) return cleanText(text).slice(0, 500);
  if (sentences.length <= maxSentences) return sentences.join(' ');
  const first = sentences[0];
  const mid = sentences.slice(1, -1);
  const last = sentences[sentences.length - 1];
  const picks = [first];
  const step = Math.max(1, Math.floor(mid.length / Math.max(1, maxSentences - 2)));
  for (let i = 0; i < mid.length && picks.length < maxSentences - 1; i += step) {
    picks.push(mid[i]);
  }
  if (picks.length < maxSentences) picks.push(last);
  return [...new Set(picks)].slice(0, maxSentences).join(' ');
}

export function chunkText(text: string, targetWords = 700): string[] {
  const paragraphs = cleanText(text)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const p of paragraphs.length ? paragraphs : [cleanText(text)]) {
    if (wordCount(current) + wordCount(p) > targetWords && current) {
      pushCurrent();
    }
    current = current ? `${current}\n\n${p}` : p;
  }
  pushCurrent();

  // Si quedó un solo bloque enorme, cortar por oraciones.
  if (chunks.length === 1 && wordCount(chunks[0]) > targetWords * 1.6) {
    const sentences = splitSentences(chunks[0]);
    const rebuilt: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if (wordCount(buf) + wordCount(s) > targetWords && buf) {
        rebuilt.push(buf.trim());
        buf = s;
      } else {
        buf = buf ? `${buf} ${s}` : s;
      }
    }
    if (buf.trim()) rebuilt.push(buf.trim());
    return rebuilt.length ? rebuilt : chunks;
  }

  return chunks;
}
