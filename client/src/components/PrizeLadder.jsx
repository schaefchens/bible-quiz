import React from 'react';
import { useTranslation } from 'react-i18next';
import { PRIZE_AMOUNTS } from '../constants.js';
const SAFE_HAVENS = [5, 10];

export default function PrizeLadder({ currentQuestion, className = '' }) {
  const { t } = useTranslation();

  // currentQuestion is 0-based index of the current question (0-14)
  // Level 1 = question index 0, Level 15 = question index 14
  // prize index = currentQuestion + 1 when answering

  return (
    <div className={`flex flex-col ${className}`}>
      <h3 className="text-brand-gold/70 text-xs font-display tracking-widest uppercase mb-3 text-center">
        {t('currency')}
      </h3>
      <div className="flex flex-col-reverse gap-0.5">
        {PRIZE_AMOUNTS.slice(1).map((amount, idx) => {
          const level = idx + 1; // 1-15
          const questionIndex = idx; // 0-14
          const isActive = currentQuestion === questionIndex;
          const isWon = currentQuestion > questionIndex;
          const isSafeHaven = SAFE_HAVENS.includes(level);
          const prizeKey = String(level);
          const displayAmount = t(`prize.${prizeKey}`);

          let itemClass = 'prize-item';
          if (isActive) itemClass += ' active';
          else if (isWon) itemClass += ' won';
          if (isSafeHaven) itemClass += ' safe-haven';

          return (
            <div key={level} className={itemClass}>
              <span className={`font-display text-xs ${isActive ? 'text-brand-gold-light' : isWon ? 'text-slate-500' : 'text-slate-400'}`}>
                {level}
              </span>
              <div className="flex items-center gap-1">
                {isSafeHaven && (
                  <span
                    className={`text-xs ${isActive || isWon ? 'text-brand-gold' : 'text-brand-gold/40'}`}
                    title={t('game.safe_haven')}
                    aria-label={t('game.safe_haven')}
                  >
                    ★
                  </span>
                )}
                <span
                  className={`font-display font-semibold text-xs ${
                    isActive
                      ? 'text-brand-gold-light'
                      : isWon
                      ? 'text-slate-500'
                      : isSafeHaven
                      ? 'text-brand-gold/80'
                      : 'text-slate-300'
                  }`}
                >
                  {displayAmount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
