import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { saveQuiz, deleteQuiz, exportQuizAsJson, createBlankQuestion } from '../utils/quizStorage.js';

const DIFF_COLORS = {
  1: 'text-sky-400 bg-sky-400/10',
  2: 'text-teal-400 bg-teal-400/10',
  3: 'text-yellow-400 bg-yellow-400/10',
  4: 'text-orange-400 bg-orange-400/10',
  5: 'text-rose-400 bg-rose-400/10',
  6: 'text-purple-400 bg-purple-400/10',
};

function QuestionRow({ question, index, onChange, onDelete, t }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-lg border overflow-hidden transition-colors ${open ? 'border-brand-gold/40' : 'border-brand-gold/15'}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-dark/70 cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <span className="text-xs text-slate-600 font-mono w-5 flex-shrink-0">{index + 1}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0 ${DIFF_COLORS[question.difficulty] || DIFF_COLORS[1]}`}>
          D{question.difficulty}
        </span>
        <span className="flex-1 text-xs text-slate-300 truncate min-w-0">
          {question.text || <span className="text-slate-600 italic">{t('quiz.empty_question')}</span>}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 transition-colors"
          title={t('quiz.delete_question')}
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0zM3.042 3.5h9.916l-.844 10.56a1 1 0 0 1-.997.94h-6.23a1 1 0 0 1-.997-.94z"/>
          </svg>
        </button>
        <svg viewBox="0 0 16 16" className={`w-3 h-3 flex-shrink-0 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} fill="currentColor">
          <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
        </svg>
      </div>

      {open && (
        <div className="p-3 bg-brand-navy/20 border-t border-brand-gold/10 space-y-3">
          <div className="flex gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_difficulty')}</label>
              <select
                value={question.difficulty}
                onChange={(e) => onChange({ ...question, difficulty: Number(e.target.value) })}
                className="bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-gold/55"
              >
                {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_reference')}</label>
              <input
                type="text"
                value={question.reference || ''}
                onChange={(e) => onChange({ ...question, reference: e.target.value })}
                placeholder="e.g. John 3:16"
                className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_question_text')}</label>
            <textarea
              value={question.text}
              onChange={(e) => onChange({ ...question, text: e.target.value })}
              rows={2}
              className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {['A', 'B', 'C', 'D'].map((letter, i) => (
              <div key={letter} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.correct === i}
                  onChange={() => onChange({ ...question, correct: i })}
                  className="accent-brand-gold flex-shrink-0 cursor-pointer"
                />
                <span className={`text-xs font-bold w-4 flex-shrink-0 ${question.correct === i ? 'text-brand-gold' : 'text-slate-500'}`}>{letter}</span>
                <input
                  type="text"
                  value={question.options[i] || ''}
                  onChange={(e) => {
                    const opts = [...question.options];
                    opts[i] = e.target.value;
                    onChange({ ...question, options: opts });
                  }}
                  placeholder={t('quiz.field_option', { letter })}
                  className="flex-1 min-w-0 bg-brand-dark border border-brand-gold/25 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">{t('quiz.correct_radio_hint')}</p>
        </div>
      )}
    </div>
  );
}

export default function QuizEditorModal({ quiz: initialQuiz, onSave, onClose, onDelete, publishUrl }) {
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState({ ...initialQuiz });
  const [saved, setSaved] = useState(false);
  const [publishStatus, setPublishStatus] = useState('idle'); // 'idle'|'sending'|'success'|'error'
  const [publishError, setPublishError] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('idle'); // 'idle'|'sending'|'error'
  const [deleteError, setDeleteError] = useState('');

  const isNew = !initialQuiz.name && !initialQuiz.questions.length;

  function updateMeta(field, value) {
    setQuiz((q) => ({ ...q, [field]: value }));
    setSaved(false);
  }

  function addQuestion() {
    setQuiz((q) => ({ ...q, questions: [...q.questions, createBlankQuestion()] }));
    setSaved(false);
  }

  function updateQuestion(index, updated) {
    setQuiz((q) => {
      const questions = [...q.questions];
      questions[index] = updated;
      return { ...q, questions };
    });
    setSaved(false);
  }

  function deleteQuestion(index) {
    setQuiz((q) => ({ ...q, questions: q.questions.filter((_, i) => i !== index) }));
    setSaved(false);
  }

  function handleSave() {
    const saved = saveQuiz(quiz);
    setSaved(true);
    onSave(saved);
  }

  async function handlePublish() {
    if (!quiz.secret) {
      setPublishError(t('quiz.publish_secret_required'));
      setPublishStatus('error');
      return;
    }
    setPublishStatus('sending');
    setPublishError('');
    try {
      const { secret, ...quizData } = quiz;
      const res = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz: quizData, secret }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPublishError(res.status === 403 ? t('quiz.publish_error_wrong_secret') : t('quiz.publish_error'));
        setPublishStatus('error');
        return;
      }
      const published = saveQuiz({ ...quiz, isPublished: true, serverUpdatedAt: data.updatedAt });
      setQuiz(published);
      onSave(published);
      setPublishStatus('success');
    } catch {
      setPublishError(t('quiz.publish_error'));
      setPublishStatus('error');
    }
  }

  async function handleDeleteFromServer() {
    if (!quiz.secret) {
      setDeleteError(t('quiz.publish_secret_required'));
      setDeleteStatus('error');
      return;
    }
    if (!confirm(t('quiz.delete_from_server_confirm'))) return;
    setDeleteStatus('sending');
    setDeleteError('');
    try {
      const res = await fetch(publishUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quiz.id, secret: quiz.secret }),
      });
      if (!res.ok) {
        setDeleteError(res.status === 403 ? t('quiz.publish_error_wrong_secret') : t('quiz.delete_error'));
        setDeleteStatus('error');
        return;
      }
      deleteQuiz(quiz.id);
      onDelete?.();
      onClose();
    } catch {
      setDeleteError(t('quiz.delete_error'));
      setDeleteStatus('error');
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-card"
        style={{ width: 'min(95vw, 700px)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="font-display text-xl font-bold text-brand-gold">
            {isNew ? t('quiz.editor_title_create') : t('quiz.editor_title_edit')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none" aria-label="Close">✕</button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4" style={{ minHeight: 0 }}>
          {/* Quiz ID (readonly) */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-32">
              <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_id')}</label>
              <input
                type="text"
                value={quiz.id}
                readOnly
                className="w-full bg-brand-dark/50 border border-brand-gold/15 rounded px-2 py-1.5 text-xs text-slate-500 font-mono cursor-default"
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_version')}</label>
              <input
                type="text"
                value={quiz.version}
                onChange={(e) => updateMeta('version', e.target.value)}
                className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-gold/55"
              />
            </div>
            <div className="w-20">
              <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_language')}</label>
              <select
                value={quiz.language}
                onChange={(e) => updateMeta('language', e.target.value)}
                className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-gold/55"
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_name')}</label>
            <input
              type="text"
              value={quiz.name}
              onChange={(e) => updateMeta('name', e.target.value)}
              placeholder={t('quiz.field_name_placeholder')}
              className="w-full bg-brand-dark border border-brand-gold/25 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_author')}</label>
              <input
                type="text"
                value={quiz.author}
                onChange={(e) => updateMeta('author', e.target.value)}
                placeholder={t('quiz.field_author_placeholder')}
                className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_description')}</label>
            <textarea
              value={quiz.description}
              onChange={(e) => updateMeta('description', e.target.value)}
              rows={2}
              placeholder={t('quiz.field_description_placeholder')}
              className="w-full bg-brand-dark border border-brand-gold/25 rounded px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55 resize-none"
            />
          </div>

          {/* Publish secret */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">{t('quiz.field_secret')}</label>
            <input
              type="password"
              value={quiz.secret || ''}
              onChange={(e) => { updateMeta('secret', e.target.value); setPublishStatus('idle'); setPublishError(''); }}
              placeholder={t('quiz.field_secret_placeholder')}
              autoComplete="new-password"
              className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-gold/55"
            />
            <p className="text-xs text-slate-600 mt-1">{t('quiz.field_secret_hint')}</p>
          </div>

          {/* Questions source */}
          <div className="rounded-lg border border-brand-gold/20 p-3 space-y-3">
            <p className="text-xs text-slate-500 font-display uppercase tracking-wide">{t('quiz.questions_source')}</p>
            <div className="flex gap-4">
              {[
                { value: '', label: t('quiz.source_local') },
                { value: 'remote', label: t('quiz.source_remote') },
              ].map(({ value, label }) => {
                const isActive = value === 'remote' ? !!quiz.remoteQuestionsUrl : !quiz.remoteQuestionsUrl;
                return (
                  <label key={value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`qsource-${quiz.id}`}
                      checked={isActive}
                      onChange={() => updateMeta('remoteQuestionsUrl', value === 'remote' ? 'questions_{lang}.json' : '')}
                      className="accent-brand-gold"
                    />
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                );
              })}
            </div>
            {quiz.remoteQuestionsUrl && (
              <div>
                <label className="text-xs text-slate-500 block mb-1">{t('quiz.remote_url_label')}</label>
                <input
                  type="text"
                  value={quiz.remoteQuestionsUrl}
                  onChange={(e) => updateMeta('remoteQuestionsUrl', e.target.value)}
                  placeholder="https://example.com/questions.php?lang={lang}"
                  className="w-full bg-brand-dark border border-brand-gold/25 rounded px-2 py-1.5 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-brand-gold/55"
                />
                <p className="text-xs text-slate-600 mt-1">{t('quiz.remote_url_hint')}</p>
              </div>
            )}
          </div>

          {/* Questions section (local mode only) */}
          {!quiz.remoteQuestionsUrl && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300 font-display">
                {t('quiz.questions_section')}
                <span className="ml-2 text-xs text-slate-500 font-sans">({quiz.questions.length})</span>
              </h3>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-gold/15 border border-brand-gold/30 text-brand-gold/80 hover:bg-brand-gold/25 hover:text-brand-gold transition-all"
              >
                + {t('quiz.add_question')}
              </button>
            </div>
            <div className="space-y-2">
              {quiz.questions.length === 0 && (
                <p className="text-xs text-slate-600 text-center py-6 border border-dashed border-brand-gold/10 rounded-lg">
                  {t('quiz.no_questions_yet')}
                </p>
              )}
              {quiz.questions.map((q, i) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  index={i}
                  onChange={(updated) => updateQuestion(i, updated)}
                  onDelete={() => deleteQuestion(i)}
                  t={t}
                />
              ))}
            </div>
          </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-brand-gold/15 flex-shrink-0">
          {(publishError || deleteError) && (
            <p className="text-xs text-red-400 text-right">{publishError || deleteError}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportQuizAsJson(quiz)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
              </svg>
              {t('quiz.export_quiz')}
            </button>
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              {t('quiz.cancel')}
            </button>
            {publishUrl && (
              <>
                <button
                  onClick={handleDeleteFromServer}
                  disabled={deleteStatus === 'sending'}
                  className="px-3 py-2 rounded-lg text-sm font-semibold border border-red-500/40 text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-50"
                >
                  {deleteStatus === 'sending' ? t('quiz.deleting') : t('quiz.delete_from_server')}
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishStatus === 'sending'}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50 ${
                    publishStatus === 'success'
                      ? 'border-green-500/40 text-green-400'
                      : 'border-brand-gold/40 text-brand-gold/80 hover:bg-brand-gold/10 hover:text-brand-gold'
                  }`}
                >
                  {publishStatus === 'sending' ? t('quiz.publish_sending')
                    : publishStatus === 'success' ? t('quiz.publish_success')
                    : t('quiz.publish')}
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              className="px-3 py-2 rounded-xl text-sm font-bold bg-gradient-to-br from-brand-gold via-brand-gold-light to-brand-gold text-brand-dark hover:shadow-lg hover:shadow-brand-gold/30 transition-all"
            >
              {saved ? t('quiz.saved') : t('quiz.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
