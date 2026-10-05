/** WAV silencioso muy corto (en bucle) para mantener la sesión de audio activa. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

type SpeakHandlers = {
  onStart?: () => void;
  onEnd?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: () => void;
};

let keepAliveAudio: HTMLAudioElement | null = null;
let watchdogTimer: number | null = null;
let wakeLock: WakeLockSentinel | null = null;
let currentUtterances: SpeechSynthesisUtterance[] = [];
let stopped = true;
let paused = false;
let removeVisibilityListeners: (() => void) | null = null;

function clearVisibilityListeners() {
  removeVisibilityListeners?.();
  removeVisibilityListeners = null;
}

function ensureKeepAlive() {
  if (!keepAliveAudio) {
    keepAliveAudio = new Audio(SILENT_WAV);
    keepAliveAudio.loop = true;
    keepAliveAudio.volume = 0.01;
    keepAliveAudio.setAttribute('playsinline', 'true');
  }
  return keepAliveAudio;
}

async function startKeepAlive() {
  const audio = ensureKeepAlive();
  try {
    await audio.play();
  } catch {
    // El gesto del usuario al tocar Escuchar suele bastar en el siguiente intento.
  }
}

function stopKeepAlive() {
  if (keepAliveAudio) {
    keepAliveAudio.pause();
    keepAliveAudio.currentTime = 0;
  }
}

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
    }
  } catch {
    // En muchos teléfonos el bloqueo de pantalla sigue permitido; el audio puede continuar.
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
  // iOS/Safari a veces deja speechSynthesis “congelado”; reanudar periódicamente ayuda.
  watchdogTimer = window.setInterval(() => {
    if (stopped || paused) return;
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Hack conocido: mantener viva la cola de síntesis
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
    void startKeepAlive();
  }, 4000);
}

function chunkTextForSpeech(text: string, maxLen = 180): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  const sentences = cleaned.split(/(?<=[.!?…;:])\s+/);
  const chunks: string[] = [];
  let buf = '';
  for (const sentence of sentences) {
    if ((buf + ' ' + sentence).trim().length > maxLen && buf) {
      chunks.push(buf.trim());
      buf = sentence;
    } else {
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.length ? chunks : [cleaned.slice(0, maxLen)];
}

function setupMediaSession(title: string, handlers: {
  play: () => void;
  pause: () => void;
  stop: () => void;
}) {
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
    // Algunos navegadores no permiten todos los handlers.
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
  window.speechSynthesis.cancel();
  currentUtterances = [];
  stopKeepAlive();
  void releaseWakeLock();
  clearMediaSession();
}

export function pauseBackgroundSpeech() {
  if (stopped) return;
  paused = true;
  window.speechSynthesis.pause();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
}

export function resumeBackgroundSpeech() {
  if (stopped) return;
  paused = false;
  window.speechSynthesis.resume();
  void startKeepAlive();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
}

export async function speakInBackground(
  text: string,
  opts: SpeakHandlers & { title?: string } = {},
) {
  stopBackgroundSpeech();
  stopped = false;
  paused = false;

  const chunks = chunkTextForSpeech(text);
  if (!chunks.length) {
    opts.onEnd?.();
    return;
  }

  await startKeepAlive();
  await requestWakeLock();
  opts.onStart?.();

  const onVisibility = () => {
    if (stopped || paused) return;
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
    void startKeepAlive();
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

  let index = 0;
  const speakNext = () => {
    if (stopped) return;
    if (index >= chunks.length) {
      stopBackgroundSpeech();
      opts.onEnd?.();
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[index]);
    utter.lang = 'es-ES';
    utter.rate = 1;
    utter.onend = () => {
      index += 1;
      speakNext();
    };
    utter.onerror = () => {
      if (stopped) return;
      index += 1;
      speakNext();
      opts.onError?.();
    };
    currentUtterances.push(utter);
    window.speechSynthesis.speak(utter);
  };

  window.speechSynthesis.cancel();
  window.setTimeout(speakNext, 60);
}

export function isBackgroundSpeechPaused() {
  return paused;
}

export function isBackgroundSpeechActive() {
  return !stopped;
}
