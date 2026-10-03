export function backupFileName() {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
  return `programa-respaldo-${stamp}.json`;
}

export async function saveTextAsFile(text: string, filename = backupFileName()) {
  const file = new File([text], filename, { type: 'application/json' });

  // iPhone: compartir / guardar en Archivos
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({
        files: [file],
        title: 'Respaldo Programa',
        text: 'Archivo de respaldo de finanzas de Programa',
      });
      return 'shared' as const;
    } catch (err) {
      // Si el usuario cancela, no caemos a descarga silenciosa confusa.
      if (err instanceof Error && err.name === 'AbortError') return 'cancelled' as const;
    }
  }

  // Fallback: descarga del archivo
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return 'downloaded' as const;
}

export function normalizeBackupRaw(raw: string) {
  return raw
    .trim()
    .replace(/^\uFEFF/, '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}
