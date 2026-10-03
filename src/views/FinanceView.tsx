import { useEffect, useRef, useState } from 'react';
import { Camera, ClipboardPaste, Copy, FolderOpen, Mic, MicOff, Plus, Trash2 } from 'lucide-react';
import { formatMoney, parseVoiceMoney, useFinance } from '../hooks/useFinance';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { isNativeApp, pickReceiptPhoto } from '../lib/native';

export function FinanceView() {
  const { entries, draft, setDraft, addFromDraft, remove, summary, exportText, importFromText } =
    useFinance();
  const { listening, transcript, supported, start, stop, setTranscript } = useSpeechRecognition();
  const [message, setMessage] = useState('');
  const [backupText, setBackupText] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      // Guardamos imagen o PDF como adjunto; la vista previa solo aplica a imágenes.
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        applyPhoto(dataUrl, file.name);
      } else {
        setMessage('Usa una imagen o un PDF de la factura.');
      }
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    if (isNativeApp()) {
      const dataUrl = await pickReceiptPhoto();
      if (dataUrl) applyPhoto(dataUrl, 'cámara');
      return;
    }
    cameraRef.current?.click();
  };

  const openGalleryOrFiles = () => {
    galleryRef.current?.click();
  };

  const save = () => {
    const ok = addFromDraft();
    setMessage(ok ? 'Movimiento guardado.' : 'Indica un monto válido.');
    setTranscript('');
  };

  const copyBackup = async () => {
    const text = exportText();
    setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`Respaldo copiado (${entries.length} movimientos). Pégalo en Safari.`);
    } catch {
      setMessage('No se pudo copiar solo. Selecciona el texto del cuadro y cópialo a mano.');
    }
  };

  const pasteAndImport = async () => {
    try {
      const text = backupText.trim() || (await navigator.clipboard.readText());
      const count = importFromText(text, 'replace');
      setBackupText('');
      setMessage(`Importados ${count} movimientos. Ya quedan guardados en este navegador.`);
    } catch {
      setMessage('Pega el respaldo en el cuadro de abajo y vuelve a tocar Importar.');
    }
  };

  const onImportFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = importFromText(String(reader.result || ''), 'replace');
        setMessage(`Importados ${count} movimientos desde archivo.`);
      } catch {
        setMessage('Ese archivo no es un respaldo válido de Programa.');
      }
    };
    reader.readAsText(file);
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

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <h3>Pasar datos entre Brave y Safari</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Cada navegador guarda aparte. Para no perder lo que ya metiste: en Brave toca
          <strong> Copiar respaldo</strong>, luego en Safari pega e <strong>Importar</strong>.
          Después usa solo Safari (o el icono de pantalla de inicio).
        </p>
        <div className="controls" style={{ marginTop: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => void copyBackup()}>
            <Copy size={18} />
            Copiar respaldo
          </button>
          <button className="btn btn-ghost" onClick={() => void pasteAndImport()}>
            <ClipboardPaste size={18} />
            Importar respaldo
          </button>
          <button className="btn btn-ghost" onClick={() => importFileRef.current?.click()}>
            Elegir archivo
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json,text/plain"
            hidden
            onChange={(e) => onImportFile(e.target.files?.[0])}
          />
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Respaldo (copiar / pegar)</label>
          <textarea
            rows={4}
            value={backupText}
            onChange={(e) => setBackupText(e.target.value)}
            placeholder="Aquí aparece o pegas el respaldo JSON"
          />
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
              Tomar foto
            </button>
            <button className="btn btn-ghost" onClick={openGalleryOrFiles}>
              <FolderOpen size={18} />
              Archivo o galería
            </button>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onPhoto(e.target.files?.[0])}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
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
            {draft.photoDataUrl?.startsWith('data:image') && (
              <img className="photo-preview" src={draft.photoDataUrl} alt="Recibo adjunto" />
            )}
            {draft.photoDataUrl?.startsWith('data:application/pdf') && (
              <p className="muted">PDF de factura adjunto.</p>
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
