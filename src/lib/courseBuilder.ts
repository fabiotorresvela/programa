import type { Course, LessonSection } from '../types';
import { extractPdfText } from './pdfContent';
import { uid } from './storage';
import { chunkText, durationLabel, wordCount } from './textSummary';
import { buildListenScript, gatherTopicMaterial, researchToListenParts } from './wikiContent';

function sectionFromText(title: string, text: string, index: number, authorities: string[] = []): LessonSection {
  const built = buildListenScript(title, text, index, authorities);
  return {
    id: uid(),
    title: `${index}. ${title}`,
    durationLabel: built.durationLabel,
    summary: built.summary,
    keyPoints: built.keyPoints,
    practice: `Después de escuchar, explica en voz alta la idea principal de “${title}” en 30 segundos y cita un referente si aplica.`,
    script: built.script,
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
  const parts = researchToListenParts(material);
  const sections = parts.map((part, i) =>
    sectionFromText(part.title, part.text, i + 1, material.authorities),
  );

  const refs = material.authorities.slice(0, 5).join(' · ') || material.related.slice(0, 3).join(' · ');

  return finalizeCourse({
    title: material.title,
    subtitle: refs ? `Referentes: ${refs}` : `Basado en: ${query}`,
    tag: 'Elite',
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
