import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, MicOff, Plus, Trash2 } from 'lucide-react';
import { formatMoney, parseVoiceMoney, useFinance } from '../hooks/useFinance';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { isNativeApp, pickReceiptPhoto } from '../lib/native';

export function FinanceView() {
  const { entries, draft, setDraft, addFromDraft, remove, summary } = useFinance();
  const { listening, transcript, supported, start, stop, setTranscript } = useSpeechRecognition();
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!transcript) return;
    const parsed = parseVoiceMoney(transcript);
    setDraft((prev) => ({
      ...prev,
      ...parsed,
      amount: parsed.amount ?? prev.amount,
      note: parsed.note ?? prev.note,
      category: parsed.category ?? prev.category,
      person: parsed.person ?? prev.person,
      kind: parsed.kind ?? prev.kind,
    }));
  }, [transcript, setDraft]);

  const applyPhoto = (photoDataUrl: string, label = 'recibo') => {
    setDraft((prev) => ({
      ...prev,
      photoDataUrl,
      note: prev.note || `Gasto desde foto · ${label}`,
      kind: prev.kind === 'income' ? 'expense' : prev.kind,
    }));
    setMessage('Foto cargada. Completa el monto y guarda.');
  };

  const onPhoto = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyPhoto(String(reader.result || ''), file.name);
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    if (isNativeApp()) {
      const dataUrl = await pickReceiptPhoto();
      if (dataUrl) applyPhoto(dataUrl, 'cámara');
      return;
    }
    fileRef.current?.click();
  };

  const save = () => {
    const ok = addFromDraft();
    setMessage(ok ? 'Movimiento guardado.' : 'Indica un monto válido.');
    setTranscript('');
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>Finanzas personales</h2>
          <p>
            Dicta un gasto, toma foto de un recibo o registra ingresos y préstamos. El resumen se
            comporta como el de una empresa pequeña.
          </p>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: '1rem' }}>
        <div className="kpi income">
          <span>Ingresos</span>
          <strong>{formatMoney(summary.income)}</strong>
        </div>
        <div className="kpi expense">
          <span>Gastos</span>
          <strong>{formatMoney(summary.expenses)}</strong>
        </div>
        <div className="kpi loan">
          <span>Prestado</span>
          <strong>{formatMoney(summary.loans)}</strong>
        </div>
        <div className="kpi balance">
          <span>Resultado</span>
          <strong>{formatMoney(summary.balance)}</strong>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel stack">
          <h3>Registrar</h3>
          <div className="kind-toggle">
            {(
              [
                ['expense', 'Gasto'],
                ['income', 'Ingreso'],
                ['loan', 'Préstamo'],
              ] as const
            ).map(([kind, label]) => (
              <button
                key={kind}
                data-kind={kind}
                className={draft.kind === kind ? 'active' : ''}
                onClick={() => setDraft((d) => ({ ...d, kind }))}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="controls">
            {supported ? (
              <button
                className="btn btn-primary"
                onClick={() => (listening ? stop() : start())}
              >
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
                {listening ? 'Detener voz' : 'Dictar por voz'}
              </button>
            ) : (
              <span className="muted">Tu navegador no soporta dictado por voz.</span>
            )}
            <button className="btn btn-ghost" onClick={() => void openCamera()}>
              <Camera size={18} />
              Foto de recibo
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
          </div>

          {listening && (
            <div className="voice-status">
              <span className="dot" />
              Escuchando… di por ejemplo: “Gasté 25000 en gasolina”
            </div>
          )}
          {transcript && <p className="muted">Detectado: “{transcript}”</p>}

          <div className="form-grid">
            <div className="field">
              <label>Monto</label>
              <input
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                placeholder="Ej. 25000"
              />
            </div>
            <div className="field">
              <label>Categoría</label>
              <input
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                placeholder="Transporte, comida…"
              />
            </div>
            {draft.kind === 'loan' && (
              <div className="field">
                <label>¿A quién le prestaste?</label>
                <input
                  value={draft.person}
                  onChange={(e) => setDraft((d) => ({ ...d, person: e.target.value }))}
                  placeholder="Nombre"
                />
              </div>
            )}
            <div className="field">
              <label>Nota</label>
              <textarea
                rows={3}
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="Detalle del movimiento"
              />
            </div>
            <div className="field">
              <label>Fecha</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              />
            </div>
            {draft.photoDataUrl && (
              <img className="photo-preview" src={draft.photoDataUrl} alt="Recibo adjunto" />
            )}
          </div>

          <div className="controls">
            <button className="btn btn-primary" onClick={save}>
              <Plus size={18} />
              Guardar movimiento
            </button>
          </div>
          {message && <p className="muted">{message}</p>}
        </div>

        <div className="stack">
          <div className="panel">
            <h3>Resumen tipo empresa</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Ingresos menos gastos = resultado. Los préstamos se llevan aparte como dinero por
              recuperar.
            </p>
            <div className="stack" style={{ marginTop: '0.85rem' }}>
              {summary.byCategory.length === 0 ? (
                <p className="empty">Aún no hay gastos categorizados.</p>
              ) : (
                summary.byCategory.map(([cat, total]) => (
                  <div key={cat} className="entry">
                    <div>
                      <strong>{cat}</strong>
                      <div className="meta">Gasto acumulado</div>
                    </div>
                    <div className="amount expense">{formatMoney(total)}</div>
                  </div>
                ))
              )}
            </div>
            {summary.loanPeople.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>A quién le has prestado</strong>
                <div className="stack" style={{ marginTop: '0.65rem' }}>
                  {summary.loanPeople.map(([person, total]) => (
                    <div key={person} className="entry">
                      <div>
                        <strong>{person}</strong>
                        <div className="meta">Pendiente por recuperar</div>
                      </div>
                      <div className="amount loan">{formatMoney(total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>Movimientos</h3>
            <div className="entry-list" style={{ marginTop: '0.75rem' }}>
              {entries.length === 0 && (
                <p className="empty">Todavía no hay movimientos. Dicta uno o agrégalo a mano.</p>
              )}
              {entries.map((e) => (
                <div key={e.id} className="entry">
                  <div>
                    <strong>{e.note}</strong>
                    <div className="meta">
                      {e.kind === 'expense' && 'Gasto'}
                      {e.kind === 'income' && 'Ingreso'}
                      {e.kind === 'loan' && `Préstamo a ${e.person}`}
                      {' · '}
                      {e.category}
                      {' · '}
                      {e.date}
                    </div>
                    {e.photoDataUrl && (
                      <img
                        className="photo-preview"
                        style={{ marginTop: '0.55rem', maxHeight: 100 }}
                        src={e.photoDataUrl}
                        alt=""
                      />
                    )}
                  </div>
                  <div style={{ display: 'grid', justifyItems: 'end', gap: '0.4rem' }}>
                    <div className={`amount ${e.kind}`}>{formatMoney(e.amount)}</div>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '0.4rem 0.55rem' }}
                      onClick={() => remove(e.id)}
                      aria-label="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
