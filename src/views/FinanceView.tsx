import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Download,
  FolderOpen,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  formatMoney,
  parseVoiceMoney,
  paymentMethodLabel,
  useFinance,
} from '../hooks/useFinance';
import { useSpeechRecognition } from '../hooks/useSpeech';
import { saveTextAsFile } from '../lib/backupFiles';
import { scanInvoiceImage } from '../lib/invoiceOcr';
import { isNativeApp, pickReceiptPhoto } from '../lib/native';

export function FinanceView() {
  const {
    entries,
    ledgerEntries,
    ledger,
    setLedger,
    draft,
    setDraft,
    addFromDraft,
    remove,
    summary,
    personalSummary,
    empresaSummary,
    exportText,
    importFromText,
  } = useFinance();
  const { listening, transcript, supported, start, stop, setTranscript } = useSpeechRecognition();
  const [message, setMessage] = useState('');
  const [backupText, setBackupText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const isEmpresa = ledger === 'empresa';

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

  const applyPhoto = async (photoDataUrl: string, label = 'recibo', runOcr = true) => {
    setDraft((prev) => ({
      ...prev,
      photoDataUrl,
      note: prev.note || `Gasto desde foto · ${label}`,
      kind: prev.kind === 'income' ? 'expense' : prev.kind,
    }));

    if (!runOcr || !photoDataUrl.startsWith('data:image')) {
      setMessage(
        photoDataUrl.startsWith('data:application/pdf')
          ? 'PDF adjunto. Si puedes, sube una foto de la factura para leer el valor solo.'
          : 'Archivo cargado. Completa el monto y guarda.',
      );
      return;
    }

    setScanning(true);
    setScanPct(0);
    setMessage('Leyendo la factura para sacar el valor…');
    try {
      const scanned = await scanInvoiceImage(photoDataUrl, setScanPct);
      setDraft((prev) => ({
        ...prev,
        photoDataUrl,
        kind: 'expense',
        amount: scanned.amount || prev.amount,
        note:
          scanned.merchant
            ? `Factura · ${scanned.merchant}`
            : prev.note || `Gasto desde foto · ${label}`,
        category: prev.category && prev.category !== 'General' ? prev.category : 'Factura',
      }));
      setMessage(
        scanned.amount
          ? `Total detectado: ${formatMoney(Number(scanned.amount))}${
              scanned.matchedLine ? ` (${scanned.matchedLine.slice(0, 60)})` : ''
            }. Revísalo y guarda.`
          : 'No pude leer el total a pagar. Toma la foto más de cerca al TOTAL y vuelve a intentar, o escríbelo a mano.',
      );
    } catch {
      setMessage('No pude leer la factura. Escribe el monto a mano y guarda.');
    } finally {
      setScanning(false);
      setScanPct(0);
    }
  };

  const onPhoto = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        void applyPhoto(dataUrl, file.name, file.type.startsWith('image/'));
      } else {
        setMessage('Usa una imagen o un PDF de la factura.');
      }
    };
    reader.readAsDataURL(file);
  };

  const openCamera = async () => {
    if (isNativeApp()) {
      const dataUrl = await pickReceiptPhoto();
      if (dataUrl) void applyPhoto(dataUrl, 'cámara', true);
      return;
    }
    cameraRef.current?.click();
  };

  const openGalleryOrFiles = () => {
    galleryRef.current?.click();
  };

  const save = () => {
    const ok = addFromDraft();
    setMessage(
      ok
        ? `Movimiento guardado en ${isEmpresa ? 'Empresa' : 'Personales'}.`
        : 'Indica un monto válido.',
    );
    setTranscript('');
  };

  const saveBackupFile = async () => {
    if (!entries.length) {
      setMessage('No hay movimientos para guardar todavía.');
      return;
    }
    const text = exportText();
    setBackupText(text);
    const result = await saveTextAsFile(text);
    if (result === 'shared') {
      setMessage(
        'Elige “Guardar en Archivos” (o Enviar a…). Luego ábrelo en la app de la pantalla de inicio y toca Cargar archivo.',
      );
    } else if (result === 'downloaded') {
      setMessage('Archivo de respaldo creado. Guárdalo en Archivos y cárgalo en la otra app.');
    } else {
      setMessage('Cancelaste el guardado. Vuelve a tocar Guardar archivo cuando quieras.');
    }
  };

  const importFromTextBox = () => {
    if (!backupText.trim()) {
      setMessage('Primero pega el respaldo en el cuadro, o usa Cargar archivo.');
      return;
    }
    try {
      const count = importFromText(backupText, 'replace');
      setBackupText('');
      setMessage(`Listo: se cargaron ${count} movimientos en esta app.`);
    } catch {
      setMessage('Ese texto no es un respaldo válido. Mejor usa el archivo .json.');
    }
  };

  const onImportFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const count = importFromText(String(reader.result || ''), 'replace');
        setBackupText('');
        setMessage(`Listo: se cargaron ${count} movimientos desde “${file.name}”.`);
      } catch {
        setMessage('Ese archivo no es un respaldo válido de Programa (.json).');
      }
    };
    reader.onerror = () => setMessage('No pude leer ese archivo. Prueba de nuevo.');
    reader.readAsText(file);
  };

  return (
    <div className="section">
      <div className="section-head">
        <div>
          <h2>Finanzas</h2>
          <p>
            Separa tu dinero: lo personal y lo de la empresa. Cada sección tiene su propia base,
            gastos, ingresos y préstamos.
          </p>
        </div>
      </div>

      <div className="ledger-toggle" role="tablist" aria-label="Tipo de finanzas">
        <button
          role="tab"
          aria-selected={!isEmpresa}
          className={!isEmpresa ? 'active' : ''}
          onClick={() => setLedger('personal')}
        >
          Personales
          <small>{formatMoney(personalSummary.balance)}</small>
        </button>
        <button
          role="tab"
          aria-selected={isEmpresa}
          className={isEmpresa ? 'active' : ''}
          onClick={() => setLedger('empresa')}
        >
          Empresa
          <small>{formatMoney(empresaSummary.balance)}</small>
        </button>
      </div>

      <p className="muted" style={{ margin: '0.75rem 0 1rem' }}>
        Estás en <strong>{isEmpresa ? 'Empresa' : 'Personales'}</strong>. Lo que registres aquí no se
        mezcla con la otra sección.
      </p>

      <div className="kpi-grid" style={{ marginBottom: '0.75rem' }}>
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

      <div className="kpi-grid income-methods" style={{ marginBottom: '1rem' }}>
        <div className="kpi income">
          <span>Ingresos por transferencia</span>
          <strong>{formatMoney(summary.incomeTransfer)}</strong>
        </div>
        <div className="kpi income">
          <span>Ingresos en efectivo</span>
          <strong>{formatMoney(summary.incomeCash)}</strong>
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

          {draft.kind === 'income' && (
            <div>
              <p className="field-label">¿Cómo entró el dinero?</p>
              <div className="kind-toggle method-toggle">
                <button
                  className={draft.paymentMethod === 'transferencia' ? 'active' : ''}
                  onClick={() => setDraft((d) => ({ ...d, paymentMethod: 'transferencia' }))}
                >
                  Transferencia
                </button>
                <button
                  className={draft.paymentMethod === 'efectivo' ? 'active' : ''}
                  onClick={() => setDraft((d) => ({ ...d, paymentMethod: 'efectivo' }))}
                >
                  Efectivo
                </button>
              </div>
            </div>
          )}

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
            <button className="btn btn-ghost" disabled={scanning} onClick={() => void openCamera()}>
              <Camera size={18} />
              Tomar foto
            </button>
            <button className="btn btn-ghost" disabled={scanning} onClick={openGalleryOrFiles}>
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
              Escuchando… di por ejemplo:{' '}
              {isEmpresa
                ? '“Gasto de empresa 80000 en proveedor”'
                : '“Gasté 25000 en gasolina personal”'}
            </div>
          )}
          {scanning && (
            <div className="voice-status">
              <Loader2 size={16} className="spin" />
              Leyendo factura… {scanPct}%
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
            <h3>{isEmpresa ? 'Resumen de empresa' : 'Resumen personal'}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              Ingresos menos gastos = resultado de esta sección. Los préstamos se llevan aparte como
              dinero por recuperar.
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
            <h3>Movimientos · {isEmpresa ? 'Empresa' : 'Personales'}</h3>
            <div className="entry-list" style={{ marginTop: '0.75rem' }}>
              {ledgerEntries.length === 0 && (
                <p className="empty">
                  Todavía no hay movimientos en esta sección. Dicta uno o agrégalo a mano.
                </p>
              )}
              {ledgerEntries.map((e) => (
                <div key={e.id} className="entry">
                  <div>
                    <strong>{e.note}</strong>
                    <div className="meta">
                      {e.kind === 'expense' && 'Gasto'}
                      {e.kind === 'income' &&
                        `Ingreso · ${paymentMethodLabel(e.paymentMethod)}`}
                      {e.kind === 'loan' && `Préstamo a ${e.person}`}
                      {' · '}
                      {e.category}
                      {' · '}
                      {e.date}
                    </div>
                    {e.photoDataUrl?.startsWith('data:image') && (
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

      <details className="panel backup-panel backup-collapsed">
        <summary>Respaldo de datos (guardar / cargar archivo)</summary>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          Úsalo solo cuando quieras pasar o recuperar tus movimientos con un archivo.
        </p>
        <div className="controls" style={{ marginTop: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => void saveBackupFile()}>
            <Download size={18} />
            Guardar archivo de respaldo
          </button>
          <button className="btn btn-ghost" onClick={() => importFileRef.current?.click()}>
            <Upload size={18} />
            Cargar archivo de respaldo
          </button>
          <input
            ref={importFileRef}
            type="file"
            accept="application/json,.json,text/plain,.txt"
            hidden
            onChange={(e) => {
              onImportFile(e.target.files?.[0]);
              e.currentTarget.value = '';
            }}
          />
        </div>
        <div className="field" style={{ marginTop: '0.75rem' }}>
          <label>Pegar texto (opcional)</label>
          <textarea
            rows={3}
            value={backupText}
            onChange={(e) => setBackupText(e.target.value)}
            placeholder="Solo si pegaste el JSON a mano"
          />
        </div>
        <button className="btn btn-ghost" style={{ marginTop: '0.6rem' }} onClick={importFromTextBox}>
          Importar texto pegado
        </button>
        {message && <p className="muted" style={{ marginTop: '0.65rem' }}>{message}</p>}
      </details>
    </div>
  );
}
