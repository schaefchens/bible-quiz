import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const HIDE_TIPS_KEY = 'biblionaire_hide_tips';
let shownThisSession = false;
const TIP_KEYS = [
  'bible_open',
  'bible_joker',
  'entry_fee',
  'more_quizzes',
  'own_quizzes',
  'safe_haven',
  'walkaway',
  'fifty_fifty',
  'grace',
  'tiers',
  'fresh_questions',
  'per_quiz_winnings',
  'study_quiz',
  'study_card',
  'install',
];

function pickRandomIndex() {
  return Math.floor(Math.random() * TIP_KEYS.length);
}

export function shouldShowHints() {
  if (shownThisSession) return false;
  return localStorage.getItem(HIDE_TIPS_KEY) !== '1';
}

export default function HintDialog({ onClose }) {
  const { t } = useTranslation();
  const initialIndex = useMemo(pickRandomIndex, []);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => { shownThisSession = true; }, []);

  const tipKey = TIP_KEYS[index];

  function handleNext() {
    setIndex((i) => (i + 1) % TIP_KEYS.length);
  }

  function handleDisable() {
    localStorage.setItem(HIDE_TIPS_KEY, '1');
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card max-w-sm w-full mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <span className="text-4xl select-none" aria-hidden="true">💡</span>
        </div>

        {/* Title */}
        <h2 className="font-display text-brand-gold text-lg font-bold uppercase tracking-widest mb-1">
          {t('tips.title')}
        </h2>

        {/* Tip counter */}
        <p className="text-slate-600 text-xs font-display uppercase tracking-wider mb-5">
          {index + 1} / {TIP_KEYS.length}
        </p>

        {/* Tip text */}
        <p className="text-slate-200 text-sm sm:text-base leading-relaxed mb-8 min-h-[4rem]">
          {t(`tips.tip_${tipKey}`)}
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={handleNext}
              className="
                flex-1 py-2.5 px-4 rounded-lg
                border border-brand-gold/30 text-brand-gold/70
                font-display text-sm tracking-wide
                hover:border-brand-gold/60 hover:text-brand-gold
                active:scale-95 transition-all duration-150
              "
            >
              {t('tips.next')}
            </button>
            <button
              onClick={onClose}
              className="
                flex-1 py-2.5 px-4 rounded-lg
                bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold
                text-brand-dark font-display font-bold text-sm tracking-wide
                shadow-md shadow-brand-gold/25
                hover:shadow-lg hover:shadow-brand-gold/40 hover:scale-105
                active:scale-95 transition-all duration-150
              "
            >
              {t('tips.close')}
            </button>
          </div>

          <button
            onClick={handleDisable}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors py-1"
          >
            {t('tips.no_more')}
          </button>
        </div>
      </div>
    </div>
  );
}
