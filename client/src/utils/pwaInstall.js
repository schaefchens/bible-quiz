// ─────────────────────────────────────────────────────────────────────────────
// PWA install plumbing for the ?install=1 deep link.
//
// Everything in here is a timing problem:
//
//  1. Chromium fires `beforeinstallprompt` once, whenever it decides the app is
//     installable — which can be before React has mounted. The inline <script>
//     in index.html does the catching, because it is the only code guaranteed
//     to run while the document is still parsing; this module adopts whatever
//     it parked and keeps listening for later ones (Chrome re-fires the event
//     when installability is re-evaluated, e.g. once the service worker
//     registers on a first visit).
//
//  2. ...or seconds after React has mounted. Consumers subscribe through
//     onInstallAvailable() instead of polling, and set their own deadline.
//
//  3. The ?install=1 intent has to survive the reload the service worker
//     triggers on a first visit (skipWaiting + clientsClaim → controllerchange
//     → location.reload() in main.jsx). It is latched into sessionStorage at
//     import time — before React renders, before App.jsx tidies the URL away.
// ─────────────────────────────────────────────────────────────────────────────

const INSTALL_FLAG_KEY = 'biblionaire_install_requested';

// ── ?install=1 latch ─────────────────────────────────────────────────────────

function latchInstallRequest() {
  let requested = false;
  try {
    requested = new URLSearchParams(window.location.search).get('install') === '1';
  } catch { /* malformed query string → treat as not requested */ }
  try {
    if (requested) sessionStorage.setItem(INSTALL_FLAG_KEY, '1');
    else requested = sessionStorage.getItem(INSTALL_FLAG_KEY) === '1';
  } catch { /* no sessionStorage (private mode) → live without the latch */ }
  return requested;
}

// Evaluated exactly once, at import time. main.jsx imports this module before
// createRoot(), so this runs before any component can rewrite the URL.
export const INSTALL_REQUESTED = latchInstallRequest();

// Called when the flow ends — installed, declined, or card closed — so that a
// later reload in the same tab doesn't re-open it.
export function clearInstallRequest() {
  try { sessionStorage.removeItem(INSTALL_FLAG_KEY); } catch { /* see above */ }
}

// ── beforeinstallprompt ──────────────────────────────────────────────────────

let installEvent = window.__installPromptEvent || null; // adopt the inline catch
const availableListeners = new Set();
const installedListeners = new Set();

function setInstallEvent(evt) {
  installEvent = evt;
  window.__installPromptEvent = evt; // keeps the console handle honest
  if (evt) availableListeners.forEach((cb) => cb(evt)); // clearing is not an event
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // same reason as the inline script; harmless twice
  setInstallEvent(e);
});

window.addEventListener('appinstalled', () => {
  setInstallEvent(null); // spent; Chrome sends a fresh one if it ever applies again
  clearInstallRequest();
  installedListeners.forEach((cb) => cb());
});

export function getInstallEvent() {
  return installEvent;
}

// Subscribe to "the browser will let us open the native install dialog".
// Fires immediately if the event is already parked. Returns an unsubscribe fn.
export function onInstallAvailable(cb) {
  availableListeners.add(cb);
  if (installEvent) cb(installEvent);
  return () => availableListeners.delete(cb);
}

export function onAppInstalled(cb) {
  installedListeners.add(cb);
  return () => installedListeners.delete(cb);
}

let pending = null; // the in-flight native dialog, shared by every caller

// Open the native install dialog.
// Resolves 'accepted' | 'dismissed' | null   (null = the browser refused us).
//
// MUST be called on the user-gesture call stack — don't await anything before
// it (same rule as initAudio() in App.jsx). The async body below runs
// synchronously as far as evt.prompt(), so the gesture is still warm when it
// lands.
export function promptInstall() {
  if (pending) return pending; // StrictMode remount, or an impatient double tap
  const evt = installEvent;
  if (!evt) return Promise.resolve(null);

  pending = (async () => {
    try {
      // Newer Chrome resolves prompt() with the choice; older builds resolve
      // undefined and only populate evt.userChoice. Support both.
      const result = await evt.prompt();
      const choice = result && result.outcome ? result : await evt.userChoice;
      // Single-use: a second prompt() on the same event throws InvalidStateError.
      if (installEvent === evt) setInstallEvent(null);
      return choice?.outcome || null;
    } catch (err) {
      // NotAllowedError   → "prompt() must be called with a user gesture". The
      //                     event itself is untouched and the very same object
      //                     works again from a click handler, so we keep it.
      // InvalidStateError → already consumed. Drop it; only instructions left.
      if (err?.name === 'InvalidStateError' && installEvent === evt) setInstallEvent(null);
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

// ── Platform ─────────────────────────────────────────────────────────────────

// Deliberately dumb UA sniffing, contained to this one function. Its only job
// is picking which set of written instructions to show when the browser has no
// install API at all — nothing else in the app branches on it.
export function detectPlatform() {
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports a desktop Mac UA; the touch points give it away.
  const isIOS = /iPad|iPhone|iPod/.test(ua)
    || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios'; // every iOS browser is WebKit underneath
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox';
  if (/Safari\//.test(ua) && !/Chrome|Chromium|Edg\/|OPR\//.test(ua)) return 'safari';
  return 'other'; // Chromium and friends
}

// Already running as an installed app? Then ?install=1 has nothing to offer.
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)')?.matches === true
    || window.navigator.standalone === true          // iOS Safari, home-screen launch
    || document.referrer.startsWith('android-app://'); // TWA wrapper
}
