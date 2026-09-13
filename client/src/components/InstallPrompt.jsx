import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  INSTALL_REQUESTED,
  clearInstallRequest,
  detectPlatform,
  getInstallEvent,
  isStandalone,
  onAppInstalled,
  onInstallAvailable,
  promptInstall,
} from '../utils/pwaInstall.js';

// How long we wait for Chrome's beforeinstallprompt before falling back to
// written instructions. A warm visit fires it in well under a second; a cold
// first visit cannot fire it until registerSW.js has registered the service
// worker on window.load, which is what the extra seconds buy. Guessing low is
// cheap — we keep listening afterwards, and a late event upgrades the card.
const WAIT_FOR_EVENT_MS = 3000;

// Auto-prompting is a once-per-page-load affair. Module scope, not state, so
// that React 18 StrictMode's double mount in dev cannot fire it twice.
// (Same idiom as shownThisSession in HintDialog.jsx.)
let autoPromptAttempted = false;

export default function InstallPrompt() {
  const { t } = useTranslation();
  const [platform] = useState(detectPlatform);

  // 'idle'      nothing to do — no ?install=1, already installed, or finished
  // 'prompting' the native dialog owns the screen; we render nothing behind it
  // 'checking'  waiting for beforeinstallprompt
  // 'ready'     we have the event; one tap opens the real dialog
  // 'manual'    no install API (or it never showed) → written instructions
  // 'done'      installed
  const [state, setState] = useState(() => {
    if (!INSTALL_REQUESTED || isStandalone()) return 'idle';
    // Event already parked → the effect auto-prompts on the very first frame.
    // Starting in 'prompting' keeps the card from flashing up for that frame.
    return getInstallEvent() && !autoPromptAttempted ? 'prompting' : 'checking';
  });

  function close() {
    clearInstallRequest(); // don't re-open after a reload in this tab
    setState('idle');
  }

  useEffect(() => {
    if (state === 'idle') return undefined;

    let cancelled = false;
    let timedOut = false;

    async function handleAvailable() {
      // First event of this page load, and we haven't given up yet → try to
      // open the dialog straight away. Chrome will usually refuse (prompt()
      // wants a user gesture) and we fall through to the card with a real
      // button; browsers that allow it save the user a tap.
      if (!autoPromptAttempted && !timedOut) {
        autoPromptAttempted = true;
        setState('prompting');
        const outcome = await promptInstall();
        if (cancelled) return;
        if (outcome === 'accepted') { setState('done'); return; }
        if (outcome === 'dismissed') { close(); return; } // they said no — don't nag
      }
      if (!cancelled) setState('ready');
    }

    const stopAvailable = onInstallAvailable(handleAvailable); // fires now if parked
    const stopInstalled = onAppInstalled(() => { if (!cancelled) setState('done'); });
    const timer = setTimeout(() => {
      timedOut = true;
      // Only 'checking' gives up — a dialog that is already open stays open.
      if (!cancelled) setState((s) => (s === 'checking' ? 'manual' : s));
    }, WAIT_FOR_EVENT_MS);

    return () => {
      cancelled = true;
      stopAvailable();
      stopInstalled();
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No await before promptInstall(): the click's user activation has to still
  // be on the stack when evt.prompt() runs.
  function handleInstallClick() {
    setState('prompting');
    promptInstall().then((outcome) => {
      if (outcome === 'accepted') { setState('done'); return; }
      if (outcome === 'dismissed') { close(); return; }
      setState('manual'); // refused even with a gesture → instructions it is
    });
  }

  if (state === 'idle' || state === 'prompting') return null;

  const title = state === 'done'   ? t('install.success_title')
              : state === 'manual' ? t('install.manual_title')
              :                      t('install.title');

  return (
    <div className="modal-overlay" onClick={close}>
      <div
        className="modal-card max-w-sm w-full mx-4 text-center max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon — hidden on phones in landscape, where a 4xl emoji eats the
            whole card (same trade-off as the logo in StartScreen). */}
        <div className="flex justify-center mb-4 landscape:hidden">
          <span className="text-4xl select-none" aria-hidden="true">
            {state === 'done' ? '🎉' : '📲'}
          </span>
        </div>

        <h2 className="font-display text-brand-gold text-lg font-bold uppercase tracking-widest mb-4 landscape:mb-2">
          {title}
        </h2>

        {state === 'checking' && (
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 flex items-center justify-center gap-3">
            <svg className="animate-spin h-4 w-4 text-brand-gold shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t('install.checking')}
          </p>
        )}

        {state === 'ready' && (
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6">
            {t('install.ready_text')}
          </p>
        )}

        {state === 'manual' && (
          <>
            <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-4">
              {t(`install.manual_${platform}`)}
            </p>
            <p className="text-slate-500 text-xs leading-relaxed mb-6">
              {t('install.already_hint')}
            </p>
          </>
        )}

        {state === 'done' && (
          <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-6">
            {t('install.success_text')}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {state === 'ready' && (
            <button
              onClick={handleInstallClick}
              className="
                w-full py-3 px-4 rounded-lg
                bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold
                text-brand-dark font-display font-bold text-sm tracking-wide
                shadow-md shadow-brand-gold/25
                hover:shadow-lg hover:shadow-brand-gold/40 hover:scale-105
                active:scale-95 transition-all duration-150
              "
            >
              {t('install.button')}
            </button>
          )}

          <button
            onClick={close}
            className={
              state === 'ready' || state === 'checking'
                ? 'text-slate-600 hover:text-slate-400 text-xs transition-colors py-1'
                : `w-full py-3 px-4 rounded-lg
                   bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold
                   text-brand-dark font-display font-bold text-sm tracking-wide
                   shadow-md shadow-brand-gold/25
                   hover:shadow-lg hover:shadow-brand-gold/40 hover:scale-105
                   active:scale-95 transition-all duration-150`
            }
          >
            {state === 'done'   ? t('install.success_button')
              : state === 'manual' ? t('install.close')
              : t('install.later')}
          </button>
        </div>
      </div>
    </div>
  );
}
