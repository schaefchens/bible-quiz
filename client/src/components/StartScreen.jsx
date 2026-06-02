import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_BACKEND_URL } from '../App.jsx';
import QuizLibraryModal from './QuizLibraryModal.jsx';
import HintDialog, { shouldShowHints } from './HintDialog.jsx';

// Inline SVG: elegant glowing cross with dove
function CrossDoveLogo() {
  return (
    <svg
      viewBox="0 0 120 140"
      className="w-28 h-32 mx-auto drop-shadow-2xl"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="crossGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0c040" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="crossGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0c040" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b8960c" />
        </linearGradient>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Glow background */}
      <ellipse cx="60" cy="75" rx="50" ry="60" fill="url(#crossGlow)" />
      {/* Cross vertical bar */}
      <rect
        x="52"
        y="20"
        width="16"
        height="100"
        rx="3"
        fill="url(#crossGrad)"
        filter="url(#goldGlow)"
      />
      {/* Cross horizontal bar */}
      <rect
        x="22"
        y="45"
        width="76"
        height="16"
        rx="3"
        fill="url(#crossGrad)"
        filter="url(#goldGlow)"
      />
      {/* Dove - simplified shape */}
      <g transform="translate(68, 18) scale(0.8)" filter="url(#goldGlow)">
        {/* Dove body */}
        <ellipse cx="12" cy="8" rx="10" ry="6" fill="#f0c040" opacity="0.9" />
        {/* Head */}
        <circle cx="21" cy="5" r="4" fill="#f0c040" opacity="0.9" />
        {/* Wing */}
        <path
          d="M 8 4 Q 14 -4 22 2 Q 14 6 8 8 Z"
          fill="#d4af37"
          opacity="0.8"
        />
        {/* Tail */}
        <path
          d="M 2 8 Q -2 4 0 10 Q 4 14 8 12 Z"
          fill="#d4af37"
          opacity="0.8"
        />
        {/* Eye */}
        <circle cx="22" cy="4" r="1" fill="#0a0f1e" />
      </g>
    </svg>
  );
}

