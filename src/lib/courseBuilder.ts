import type { Course, LessonSection } from '../types';
import { gatherTopicMaterial } from './wikiContent';
import { extractPdfText } from './pdfContent';
import {
  chunkText,
  durationLabel,
  estimateMinutes,
  extractKeyPoints,
  summarizeChunk,
  wordCount,
} from './textSummary';
import { uid } from './storage';

function sectionFromText(title: string, text: string, index: number): LessonSection {
  const summary = summarizeChunk(text, 6);
  const keyPoints = extractKeyPoints(text, 4);
  const minutes = estimateMinutes(summary + ' ' + text.slice(0, 1200));
  const script = [
    `Sección ${index}. ${title}.`,
    summary,
    keyPoints.length ? `Ideas clave: ${keyPoints.join(' ')}` : '',
    'Pausa mental: ¿cómo aplicarías esto hoy en tu trabajo o ventas?',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: uid(),
    title: `${index}. ${title}`,
    durationLabel: durationLabel(Math.max(2, Math.min(minutes, 12))),
    summary,
    keyPoints: keyPoints.length ? keyPoints : [summary.slice(0, 140)],
    practice: `Después de escuchar, explica en voz alta la idea principal de “${title}” en 30 segundos.`,
    script,
  };
}

function finalizeCourse(input: {
  title: string;
  subtitle: string;
  tag: string;
  description: string;
  sections: LessonSection[];
}): Course {
  const totalMin = input.sections.reduce((n, s) => {
    const m = Number(String(s.durationLabel).replace(/[^\d]/g, '')) || 3;
    return n + m;
  }, 0);

  return {
    id: uid(),
    title: input.title,
    subtitle: input.subtitle,
    tag: input.tag,
    coverTone: 'clay',
    description: `${input.description} Duración estimada total: ${durationLabel(totalMin)}.`,
    sections: input.sections,
  };
}

export async function buildCourseFromQuery(query: string): Promise<Course> {
  const material = await gatherTopicMaterial(query.trim());
  const sections: LessonSection[] = [];
  let index = 1;

  for (const block of material.sections) {
    const pieces = chunkText(block.text, 650);
    for (let i = 0; i < pieces.length; i++) {
      const title = pieces.length > 1 ? `${block.title} (${i + 1})` : block.title;
      sections.push(sectionFromText(title, pieces[i], index));
      index += 1;
      if (sections.length >= 24) break;
    }
    if (sections.length >= 24) break;
  }

  return finalizeCourse({
    title: material.title,
    subtitle: `Basado en: ${query}`,
    tag: 'Biblioteca',
    description: material.sourceNote,
    sections,
  });
}

export async function buildCourseFromPdf(file: File): Promise<Course> {
  const text = await extractPdfText(file);
  const chunks = chunkText(text, 750).slice(0, 30);
  const sections = chunks.map((chunk, i) => {
    const heading = chunk.split('\n')[0]?.slice(0, 60) || `Parte ${i + 1}`;
    const title = wordCount(heading) < 12 ? heading : `Parte ${i + 1}`;
    return sectionFromText(title, chunk, i + 1);
  });

  return finalizeCourse({
    title: file.name.replace(/\.pdf$/i, '') || 'Documento PDF',
    subtitle: 'Resumen escuchable desde tu PDF',
    tag: 'PDF',
    description:
      'Resumen generado desde el PDF que subiste. Úsalo para estudiar y practicar; no sustituye el texto completo.',
    sections,
  });
}
