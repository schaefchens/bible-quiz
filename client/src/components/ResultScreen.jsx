import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudio } from '../context/AudioContext.jsx';
import BibleRefLink from './BibleRefLink.jsx';

// Animated cross SVG for result screen
function ResultCross({ won }) {
  return (
    <svg
      viewBox="0 0 80 100"
      className={`w-20 h-24 mx-auto ${won ? 'drop-shadow-[0_0_20px_rgba(212,175,55,0.8)]' : 'drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]'}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0c040" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#b8960c" />
        </linearGradient>
      </defs>
      <rect x="34" y="5" width="12" height="90" rx="3" fill="url(#rcGrad)" />
      <rect x="10" y="28" width="60" height="12" rx="3" fill="url(#rcGrad)" />
    </svg>
  );
}

// Sheep parade: a dozen sheep run from right to left along the bottom
function SheepParade() {
  const sheep = useMemo(() => Array.from({ length: 12 }, (_, i) => ({
    id: i,
    delay: i * 0.55 + Math.random() * 0.25,
    duration: 4.2 + Math.random() * 2.8,
    bottom: Math.random() * 6,
    size: 1.5 + Math.random() * 0.7,
    bounceOffset: Math.random() * 0.35,
    bounceDuration: 0.38 + Math.random() * 0.15,
  })), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40" aria-hidden="true">
      {sheep.map((s) => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            bottom: `${s.bottom}px`,
            animation: `sheep-walk ${s.duration}s linear ${s.delay}s both`,
          }}
        >
          <div style={{ transform: 'scaleX(-1)' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: `${s.size}rem`,
                animation: `sheep-bounce ${s.bounceDuration}s ease-in-out ${s.bounceOffset}s infinite`,
              }}
            >
              🐑
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Confetti component
function Confetti() {
  const colors = ['#d4af37', '#f0c040', '#f59e0b', '#22c55e', '#60a5fa', '#f472b6'];
  const pieces = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}vw`,
    top: `${-10 - Math.random() * 20}px`,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: `${6 + Math.random() * 8}px`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
  })), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden="true">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            top: p.top,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            borderRadius: p.borderRadius,
          }}
        />
      ))}
    </div>
  );
}

function formatAmount(amount, language) {
  return amount.toLocaleString(language === 'de' ? 'de-DE' : 'en-US');
}

export default function ResultScreen({ result, language, onPlayAgain }) {
  const { t } = useTranslation();
  const { stopAll, playVictory } = useAudio();
  const { finalAmount, wonGame, walkedAway, lastCorrectQuestion, wrongAnswer } = result;

  useEffect(() => {
    // Music fades out; play victory fanfare after a short pause if won
    stopAll(1.2);
    if (wonGame) {
      const id = setTimeout(() => playVictory(), 600);
      return () => clearTimeout(id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const won = wonGame;
  const walked = walkedAway;

  function getTitle() {
    if (won) return t('result.title_won');
    if (walked) return t('result.walked_away');
    if (finalAmount > 0) return t('result.title_partial');
    return t('result.title_failed');
  }

  async function handleShare() {
    const text = `${t('app.title')}\n${t('result.score')}: ${formatAmount(finalAmount, language)} ${t('result.talents')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('app.title'), text });
      } catch {
        // cancelled or not supported
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 landscape:py-4 overflow-hidden">
      {won && <Confetti />}
      {won && <SheepParade />}

      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center animate-scale-up">
        {/* Cross */}
        <div className="mb-6 landscape:hidden">
          <ResultCross won={won} />
        </div>

        {/* Title */}
        <h1 className="font-display text-2xl sm:text-3xl font-black text-gold-gradient mb-6 landscape:mb-2 leading-tight">
          {getTitle()}
        </h1>

        {/* Prize box */}
        <div className="w-full max-w-sm rounded-2xl border-2 border-brand-gold/40 bg-brand-navy/80 p-8 landscape:p-4 shadow-2xl shadow-brand-gold/10 mb-6 landscape:mb-3">
          <p className="text-slate-400 text-sm mb-2 font-display tracking-wider uppercase">
            {t('result.score')}
          </p>
          <p className="font-display font-black text-4xl sm:text-5xl landscape:text-3xl text-gold-gradient leading-none mb-2">
            {formatAmount(finalAmount, language)}
          </p>
          <p className="text-brand-gold/70 text-sm font-display tracking-wide">
            {t('result.talents')}
          </p>
        </div>

        {/* Wrong answer info */}
        {!won && !walked && wrongAnswer && (
          <div className="w-full max-w-sm rounded-lg border border-red-500/30 bg-red-900/10 px-5 py-4 mb-6 text-sm">
            <p className="text-red-300 mb-1">{t('result.wrong')}</p>
            <p className="text-slate-400 mb-1">
              {t('result.correct_answer')}{' '}
              <span className="text-green-400 font-semibold">{wrongAnswer.correctText}</span>
            </p>
            {wrongAnswer.reference && (
              <p className="text-brand-gold/70 text-xs mt-2">
                {t('result.read_more')}{' '}
                <span className="font-semibold text-brand-gold/90">
                  <BibleRefLink reference={wrongAnswer.reference} lang={language} className="text-brand-gold/90" />
                </span>
              </p>
            )}
          </div>
        )}

        {/* Donation prompt – shown only on full win */}
        {won && (
          <div className="w-full max-w-sm rounded-2xl border border-brand-gold/30 bg-brand-gold/5 px-6 py-5 mb-6 text-center">
            <p className="text-brand-gold font-display font-semibold text-sm mb-1">
              {t('result.donation_title')}
            </p>
            <p className="text-slate-400 text-xs leading-relaxed mb-4">
              {t('result.donation_text')}
            </p>
            <a
              href="https://www.opendoors.de/aktiv-werden/spenden/jetzt-spenden#onlinespende"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block py-2 px-5 rounded-lg font-display font-bold text-sm bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold text-brand-dark shadow-md shadow-brand-gold/20 hover:shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              {t('result.donation_cta')}
            </a>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-6 rounded-xl font-display font-bold text-base bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold text-brand-dark shadow-lg shadow-brand-gold/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            {t('result.play_again')}
          </button>
          <button
            onClick={handleShare}
            className="py-3 px-5 rounded-xl font-display font-semibold text-base border-2 border-brand-gold/50 text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 hover:border-brand-gold transition-all hover:scale-105 active:scale-95"
          >
            {t('result.share')}
          </button>
        </div>

        {/* Verse */}
        <p className="mt-10 landscape:hidden text-brand-gold/40 text-xs italic font-display max-w-xs">
          {t('verse')}
        </p>
      </div>
    </div>
  );
}