// Animated star field (CSS only via inline styles)
function StarField() {
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 2.5 + 0.5}px`,
    delay: `${Math.random() * 4}s`,
    duration: `${Math.random() * 3 + 2}s`,
  })), []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function StartScreen({ onStart, language, onLanguageChange, loading, error, backendUrl, onBackendUrlChange, totalWinnings = 0, selectedQuiz, onQuizSelect, registryUrl }) {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const [showQuizLibrary, setShowQuizLibrary] = useState(false);
  const [showHints, setShowHints] = useState(shouldShowHints);
  const [showImprint, setShowImprint] = useState(false);
  const [showDeveloperDetails, setShowDeveloperDetails] = useState(false);
  const [draftUrl, setDraftUrl] = useState(backendUrl || DEFAULT_BACKEND_URL);
  const [updateState, setUpdateState] = useState('idle'); // 'idle' | 'checking' | 'uptodate'

  async function handleCheckUpdate() {
    setUpdateState('checking');
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) await reg.update();
    } catch (_) {}
    // If a new SW was found the page reloads via controllerchange before this fires.
    // If nothing changed, show "up to date".
    setTimeout(() => {
      setUpdateState('uptodate');
      setTimeout(() => setUpdateState('idle'), 2500);
    }, 2000);
  }

  function openSettings() {
    setDraftUrl(backendUrl || DEFAULT_BACKEND_URL);
    setShowSettings(true);
  }

  function applyDraft(value) {
    const v = value.trim() || DEFAULT_BACKEND_URL;
    setDraftUrl(v);
    onBackendUrlChange(v);
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 landscape:py-3 overflow-hidden">
      <StarField />

      {/* Language toggle – top right */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => onLanguageChange('de')}
          className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
            language === 'de'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-transparent text-brand-gold border border-brand-gold/40 hover:border-brand-gold'
          }`}
          aria-label="Deutsch"
        >
          🇩🇪
        </button>
        <button
          onClick={() => onLanguageChange('en')}
          className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
            language === 'en'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-transparent text-brand-gold border border-brand-gold/40 hover:border-brand-gold'
          }`}
          aria-label="English"
        >
          🇬🇧
        </button>
      </div>

      {/* Main card */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-6 landscape:hidden">
          <CrossDoveLogo />
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-gold-gradient leading-tight mb-3">
          {t('app.title')}
        </h1>

        {/* Subtitle */}
        <p className="text-brand-gold/70 font-display text-sm sm:text-base tracking-widest uppercase mb-2">
          {t('app.subtitle')}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6 landscape:my-2 w-full max-w-sm">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-brand-gold/40" />
          <span className="text-brand-gold text-lg">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-brand-gold/40" />
        </div>

        {/* Welcome text */}
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-3">
          {t('start.welcome')}
        </h2>
        <p className="text-slate-400 text-sm sm:text-base mb-6 landscape:mb-3 leading-relaxed max-w-sm">
          {t('start.description')}
        </p>

        {/* Accumulated winnings */}
        {totalWinnings > 0 && (
          <div className="w-full max-w-xs mb-6 landscape:mb-3 rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-5 py-4 text-center">
            <p className="text-brand-gold/55 text-xs font-display uppercase tracking-widest mb-1">
              {t('start.total_winnings')}
            </p>
            <p className="font-display font-black text-2xl sm:text-3xl text-gold-gradient leading-none">
              {totalWinnings.toLocaleString(language === 'de' ? 'de-DE' : 'en-US')}
            </p>
            <p className="text-brand-gold/45 text-xs mt-1 font-display tracking-wide">{t('currency')}</p>
            {selectedQuiz && (
              <p className="text-brand-gold/35 text-xs mt-2 font-display truncate">
                {selectedQuiz.name}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-500/40 text-red-300 text-sm w-full max-w-sm">
            {t('start.error')}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={onStart}
          disabled={loading}
          className="
            relative w-full max-w-xs py-4 px-8 rounded-xl
            font-display font-bold text-lg tracking-wide
            bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold
            text-brand-dark
            shadow-lg shadow-brand-gold/30
            hover:shadow-xl hover:shadow-brand-gold/50
            hover:scale-105 active:scale-95
            transition-all duration-200
            disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100
            no-select
          "
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {t('start.loading')}
            </span>
          ) : totalWinnings > 0 ? (
            <span className="flex flex-col items-center gap-0.5 leading-tight">
              <span>{t('start.button')}</span>
              <span className="text-xs font-normal opacity-60">
                {t('start.entry_fee', { amount: Math.round(totalWinnings * 0.1).toLocaleString(language === 'de' ? 'de-DE' : 'en-US') })}
              </span>
            </span>
          ) : (
            t('start.button')
          )}
        </button>

        {error && (
          <button
            onClick={onStart}
            className="mt-3 text-brand-gold/70 text-sm hover:text-brand-gold underline transition-colors"
          >
            {t('start.retry')}
          </button>
        )}

        {/* Choose Quiz — hangs below the start button */}
        <div className="flex flex-col items-center">
          <div className="w-px h-3 bg-brand-gold/25" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowQuizLibrary(true)}
              className="
                px-5 py-1.5 rounded-lg
                font-display text-xs tracking-wide
                border border-brand-gold/25 text-brand-gold/50
                hover:border-brand-gold/45 hover:text-brand-gold/80
                active:scale-95 transition-all duration-200
                no-select whitespace-nowrap
              "
            >
              {selectedQuiz ? t('quiz.active_short', { name: selectedQuiz.name }) : t('quiz.choose_quiz')}
            </button>
            {selectedQuiz && (
              <button
                onClick={() => onQuizSelect(null)}
                className="p-1 text-brand-gold/30 hover:text-brand-gold/70 transition-colors no-select"
                title={t('quiz.use_default')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Verse */}
        <div className="mt-12 landscape:hidden px-6 py-4 rounded-lg border border-brand-gold/20 bg-brand-gold/5 max-w-sm">
          <p className="text-brand-gold/60 text-xs sm:text-sm italic leading-relaxed font-display">
            {t('verse')}
          </p>
        </div>

        {/* Attribution */}
        <a
          href="https://biblionaer.de/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 landscape:mt-3 w-full max-w-sm flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-gold/25 bg-brand-gold/5 hover:bg-brand-gold/10 hover:border-brand-gold/50 transition-all group"
        >
          <span className="text-brand-gold/60 text-xl group-hover:scale-110 transition-transform select-none">✦</span>
          <span className="flex-1 text-left">
            <span className="block text-slate-400 text-xs leading-snug group-hover:text-slate-300 transition-colors">
              {t('start.inspired_by')}
            </span>
            <span className="block text-brand-gold/80 text-sm font-display font-semibold leading-snug group-hover:text-brand-gold transition-colors">
              {t('start.inspired_by_name')}
            </span>
          </span>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-gold/40 group-hover:text-brand-gold/70 flex-shrink-0 transition-colors">
            <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
          </svg>
        </a>

        {/* Backend settings toggle + update check */}
        <div className="mt-5 flex items-center gap-4 flex-wrap justify-center">
          <button
            onClick={showSettings ? () => setShowSettings(false) : openSettings}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-400 text-xs transition-colors"
            aria-expanded={showSettings}
          >
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            {t('start.settings_link')}
          </button>

          <button
            onClick={handleCheckUpdate}
            disabled={updateState !== 'idle'}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-400 text-xs transition-colors disabled:opacity-50"
          >
            <svg
              viewBox="0 0 20 20"
              className={`w-3.5 h-3.5 flex-shrink-0 ${updateState === 'checking' ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M16 16v-5h-5M4 9a7 7 0 0113.5-2M16 11a7 7 0 01-13.5 2" />
            </svg>
            {t(`start.${updateState === 'checking' ? 'update_checking' : updateState === 'uptodate' ? 'update_ok' : 'check_update'}`)}
          </button>

          <button
            onClick={() => setShowImprint(true)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-400 text-xs transition-colors"
          >
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {t('start.imprint')}
          </button>

          {/* eslint-disable-next-line no-undef */}
          <span className="text-slate-700 text-xs font-mono" title="Build revision">{__BUILD_REV__}</span>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="mt-3 w-full max-w-sm bg-brand-navy/70 border border-brand-gold/20 rounded-xl p-4 text-left animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <span className="text-brand-gold/80 text-xs font-display uppercase tracking-wider">
                {t('start.settings_title')}
              </span>
              <button
                onClick={() => setShowSettings(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors text-base leading-none"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <label className="text-slate-400 text-xs block mb-1">
              {t('start.settings_url_label')}
            </label>
            <input
              type="url"
              className="w-full bg-brand-dark/80 border border-brand-gold/25 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-brand-gold/55 transition-colors"
              value={draftUrl}
              onChange={(e) => setDraftUrl(e.target.value)}
              onBlur={(e) => applyDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { applyDraft(draftUrl); e.target.blur(); } }}
              placeholder={DEFAULT_BACKEND_URL}
              spellCheck={false}
              autoComplete="off"
            />

            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              {t('start.settings_hint')}
            </p>

            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-500 font-display mb-0.5 uppercase tracking-wide" style={{ fontSize: '0.65rem' }}>
                {t('start.settings_examples')}
              </p>
              {[
                'questions_{lang}.json',
                '/questions.json?lang={lang}',
                '/api/quiz?lang={lang}',
                'https://yoursite.de/quiz/questions.php?lang={lang}',
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setDraftUrl(ex); onBackendUrlChange(ex); }}
                  className="block w-full text-left text-xs font-mono text-slate-500 hover:text-brand-gold/70 transition-colors truncate"
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-brand-gold/15">
              <button
                onClick={() => {
                  const url = `questions_${language}.json`;
                  fetch(url)
                    .then((r) => r.blob())
                    .then((blob) => {
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `biblionaire_questions_${language}.json`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    });
                }}
                className="flex items-center gap-1.5 text-brand-gold/50 hover:text-brand-gold/80 text-xs transition-colors"
              >
                <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                {t('start.download_questions')}
              </button>
            </div>

            {draftUrl !== DEFAULT_BACKEND_URL && (
              <button
                onClick={() => { setDraftUrl(DEFAULT_BACKEND_URL); onBackendUrlChange(DEFAULT_BACKEND_URL); }}
                className="mt-3 text-xs text-brand-gold/40 hover:text-brand-gold/70 underline transition-colors"
              >
                {t('start.settings_reset')}
              </button>
            )}
          </div>
        )}
      </div>

      {showHints && (
        <HintDialog onClose={() => setShowHints(false)} />
      )}

      {showImprint && (
        <div className="modal-overlay" onClick={() => setShowImprint(false)}>
          <div className="modal-card max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-black text-brand-gold text-xl tracking-wide">
                {t('start.imprint')}
              </h2>
              <button
                onClick={() => setShowImprint(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-5 text-sm max-h-[65vh] overflow-y-auto pr-1">
              {/* Legal notice § 5 TMG */}
              <div>
                <p className="text-brand-gold/60 text-xs font-display uppercase tracking-wider mb-2">
                  {t('imprint.legal_title')}
                </p>
                <p className="text-slate-400 italic leading-relaxed border-l-2 border-brand-gold/30 pl-3 mb-3">
                  {t('imprint.grace_line')}
                </p>
                <p className="text-brand-gold/50 text-xs uppercase tracking-wide mb-0.5">{t('imprint.made_by_label')}</p>
                {showDeveloperDetails ? (
                  <p className="text-slate-200 font-semibold">Christoph Scharf</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeveloperDetails(true)}
                    className="text-slate-200 font-semibold italic hover:text-brand-gold transition-colors cursor-pointer text-left"
                  >
                    {t('imprint.servant_label')}
                  </button>
                )}
                {showDeveloperDetails && (
                  <>
                    <p className="text-brand-gold/50 text-xs uppercase tracking-wide mt-2 mb-0.5">{t('imprint.address_label')}</p>
                    <p className="text-slate-300">
                      Mühltorstr. 1<br />
                      67245 Lambsheim<br />
                      Deutschland
                    </p>
                    <p className="text-brand-gold/50 text-xs uppercase tracking-wide mt-2 mb-0.5">{t('imprint.contact_label')}</p>
                    <a
                      href="mailto:christoph.scharf+biblequiz@scharfmedia.de"
                      className="text-brand-gold/70 hover:text-brand-gold transition-colors"
                    >
                      christoph.scharf+biblequiz@scharfmedia.de
                    </a>
                  </>
                )}
              </div>

              {/* External links liability */}
              <div>
                <p className="text-brand-gold/60 text-xs font-display uppercase tracking-wider mb-1">
                  {t('imprint.links_title')}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {t('imprint.links_text')}
                </p>
              </div>

              {/* Copyright */}
              {/* Disclaimer */}
              <div>
                <p className="text-brand-gold/60 text-xs font-display uppercase tracking-wider mb-1">
                  {t('imprint.disclaimer_title')}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {t('imprint.disclaimer_text')}
                </p>
              </div>

              <div>
                <p className="text-brand-gold/60 text-xs font-display uppercase tracking-wider mb-1">
                  {t('imprint.copyright_title')}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {t('imprint.copyright_text')}
                </p>
              </div>

              {/* Privacy */}
              <div>
                <p className="text-brand-gold/60 text-xs font-display uppercase tracking-wider mb-1">
                  {t('imprint.privacy_title')}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  {t('imprint.privacy_text')}
                </p>
              </div>

              {/* Dispute resolution */}
              <div>
                <p className="text-brand-gold/60 text-xs font-display uppercase tracking-wider mb-1">
                  {t('imprint.dispute_title')}
                </p>
                <p className="text-slate-400 leading-relaxed text-xs">
                  {t('imprint.dispute_text')}
                </p>
              </div>

              {/* Bibleserver */}
              <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-4">
                <p className="text-brand-gold/70 text-xs font-display uppercase tracking-wider mb-2">
                  {t('imprint.bibleserver_label')}
                </p>
                <p className="text-slate-300 leading-relaxed mb-3">
                  {t('imprint.bibleserver_text')}
                </p>
                <a
                  href="https://www.bibleserver.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-gold font-semibold hover:text-brand-gold-light transition-colors"
                >
                  bibleserver.com
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>

              {/* Inspiration */}
              <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-4">
                <p className="text-brand-gold/70 text-xs font-display uppercase tracking-wider mb-2">
                  {t('imprint.inspired_label')}
                </p>
                <p className="text-slate-300 leading-relaxed mb-3">
                  {t('imprint.inspired_text')}
                </p>
                <a
                  href="https://biblionaer.de/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-gold font-semibold hover:text-brand-gold-light transition-colors"
                >
                  biblionaer.de
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>

              {/* Concept: Who Wants to Be a Millionaire */}
              <div className="rounded-xl border border-brand-gold/20 bg-brand-gold/5 p-4">
                <p className="text-brand-gold/70 text-xs font-display uppercase tracking-wider mb-2">
                  {t('imprint.wwm_label')}
                </p>
                <p className="text-slate-300 leading-relaxed mb-3">
                  {t('imprint.wwm_text')}
                </p>
                <a
                  href={t('imprint.wwm_url')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-gold font-semibold hover:text-brand-gold-light transition-colors"
                >
                  {t('imprint.wwm_link_label')}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path fillRule="evenodd" d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowImprint(false)}
              className="mt-6 w-full py-2.5 rounded-lg bg-brand-gold/20 border border-brand-gold/50 text-brand-gold font-display font-bold tracking-widest hover:bg-brand-gold/35 transition-colors text-sm"
            >
              {t('imprint.close')}
            </button>
          </div>
        </div>
      )}

      {showQuizLibrary && (
        <QuizLibraryModal
          onClose={() => setShowQuizLibrary(false)}
          onSelect={(quiz) => { onQuizSelect(quiz); setShowQuizLibrary(false); }}
          selectedQuizId={selectedQuiz?.id ?? null}
          registryUrl={registryUrl}
          language={language}
        />
      )}
    </div>
  );
}
