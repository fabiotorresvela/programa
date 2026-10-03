import { useEffect, useMemo, useRef, useState } from 'react';
import { FileUp, Loader2, Pause, Play, Search, Square, Trash2 } from 'lucide-react';
import { useSpeechPlayback } from '../hooks/useSpeech';
import { buildCourseFromPdf, buildCourseFromQuery } from '../lib/courseBuilder';
import { allCourses, loadCustomCourses, saveCustomCourses } from '../lib/courseStore';
import type { Course } from '../types';

export function AudioView() {
  const [custom, setCustom] = useState<Course[]>(() => loadCustomCourses());
  const catalog = useMemo(() => allCourses(custom), [custom]);
  const [courseId, setCourseId] = useState(catalog[0]?.id ?? '');
  const [sectionId, setSectionId] = useState(catalog[0]?.sections[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const pdfRef = useRef<HTMLInputElement>(null);
  const { speaking, paused, play, stop, togglePause } = useSpeechPlayback();

  useEffect(() => {
    saveCustomCourses(custom);
  }, [custom]);

  const course = useMemo(
    () => catalog.find((c) => c.id === courseId) ?? catalog[0],
    [catalog, courseId],
  );
  const section = useMemo(
    () => course?.sections.find((s) => s.id === sectionId) ?? course?.sections[0],
    [course, sectionId],
  );

  useEffect(() => {
    if (!course) return;
    if (!course.sections.some((s) => s.id === sectionId)) {
      setSectionId(course.sections[0]?.id ?? '');
    }
  }, [course, sectionId]);

  const selectCourse = (id: string) => {
    stop();
    const next = catalog.find((c) => c.id === id) ?? catalog[0];
    if (!next) return;
    setCourseId(next.id);
    setSectionId(next.sections[0]?.id ?? '');
  };

  const selectSection = (id: string) => {
    stop();
    setSectionId(id);
  };

  const addCourse = (created: Course) => {
    setCustom((prev) => [created, ...prev]);
    setCourseId(created.id);
    setSectionId(created.sections[0]?.id ?? '');
    setStatus(
      `Listo: “${created.title}” con ${created.sections.length} partes para escuchar.`,
    );
  };

  const createFromQuery = async () => {
    if (!query.trim()) {
      setStatus('Escribe un tema, libro o autor.');
      return;
    }
    setBusy(true);
    setStatus('Buscando información y armando el audio resumido…');
    stop();
    try {
      const created = await buildCourseFromQuery(query.trim());
      addCourse(created);
      setQuery('');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo crear el audio.');
    } finally {
      setBusy(false);
    }
  };

  const createFromPdf = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    setStatus(`Leyendo PDF “${file.name}” y creando resumen escuchable…`);
    stop();
    try {
      const created = await buildCourseFromPdf(file);
      addCourse(created);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'No se pudo leer el PDF.');
    } finally {
      setBusy(false);
      if (pdfRef.current) pdfRef.current.value = '';
    }
  };

  const removeCustom = (id: string) => {
    stop();
    setCustom((prev) => prev.filter((c) => c.id !== id));
    const remaining = allCourses(custom.filter((c) => c.id !== id));
    setCourseId(remaining[0]?.id ?? '');
    setSectionId(remaining[0]?.sections[0]?.id ?? '');
    setStatus('Tema personalizado eliminado.');
  };

  const bars = [28, 55, 40, 70, 35, 62, 48, 80, 44, 66, 38, 72, 50, 58, 42];
  if (!course || !section) {
    return (
      <div className="section">
        <p className="muted">No hay temas todavía.</p>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>Audio de práctica</h2>
          <p>
            Busca un tema, libro o autor, o sube un PDF. Programa lo parte en resúmenes para
            escuchar (ideal en trayectos de 30–60 minutos).
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h3>Crear audio nuevo</h3>
        <div className="form-grid" style={{ marginTop: '0.75rem' }}>
          <div className="field">
            <label>Tema, libro o autor</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. La biblia del vendedor, Dale Carnegie, prospección"
              disabled={busy}
            />
          </div>
        </div>
        <div className="controls" style={{ marginTop: '0.75rem' }}>
          <button className="btn btn-primary" disabled={busy} onClick={() => void createFromQuery()}>
            {busy ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
            Buscar y resumir
          </button>
          <button
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => pdfRef.current?.click()}
          >
            <FileUp size={18} />
            Subir PDF
          </button>
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => void createFromPdf(e.target.files?.[0])}
          />
        </div>
        {status && <p className="muted" style={{ marginTop: '0.75rem' }}>{status}</p>}
        <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}>
          Usa resúmenes educativos (Wikipedia/PDF propio). No descarga audiolibros con copyright.
        </p>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h3>Temas</h3>
          <div className="course-list">
            {catalog.map((c) => (
              <div key={c.id} style={{ display: 'grid', gap: '0.35rem' }}>
                <button
                  className={`course-item ${c.id === course.id ? 'active' : ''}`}
                  onClick={() => selectCourse(c.id)}
                >
                  <span className="tag">{c.tag}</span>
                  <strong>{c.title}</strong>
                  <span className="muted">{c.subtitle}</span>
                </button>
                {custom.some((x) => x.id === c.id) && (
                  <button
                    className="btn btn-ghost"
                    style={{ padding: '0.45rem 0.7rem', justifySelf: 'start' }}
                    onClick={() => removeCustom(c.id)}
                  >
                    <Trash2 size={14} />
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="panel player">
          <div className="player-top">
            <div>
              <div
                className="tag"
                style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem' }}
              >
                {course.tag} · {section.durationLabel}
              </div>
              <h3 style={{ marginTop: '0.35rem' }}>{section.title}</h3>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {course.title} · {course.sections.length} partes
              </p>
            </div>
          </div>

          <div className={`wave ${speaking && !paused ? 'live' : ''}`} aria-hidden>
            {bars.map((h, i) => (
              <span key={i} style={{ height: `${h}%` }} />
            ))}
          </div>

          <div className="controls">
            {!speaking ? (
              <button className="btn btn-primary" onClick={() => play(section.script)}>
                <Play size={18} />
                Escuchar resumen
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={togglePause}>
                  {paused ? <Play size={18} /> : <Pause size={18} />}
                  {paused ? 'Continuar' : 'Pausar'}
                </button>
                <button className="btn btn-ghost" onClick={stop}>
                  <Square size={16} />
                  Detener
                </button>
              </>
            )}
            {course.sections.length > 1 && (
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const full = course.sections.map((s) => s.script).join('\n\n');
                  play(full);
                }}
              >
                Escuchar todo
              </button>
            )}
          </div>

          <div className="chip-row">
            {course.sections.map((s) => (
              <button
                key={s.id}
                className={`chip ${s.id === section.id ? 'active' : ''}`}
                onClick={() => selectSection(s.id)}
              >
                {s.title.replace(/^\d+\.\s*/, '').slice(0, 28)}
              </button>
            ))}
          </div>

          <div>
            <strong>Resumen</strong>
            <p className="muted" style={{ margin: '0.4rem 0 0', lineHeight: 1.55 }}>
              {section.summary}
            </p>
            <ul className="points">
              {section.keyPoints.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <div className="practice-box">
              <strong>Práctica en voz alta</strong>
              <p className="muted" style={{ margin: '0.35rem 0 0', lineHeight: 1.5 }}>
                {section.practice}
              </p>
            </div>
            <p className="muted" style={{ marginTop: '0.8rem', fontSize: '0.82rem' }}>
              {course.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
