import React from 'react';
import { useTranslation } from 'react-i18next';

function AudienceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <circle cx="9" cy="6" r="2.5" />
      <circle cx="15" cy="6" r="2.5" />
      <circle cx="5" cy="7" r="2" />
      <circle cx="19" cy="7" r="2" />
      <path d="M4 20c0-3 2-5 5-5h6c3 0 5 2 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.12-.23c1.22.49 2.56.76 3.95.76a1 1 0 011 1V20a1 1 0 01-1 1C9.61 21 3 14.39 3 6a1 1 0 011-1h3.5a1 1 0 011 1c0 1.39.27 2.73.76 3.95a1 1 0 01-.23 1.12l-2.41 2.42-.2-.7z" />
    </svg>
  );
}

function GraceIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M11 2h2v7h7v2h-7v11h-2V11H4V9h7V2z" />
    </svg>
  );
}

function BibleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      <line x1="12" y1="7" x2="12" y2="13" />
      <line x1="9" y1="10" x2="15" y2="10" />
    </svg>
  );
}

export default function Lifelines({
  usedLifelines, onFiftyFifty, onAudience, onPhone, onGrace, onBible,
  hasBibleRef, phase,
}) {
  const { t } = useTranslation();
  const disabled = phase !== 'selecting';

  const items = [
    {
      key: 'fifty',
      label: '50:50',
      used: usedLifelines.fifty,
      onClick: onFiftyFifty,
      ariaLabel: t('game.lifeline_5050'),
      content: <span className="text-base font-bold leading-none">½</span>,
      btnClass: 'lifeline-btn',
      labelClass: 'text-brand-gold/60',
    },
    {
      key: 'audience',
      label: t('game.lifeline_audience').split(' ')[0],
      used: usedLifelines.audience,
      onClick: onAudience,
      ariaLabel: t('game.lifeline_audience'),
      content: <AudienceIcon />,
      btnClass: 'lifeline-btn',
      labelClass: 'text-brand-gold/60',
    },
    {
      key: 'phone',
      label: t('game.lifeline_phone').split(' ')[0],
      used: usedLifelines.phone,
      onClick: onPhone,
      ariaLabel: t('game.lifeline_phone'),
      content: <PhoneIcon />,
      btnClass: 'lifeline-btn',
      labelClass: 'text-brand-gold/60',
    },
    {
      key: 'grace',
      label: t('game.lifeline_grace').split(' ')[0],
      used: usedLifelines.grace,
      onClick: onGrace,
      ariaLabel: t('game.lifeline_grace'),
      content: <GraceIcon />,
      btnClass: 'grace-lifeline-btn',
      labelClass: 'text-brand-gold/80',
    },
    {
      key: 'bible',
      label: t('game.lifeline_bible'),
      used: usedLifelines.bible >= 3,
      onClick: onBible,
      ariaLabel: t('game.lifeline_bible'),
      content: <BibleIcon />,
      btnClass: 'lifeline-btn',
      labelClass: 'text-brand-gold/60',
      extraDisabled: !hasBibleRef,
    },
  ];

  return (
    <div className="flex items-start justify-center gap-3">
      {items.map(({ key, label, used, onClick, ariaLabel, content, btnClass, labelClass, extraDisabled }) => (
        <div key={key} className="flex flex-col items-center gap-0.5">
          <button
            className={btnClass}
            onClick={onClick}
            disabled={used || disabled || extraDisabled}
            aria-label={ariaLabel}
            title={ariaLabel}
          >
            {content}
          </button>
          <span className={`text-xs font-display tracking-wide text-center leading-tight ${labelClass}`}>
            {label}
          </span>
          {key === 'bible' && (
            <div className="flex gap-0.5 mt-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < 3 - usedLifelines.bible ? 'bg-brand-gold/60' : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
