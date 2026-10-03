type WikiSearchItem = { title: string; snippet: string };
type WikiSection = { id: number; title: string; text: string };

async function wikiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('No se pudo consultar la información.');
  return res.json() as Promise<T>;
}

export async function searchWikipedia(query: string, lang: 'es' | 'en' = 'es') {
  const url =
    `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}` +
    `&srlimit=5&utf8=1&format=json&origin=*`;
  const data = await wikiGet<{ query?: { search?: WikiSearchItem[] } }>(url);
  return data.query?.search ?? [];
}

async function fetchMobileSections(title: string, lang: 'es' | 'en'): Promise<WikiSection[]> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title)}`;
  const data = await wikiGet<{
    lead?: { sections?: Array<{ id: number; text?: string; line?: string }> };
    remaining?: { sections?: Array<{ id: number; line?: string; text?: string }> };
  }>(url);

  const htmlToText = (html: string) =>
    html
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

  const sections: WikiSection[] = [];
  const leadText = (data.lead?.sections ?? [])
    .map((s) => htmlToText(s.text || ''))
    .filter(Boolean)
    .join('\n\n');
  if (leadText) {
    sections.push({ id: 0, title: 'Introducción', text: leadText });
  }
  for (const s of data.remaining?.sections ?? []) {
    const text = htmlToText(s.text || '');
    if (!text || text.length < 80) continue;
    const title = (s.line || `Sección ${s.id}`).replace(/<[^>]+>/g, '').trim();
    if (/referencias|enlaces externos|véase también|bibliografía|notas/i.test(title)) continue;
    sections.push({ id: s.id, title, text });
  }
  return sections;
}

export async function gatherTopicMaterial(query: string) {
  let lang: 'es' | 'en' = 'es';
  let results = await searchWikipedia(query, 'es');
  if (!results.length) {
    lang = 'en';
    results = await searchWikipedia(query, 'en');
  }
  if (!results.length) {
    throw new Error('No encontré información sobre ese tema. Prueba con otro nombre o sube un PDF.');
  }

  const primary = results[0].title;
  let sections = await fetchMobileSections(primary, lang);

  // Ampliar con un segundo artículo relacionado si el contenido es corto.
  const totalLen = sections.reduce((n, s) => n + s.text.length, 0);
  if (totalLen < 6000 && results[1]) {
    try {
      const extra = await fetchMobileSections(results[1].title, lang);
      sections = [
        ...sections,
        ...extra.map((s) => ({
          ...s,
          id: s.id + 1000,
          title: `${results[1].title}: ${s.title}`,
        })),
      ];
    } catch {
      // ignore
    }
  }

  if (!sections.length) {
    throw new Error('Encontré el tema, pero sin texto suficiente para resumir.');
  }

  return {
    title: primary,
    lang,
    related: results.slice(0, 3).map((r) => r.title),
    sections,
    sourceNote:
      lang === 'es'
        ? 'Resumen educativo a partir de Wikipedia en español. No reproduce un audiolibro comercial.'
        : 'Resumen educativo a partir de Wikipedia en inglés (traduce mentalmente o pide en español el tema). No reproduce un audiolibro comercial.',
  };
}
