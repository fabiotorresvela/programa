import {
  chunkText,
  cleanText,
  durationLabel,
  estimateMinutes,
  extractKeyPoints,
  summarizeChunk,
  wordCount,
} from './textSummary';

type WikiSearchItem = { title: string; snippet: string; score?: number };
export type ResearchSection = {
  id: number;
  title: string;
  text: string;
  source: string;
  quality: number;
};

export type TopicResearch = {
  title: string;
  query: string;
  lang: 'es' | 'en' | 'mix';
  authorities: string[];
  related: string[];
  sections: ResearchSection[];
  sourceNote: string;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo consultar: ${url}`);
  return res.json() as Promise<T>;
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreSnippet(title: string, snippet: string, query: string) {
  const q = query.toLowerCase();
  const hay = `${title} ${snippet}`.toLowerCase();
  let score = 0;
  for (const word of q.split(/\s+/).filter((w) => w.length > 2)) {
    if (hay.includes(word)) score += 8;
  }
  if (/best|mejor|framework|princip|método|metodo|guru|expert|nobel|harvard|stanford|oxford|mit/i.test(hay)) {
    score += 18;
  }
  if (/sales|ventas|negoci|lider|management|estrateg/i.test(hay)) score += 6;
  return score;
}

export async function searchWikipedia(query: string, lang: 'es' | 'en' = 'es', limit = 8) {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    `&srlimit=${limit}&utf8=1&format=json&origin=*`;
  const data = await getJson<{ query?: { search?: WikiSearchItem[] } }>(url);
  return (data.query?.search ?? []).map((item) => ({
    ...item,
    score: scoreSnippet(item.title, item.snippet || '', query),
  }));
}

async function fetchMobileSections(title: string, lang: 'es' | 'en') {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title)}`;
  const data = await getJson<{
    lead?: { sections?: Array<{ id: number; text?: string; line?: string }> };
    remaining?: { sections?: Array<{ id: number; line?: string; text?: string }> };
  }>(url);

  const out: Array<{ id: number; title: string; text: string }> = [];
  const leadText = (data.lead?.sections ?? [])
    .map((s) => htmlToText(s.text || ''))
    .filter(Boolean)
    .join('\n\n');
  if (leadText) out.push({ id: 0, title: 'Introducción', text: leadText });

  for (const s of data.remaining?.sections ?? []) {
    const text = htmlToText(s.text || '');
    if (!text || text.length < 90) continue;
    const sectionTitle = (s.line || `Sección ${s.id}`).replace(/<[^>]+>/g, '').trim();
    if (/referencias|enlaces externos|véase también|bibliografía|notas|see also|references|external links|notes/i.test(sectionTitle)) {
      continue;
    }
    out.push({ id: s.id, title: sectionTitle, text });
  }
  return out;
}

