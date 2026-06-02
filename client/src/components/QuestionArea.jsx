import React from 'react';
import { useTranslation } from 'react-i18next';
import AnswerButton from './AnswerButton.jsx';

export default function QuestionArea({
  question,
  questionNumber,
  totalQuestions,
  formattedPrize,
  preselectedAnswer,
  selectedAnswer,
  phase,
  removedOptions,
  onPreselect,
  onConfirm,
}) {
  const { t } = useTranslation();

  function getButtonState(index) {
    if (removedOptions.includes(index)) return 'disabled';
    if (phase === 'selecting') {
      if (index === preselectedAnswer) return 'preselected';
      return 'default';
    }
    // revealing / correct / wrong
    if (index === question.correct) return 'correct';
    if (index === selectedAnswer && index !== question.correct) return 'wrong';
    return 'default';
  }

  function handleClick(index) {
    if (phase !== 'selecting') return;
    if (removedOptions.includes(index)) return;
    if (preselectedAnswer === index) {
      onConfirm(index);
    } else {
      onPreselect(index);
    }
  }

  return (
    <div className="question-glow flex flex-col gap-4 w-full">
      {/* Question box — question-card enables difficulty glow via CSS */}
      <div className="question-card relative rounded-xl border border-brand-gold/25 bg-brand-navy/80 backdrop-blur p-5 sm:p-6 shadow-lg">
        <span className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-brand-gold/40" />
        <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-brand-gold/40" />
        <span className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full bg-brand-gold/40" />
        <span className="absolute bottom-3 right-3 w-1.5 h-1.5 rounded-full bg-brand-gold/40" />

        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-brand-gold/15 border border-brand-gold/30 text-brand-gold text-xs font-semibold tracking-wider uppercase font-display">
            {t('game.question')} {questionNumber} {t('game.of')} {totalQuestions}
          </span>
          {formattedPrize && (
            <span className="font-display font-bold text-brand-gold text-sm">
              {formattedPrize} {t('currency')}
            </span>
          )}
        </div>

        <p className="text-center text-slate-300 text-base sm:text-xl font-semibold leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options.map((opt, i) => (
          <AnswerButton
            key={i}
            index={i}
            text={opt}
            state={getButtonState(i)}
            onClick={() => handleClick(i)}
            isSelected={i === selectedAnswer}
          />
        ))}
      </div>

      {/* Confirm hint shown when an answer is preselected */}
      {phase === 'selecting' && preselectedAnswer !== null && (
        <p className="text-center text-amber-400/55 text-xs animate-pulse">
          {t('game.confirm_hint')}
        </p>
      )}
    </div>
  );
}
