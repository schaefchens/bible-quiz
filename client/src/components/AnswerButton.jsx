import React from 'react';
import { useTranslation } from 'react-i18next';

const LETTERS = ['A', 'B', 'C', 'D'];

export default function AnswerButton({ index, text, state = 'default', onClick, isSelected = false }) {
  const { t } = useTranslation();
  const letter = LETTERS[index];
  const isClickable = (state === 'default' || state === 'preselected') && !!onClick;
  const showFeedback = isSelected && (state === 'correct' || state === 'wrong');

  return (
    <button
      className={`answer-btn ${state}`}
      onClick={isClickable ? onClick : undefined}
      disabled={state === 'disabled'}
      aria-label={`${letter}: ${text}`}
    >
      <span className="answer-letter">{letter}</span>

      <div className="flex-1 min-w-0">
        <span className="block text-sm sm:text-base leading-snug">{text}</span>
        {showFeedback && (
          <span className={`block font-display font-black text-base mt-1 ${state === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
            {t(state === 'correct' ? 'result.correct' : 'result.wrong')}
          </span>
        )}
      </div>

      {state === 'preselected' && (
        <span className="ml-auto text-amber-400/70 text-sm animate-pulse flex-shrink-0" aria-hidden="true">↩</span>
      )}
      {state === 'correct' && (
        <span className="ml-auto text-green-400 text-lg flex-shrink-0" aria-hidden="true">✓</span>
      )}
      {state === 'wrong' && (
        <span className="ml-auto text-red-400 text-lg flex-shrink-0" aria-hidden="true">✗</span>
      )}
    </button>
  );
}
