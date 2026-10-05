/** Reproductor de voz compatible con iPhone/Android y segundo plano. */

type SpeakHandlers = {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (message?: string) => void;
};

let keepAliveAudio: HTMLAudioElement | null = null;
let watchdogTimer: number | null = null;
let wakeLock: WakeLockSentinel | null = null;
let stopped = true;
let paused = false;
let removeVisibilityListeners: (() => void) | null = null;
let preferredVoice: SpeechSynthesisVoice | null = null;

const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

function clearVisibilityListeners() {
  removeVisibilityListeners?.();
  removeVisibilityListeners = null;
}

function ensureKeepAlive() {
  if (!keepAliveAudio) {
    keepAliveAudio = new Audio(SILENT_WAV);
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0.001;
    keepAliveAudio.preload = 'auto';
    keepAliveAudio.setAttribute('playsinline', 'true');
  }
  return keepAliveAudio;
}

function startKeepAliveSync() {
  try {
    const audio = ensureKeepAlive();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => undefined);
    }
  } catch {
    // ignore
  }
}

function stopKeepAlive() {
  if (!keepAliveAudio) return;
  try {
    keepAliveAudio.pause();
    keepAliveAudio.currentTime = 0;
  } catch {
    // ignore
  }
}

function requestWakeLockSync() {
  try {
    if ('wakeLock' in navigator) {
      void navigator.wakeLock.request('screen').then((lock) => {
        wakeLock = lock;
        lock.addEventListener('release', () => {
          wakeLock = null;
        });
      });
    }
  } catch {
    // ignore
  }
}

async function releaseWakeLock() {
  try {
    await wakeLock?.release();
  } catch {
    // ignore
  }
  wakeLock = null;
}

function clearWatchdog() {
  if (watchdogTimer != null) {
    window.clearInterval(watchdogTimer);
    watchdogTimer = null;
  }
}

function startWatchdog() {
  clearWatchdog();
  watchdogTimer = window.setInterval(() => {
    if (stopped || paused) return;
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  }, 5000);
}

/** Compatible con Safari (sin lookbehind). */
export function chunkTextForSpeech(text: string, maxLen = 160): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];

  const parts: string[] = [];
  let current = '';
  for (let i = 0; i < cleaned.length; i++) {
    current += cleaned[i];
    const ch = cleaned[i];
    const next = cleaned[i + 1];
    const endSentence = /[.!?…]/.test(ch) && (!next || /\s/.test(next));
    if (endSentence || current.length >= maxLen) {
      const piece = current.trim();
      if (piece) parts.push(piece);
      current = '';
      while (i + 1 < cleaned.length && /\s/.test(cleaned[i + 1])) i++;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length ? parts : [cleaned];
}

function refreshVoices() {
  const voices = window.speechSynthesis.getVoices();
  preferredVoice =
    voices.find((v) => /es-CO/i.test(v.lang)) ||
    voices.find((v) => /es-MX/i.test(v.lang)) ||
    voices.find((v) => /es-ES/i.test(v.lang)) ||
    voices.find((v) => /^es\b/i.test(v.lang)) ||
    voices.find((v) => /spanish|español/i.test(v.name)) ||
    null;
  return preferredVoice;
}

function ensureVoices() {
  refreshVoices();
  if (!preferredVoice) {
    window.speechSynthesis.addEventListener('voiceschanged', () => {
      refreshVoices();
    });
  }
}

function setupMediaSession(
  title: string,
  handlers: { play: () => void; pause: () => void; stop: () => void },
) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Programa',
      album: 'Audio de práctica',
    });
    navigator.mediaSession.playbackState = 'playing';
    navigator.mediaSession.setActionHandler('play', handlers.play);
    navigator.mediaSession.setActionHandler('pause', handlers.pause);
    navigator.mediaSession.setActionHandler('stop', handlers.stop);
  } catch {
    // ignore
  }
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
    navigator.mediaSession.setActionHandler('stop', null);
  } catch {
    // ignore
  }
}

export function stopBackgroundSpeech() {
  stopped = true;
  paused = false;
  clearWatchdog();
  clearVisibilityListeners();
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
  stopKeepAlive();
  void releaseWakeLock();
  clearMediaSession();
}

export function pauseBackgroundSpeech() {
  if (stopped) return;
  paused = true;
  try {
    window.speechSynthesis.pause();
  } catch {
    // ignore
  }
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
}

export function resumeBackgroundSpeech() {
  if (stopped) return;
  paused = false;
  try {
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }
  startKeepAliveSync();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
}

/**
 * IMPORTANTE: debe llamarse de forma síncrona desde el click del usuario (iOS).
 * No usar await antes del primer speechSynthesis.speak().
 */
export function speakInBackground(
  text: string,
  opts: SpeakHandlers & { title?: string } = {},
) {
  if (!('speechSynthesis' in window)) {
    opts.onError?.('Este dispositivo no puede leer en voz alta.');
    opts.onEnd?.();
    return;
  }

  ensureVoices();
  stopBackgroundSpeech();
  stopped = false;
  paused = false;

  const chunks = chunkTextForSpeech(text);
  if (!chunks.length) {
    opts.onEnd?.();
    return;
  }

  // Mantener sesión de audio sin romper el gesto del usuario.
  startKeepAliveSync();
  requestWakeLockSync();
  opts.onStart?.();

  const onVisibility = () => {
    if (stopped || paused) return;
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  };

  clearVisibilityListeners();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onVisibility);
  window.addEventListener('pageshow', onVisibility);
  removeVisibilityListeners = () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onVisibility);
    window.removeEventListener('pageshow', onVisibility);
  };

  setupMediaSession(opts.title || 'Programa · Audio', {
    play: () => {
      resumeBackgroundSpeech();
      opts.onResume?.();
    },
    pause: () => {
      pauseBackgroundSpeech();
      opts.onPause?.();
    },
    stop: () => {
      stopBackgroundSpeech();
      opts.onEnd?.();
    },
  });

  startWatchdog();

  // Encolar TODO el texto de una vez (más fiable en iPhone que speak uno-por-uno con delays).
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }

  let remaining = chunks.length;
  let hadError = false;

  chunks.forEach((chunk, index) => {
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.lang = preferredVoice?.lang || 'es-ES';
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;
    if (preferredVoice) utter.voice = preferredVoice;

    utter.onend = () => {
      remaining -= 1;
      if (remaining <= 0 && !stopped) {
        stopBackgroundSpeech();
        opts.onEnd?.();
      }
    };

    utter.onerror = (event) => {
      // "interrupted" / "canceled" son normales al detener o reiniciar.
      const type = String((event as SpeechSynthesisErrorEvent).error || '');
      if (type === 'interrupted' || type === 'canceled') return;
      hadError = true;
      remaining -= 1;
      opts.onError?.(type);
      if (remaining <= 0 && !stopped) {
        stopBackgroundSpeech();
        opts.onEnd?.();
      }
    };

    // Primer speak síncrono en el mismo tick del click.
    window.speechSynthesis.speak(utter);

    // iOS a veces queda en paused; forzar resume tras el primero.
    if (index === 0) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }
  });

  // Si el motor no arrancó, avisar.
  window.setTimeout(() => {
    if (stopped) return;
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && !paused) {
      if (!hadError) opts.onError?.('No se pudo iniciar la voz. Toca de nuevo Escuchar.');
      stopBackgroundSpeech();
      opts.onEnd?.();
    }
  }, 1200);
}

export function isBackgroundSpeechPaused() {
  return paused;
}

export function isBackgroundSpeechActive() {
  return !stopped;
}

// Precargar voces apenas se importe el módulo.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  ensureVoices();
}
