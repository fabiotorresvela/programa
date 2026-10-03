import { cleanText } from './textSummary';

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // Worker desde CDN compatible con la versión instalada
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const parts: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => ('str' in item ? String(item.str) : ''))
      .filter(Boolean);
    parts.push(strings.join(' '));
  }

  const text = cleanText(parts.join('\n\n'));
  if (wordCountSafe(text) < 40) {
    throw new Error(
      'No pude leer texto de ese PDF (puede ser escaneado/imagen). Prueba un PDF con texto seleccionable.',
    );
  }
  return text;
}

function wordCountSafe(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
