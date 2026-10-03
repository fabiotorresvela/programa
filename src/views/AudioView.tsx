import { useMemo, useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { courses } from '../data/courses';
import { useSpeechPlayback } from '../hooks/useSpeech';

export function AudioView() {
  const [courseId, setCourseId] = useState(courses[0].id);
  const [sectionId, setSectionId] = useState(courses[0].sections[0].id);
  const { speaking, paused, play, stop, togglePause } = useSpeechPlayback();

  const course = useMemo(() => courses.find((c) => c.id === courseId) ?? courses[0], [courseId]);
  const section = useMemo(
    () => course.sections.find((s) => s.id === sectionId) ?? course.sections[0],
    [course, sectionId],
  );

  const selectCourse = (id: string) => {
    stop();
    const next = courses.find((c) => c.id === id) ?? courses[0];
    setCourseId(next.id);
    setSectionId(next.sections[0].id);
  };

  const selectSection = (id: string) => {
    stop();
    setSectionId(id);
  };

  const bars = [28, 55, 40, 70, 35, 62, 48, 80, 44, 66, 38, 72, 50, 58, 42];

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>Audio de práctica</h2>
          <p>
            Resúmenes cortos para conducir, desplazarte o esperar. Usa la voz del dispositivo para
            escuchar y repetir los pasos.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h3>Temas</h3>
          <p className="muted" style={{ margin: 0 }}>
            Contenido original para entrenar ventas. Puedes usarlo como guía mientras te mueves.
          </p>
          <div className="course-list">
            {courses.map((c) => (
              <button
                key={c.id}
                className={`course-item ${c.id === course.id ? 'active' : ''}`}
                onClick={() => selectCourse(c.id)}
              >
                <span className="tag">{c.tag}</span>
                <strong>{c.title}</strong>
                <span className="muted">{c.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel player">
          <div className="player-top">
            <div>
              <div className="tag" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.75rem' }}>
                {course.tag} · {section.durationLabel}
              </div>
              <h3 style={{ marginTop: '0.35rem' }}>{section.title}</h3>
              <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                {course.title}
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
          </div>

          <div className="chip-row">
            {course.sections.map((s) => (
              <button
                key={s.id}
                className={`chip ${s.id === section.id ? 'active' : ''}`}
                onClick={() => selectSection(s.id)}
              >
                {s.title.replace(/^\d+\.\s*/, '')}
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
          </div>
        </div>
      </div>
    </div>
  );
}