async function searchOpenLibrary(query: string) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=6`;
    const data = await getJson<{
      docs?: Array<{ title?: string; author_name?: string[]; first_sentence?: string[] | string; subject?: string[] }>;
    }>(url);
    return (data.docs ?? [])
      .map((doc) => {
        const authors = (doc.author_name ?? []).slice(0, 2).join(', ');
        const sentence = Array.isArray(doc.first_sentence)
          ? doc.first_sentence[0]
          : doc.first_sentence || '';
        const subjects = (doc.subject ?? []).slice(0, 5).join(', ');
        const text = cleanText(
          [sentence, subjects ? `Temas relacionados: ${subjects}.` : '', authors ? `Autor referente: ${authors}.` : '']
            .filter(Boolean)
            .join(' '),
        );
        return {
          title: doc.title || 'Libro',
          authors,
          text,
        };
      })
      .filter((d) => d.text.length > 40);
  } catch {
    return [];
  }
}

function buildExpertQueries(topic: string) {
  return [
    topic,
    `best practices ${topic}`,
    `${topic} framework principles`,
    `mejores prácticas ${topic}`,
    `${topic} experts methods`,
    `${topic} leadership sales strategy`,
  ];
}

function authorityFromTitle(title: string) {
  // Heurística: nombres propios / temas reconocidos suelen venir en títulos de Wikipedia.
  return title.replace(/\s*\(.*\)\s*$/, '').trim();
}

function qualityForSection(title: string, text: string) {
  let q = Math.min(40, Math.floor(text.length / 80));
  if (/principle|principio|framework|método|metodo|strategy|estrategia|best|mejor|practice|práctica/i.test(title)) {
    q += 20;
  }
  if (/history|historia|etimolog|early life|biografía/i.test(title)) q -= 8;
  if (wordCount(text) > 120) q += 8;
  return q;
}

export async function gatherTopicMaterial(query: string): Promise<TopicResearch> {
  const topic = query.trim();
  if (!topic) throw new Error('Escribe un tema para investigar.');

  const queries = buildExpertQueries(topic);
  type Hit = WikiSearchItem & { lang: 'es' | 'en'; q: string };
  const searchJobs: Array<Promise<Hit[]>> = queries.flatMap((q) => [
    searchWikipedia(q, 'en', 6).then((rows) => rows.map((r) => ({ ...r, lang: 'en' as const, q }))),
    searchWikipedia(q, 'es', 5).then((rows) => rows.map((r) => ({ ...r, lang: 'es' as const, q }))),
  ]);

  const settled = await Promise.allSettled(searchJobs);
  const merged: Hit[] = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Deduplicar por título+idioma y quedarnos con los mejores.
  const byKey = new Map<string, Hit>();
  for (const item of merged) {
    const key = `${item.lang}:${item.title.toLowerCase()}`;
    const prev = byKey.get(key);
    if (!prev || (item.score ?? 0) > (prev.score ?? 0)) byKey.set(key, item);
  }

  const ranked = [...byKey.values()].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  if (!ranked.length) {
    throw new Error('No encontré referentes sólidos sobre ese tema. Prueba otro nombre o sube un PDF.');
  }

  const topHits = ranked.slice(0, 5);
  const sections: ResearchSection[] = [];
  let idBase = 1;

  for (const hit of topHits) {
    try {
      const parts = await fetchMobileSections(hit.title, hit.lang);
      for (const part of parts.slice(0, 6)) {
        sections.push({
          id: idBase++,
          title: `${hit.title}: ${part.title}`,
          text: part.text,
          source: `Wikipedia ${hit.lang.toUpperCase()} · ${hit.title}`,
          quality: qualityForSection(part.title, part.text) + (hit.score ?? 0) / 4,
        });
      }
    } catch {
      // seguir con otros hits
    }
  }

  const books = await searchOpenLibrary(topic);
  for (const book of books.slice(0, 4)) {
    sections.push({
      id: idBase++,
      title: `Referente editorial: ${book.title}`,
      text: book.text,
      source: `Open Library · ${book.authors || book.title}`,
      quality: 22,
    });
  }

  sections.sort((a, b) => b.quality - a.quality);
  const chosen = sections.slice(0, 18);
  if (!chosen.length) {
    throw new Error('Encontré el tema, pero sin texto suficiente para resumir con calidad.');
  }

  const authorities = [
    ...new Set([
      ...topHits.slice(0, 5).map((h) => authorityFromTitle(h.title)),
      ...books.slice(0, 3).map((b) => (b.authors ? `${b.title} (${b.authors})` : b.title)),
    ]),
  ].slice(0, 8);

  // Bloque guía: mapa del tema con los mejores referentes detectados.
  const mapText = [
    `Investigación de clase mundial sobre “${topic}”.`,
    `Referentes y fuentes prioritarias detectadas: ${authorities.join('; ')}.`,
    'El resumen siguiente prioriza principios, métodos y prácticas útiles, no datos menores.',
    'Úsalo para estudiar y aplicar; no sustituye libros comerciales con copyright.',
  ].join(' ');

  chosen.unshift({
    id: 0,
    title: 'Mapa de referentes de alto nivel',
    text: mapText,
    source: 'Programa Research',
    quality: 100,
  });

  const hasEn = topHits.some((h) => h.lang === 'en');
  const hasEs = topHits.some((h) => h.lang === 'es');
  const lang = hasEn && hasEs ? 'mix' : hasEn ? 'en' : 'es';

  return {
    title: topic,
    query: topic,
    lang,
    authorities,
    related: topHits.map((h) => h.title),
    sections: chosen,
    sourceNote:
      `Resumen educativo priorizando referentes y prácticas de alto nivel sobre “${topic}”. ` +
      `Fuentes: Wikipedia (ES/EN) y catálogo Open Library. No reproduce audiolibros ni libros con copyright.`,
  };
}

export function researchToListenParts(material: TopicResearch) {
  const parts: Array<{ title: string; text: string; source: string }> = [];

  for (const block of material.sections) {
    const pieces = chunkText(block.text, 620);
    pieces.forEach((piece, i) => {
      const title = pieces.length > 1 ? `${block.title} (${i + 1})` : block.title;
      parts.push({ title, text: piece, source: block.source });
    });
  }

  return parts.slice(0, 28);
}

export function buildListenScript(title: string, text: string, index: number, authorities: string[]) {
  const summary = summarizeChunk(text, 6);
  const keyPoints = extractKeyPoints(text, 4);
  const minutes = estimateMinutes(summary + ' ' + text.slice(0, 1200));
  const expertHint =
    index === 1 && authorities.length
      ? `Referentes a tener en cuenta: ${authorities.slice(0, 4).join(', ')}.`
      : '';

  const script = [
    `Sección ${index}. ${title}.`,
    expertHint,
    summary,
    keyPoints.length ? `Ideas clave: ${keyPoints.join(' ')}` : '',
    'Aplica ahora: elige una idea y practícala en tu próxima conversación comercial o de liderazgo.',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    summary,
    keyPoints: keyPoints.length ? keyPoints : [summary.slice(0, 140)],
    durationLabel: durationLabel(Math.max(2, Math.min(minutes, 12))),
    script,
  };
}
