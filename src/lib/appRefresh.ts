/** Fuerza descarga de la versión nueva (útil en la app de pantalla de inicio). */
export async function refreshApp() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            await reg.update();
          } catch {
            // ignore
          }
          try {
            await reg.unregister();
          } catch {
            // ignore
          }
        }),
      );
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    const url = new URL(window.location.href);
    url.searchParams.set('refresh', String(Date.now()));
    window.location.replace(url.toString());
  }
}
