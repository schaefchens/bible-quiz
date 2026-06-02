import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LETTERS = ['A', 'B', 'C', 'D'];
const BAR_COLORS = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-orange-500',
];

export default function AudienceModal({ votes, onClose, removedOptions }) {
  const { t } = useTranslation();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={t('game.audience_title')}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="text-brand-gold text-xl">👥</span>
            <h2 className="font-display font-bold text-brand-gold text-lg">
              {t('game.audience_title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Bars */}
        <div className="flex flex-col gap-3">
          {votes.map((pct, i) => {
            if (removedOptions.includes(i)) return null;
            return (
              <div key={i} className="flex items-center gap-3">
                {/* Letter badge */}
                <span className="w-7 h-7 flex items-center justify-center rounded border border-brand-gold/40 bg-brand-gold/10 text-brand-gold text-xs font-bold flex-shrink-0">
                  {LETTERS[i]}
                </span>
                {/* Bar track */}
                <div className="flex-1 h-6 bg-brand-dark rounded overflow-hidden border border-white/5">
                  <div
                    className={`h-full ${BAR_COLORS[i]} rounded transition-all duration-700 ease-out`}
                    style={{ width: animated ? `${pct}%` : '0%' }}
                  />
                </div>
                {/* Percentage */}
                <span className="w-10 text-right text-sm font-semibold text-slate-200">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2 rounded-lg bg-brand-gold/20 border border-brand-gold/40 text-brand-gold font-semibold hover:bg-brand-gold/30 transition-colors text-sm"
        >
          OK
        </button>
      </div>
    </div>
  );
}
