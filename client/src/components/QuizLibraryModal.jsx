import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getQuizzes,
  saveQuiz,
  deleteQuiz,
  setSelectedQuizId,
  exportQuizAsJson,
  fetchQuizByUrl,
  createBlankQuiz,
} from '../utils/quizStorage.js';
import { resolveUrl } from '../App.jsx';
import QuizEditorModal from './QuizEditorModal.jsx';

function QuizCard({ quiz, isSelected, isDownloaded, hasUpdate, showShare, shareUrl, onSelect, onEdit, onDelete, onExport, onDownload, onClone, onUpdate, t }) {
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={`rounded-xl border p-4 transition-all flex flex-col gap-3 ${
        isSelected
          ? 'border-brand-gold/70 bg-brand-gold/10 shadow-lg shadow-brand-gold/20'
          : 'border-brand-gold/20 bg-brand-dark/60 hover:border-brand-gold/35'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm text-slate-100 leading-snug">
            {quiz.name || t('quiz.untitled')}
          </h3>
          {quiz.author && (
            <p className="text-xs text-slate-500 mt-0.5">{t('quiz.by_author', { author: quiz.author })}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
          {quiz.language && (
            <span className="px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-brand-gold/15 text-brand-gold/70 uppercase">
              {quiz.language}
            </span>
          )}
          {hasUpdate && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-orange-400/50 text-orange-400/90">
              {t('quiz.update_available')}
            </span>
          )}
          {isSelected && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-gold text-brand-dark">
              {t('quiz.selected')}
            </span>
          )}
          {!isDownloaded && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold border border-sky-400/40 text-sky-400/80">
              {t('quiz.available_badge')}
            </span>
          )}
        </div>
      </div>

      {quiz.description && (
        <p className="text-xs text-slate-400 leading-relaxed">{quiz.description}</p>
      )}

      {showShare && showSharePanel && (
        <div className="flex gap-2 items-center">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 bg-brand-dark/80 border border-brand-gold/25 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-brand-gold/50"
          />
          <button
            onClick={handleCopyLink}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              copied
                ? 'border-green-500/40 text-green-400'
                : 'border-brand-gold/30 text-brand-gold/80 hover:bg-brand-gold/10 hover:text-brand-gold'
            }`}
          >
            {copied ? '✓' : t('quiz.copy')}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto">
        <span className="text-xs text-slate-500">
          {t('quiz.questions_count', { count: quiz.questions?.length ?? quiz.questionCount ?? 0 })}
          {quiz.version && <span className="ml-1.5 text-slate-600">v{quiz.version}</span>}
        </span>

        <div className="flex items-center gap-1">
          {isDownloaded && showShare && (
            <button
              onClick={() => setShowSharePanel((v) => !v)}
              title={t('quiz.share_link')}
              className={`p-1.5 rounded transition-colors ${showSharePanel ? 'text-sky-400' : 'text-slate-600 hover:text-sky-400'}`}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287zm5.57-1.914 1.372-1.372a3 3 0 0 0-4.243-4.243L5.586 3.672a3 3 0 0 0 .329 4.386.5.5 0 0 0 .183-.51l-.059-.299a1 1 0 0 0-.956-.816A2 2 0 0 1 5.8 4.43l1.828-1.828a2 2 0 0 1 2.83 2.828l-.793.793a4 4 0 0 1 .128 1.287z"/></svg>
            </button>
          )}
          {isDownloaded && (
            <>
              <button
                onClick={onClone}
                title={t('quiz.clone')}
                className="p-1.5 rounded text-slate-600 hover:text-teal-400 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1H2z"/>
                </svg>
              </button>
              <button
                onClick={onExport}
                title={t('quiz.export')}
                className="p-1.5 rounded text-slate-600 hover:text-brand-gold/70 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                </svg>
              </button>
              <button
                onClick={onEdit}
                title={t('quiz.edit')}
                className="p-1.5 rounded text-slate-600 hover:text-slate-200 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
                </svg>
              </button>
              <button
                onClick={onDelete}
                title={t('quiz.delete')}
                className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 0H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1h-.995a.59.59 0 0 0-.01 0zM3.042 3.5h9.916l-.844 10.56a1 1 0 0 1-.997.94h-6.23a1 1 0 0 1-.997-.94z"/>
                </svg>
              </button>
            </>
          )}

          {isDownloaded ? (
            <div className="flex items-center gap-1">
              {hasUpdate && (
                <button
                  onClick={onUpdate}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500/15 border border-orange-400/30 text-orange-400 hover:bg-orange-500/25 transition-all"
                >
                  {t('quiz.update')}
                </button>
              )}
              <button
                onClick={onSelect}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand-gold/20 text-brand-gold border border-brand-gold/40'
                    : 'bg-brand-gold text-brand-dark hover:bg-brand-gold-light'
                }`}
              >
                {isSelected ? t('quiz.active') : t('quiz.select')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {showShare && (
                <button
                  onClick={() => setShowSharePanel((v) => !v)}
                  title={t('quiz.share_link')}
                  className={`p-1.5 rounded transition-colors ${showSharePanel ? 'text-sky-400' : 'text-slate-600 hover:text-sky-400'}`}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287zm5.57-1.914 1.372-1.372a3 3 0 0 0-4.243-4.243L5.586 3.672a3 3 0 0 0 .329 4.386.5.5 0 0 0 .183-.51l-.059-.299a1 1 0 0 0-.956-.816A2 2 0 0 1 5.8 4.43l1.828-1.828a2 2 0 0 1 2.83 2.828l-.793.793a4 4 0 0 1 .128 1.287z"/></svg>
                </button>
              )}
              <button
                onClick={onDownload}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/15 border border-sky-400/30 text-sky-400 hover:bg-sky-500/25 transition-all"
              >
                <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                  <path d="M8 1a.5.5 0 0 1 .5.5v11.793l3.146-3.147a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L7.5 13.293V1.5A.5.5 0 0 1 8 1z"/>
                </svg>
                {t('quiz.download')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizLibraryModal({ onClose, onSelect, selectedQuizId, registryUrl, language = 'en' }) {
  const { t } = useTranslation();
  const [localQuizzes, setLocalQuizzes] = useState(() => getQuizzes());
  const [remoteQuizzes, setRemoteQuizzes] = useState([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [langFilter, setLangFilter] = useState(language);
  const [addUrl, setAddUrl] = useState('');
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [editorQuiz, setEditorQuiz] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const fileInputRef = useRef(null);

  function refresh() {
    setLocalQuizzes(getQuizzes());
  }

  useEffect(() => {
    if (!registryUrl) return;
    setRegistryLoading(true);

    const tryFetch = (url) =>
      fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

    (async () => {
      try {
        // Primary: configured registry URL
        const data = await tryFetch(registryUrl).catch(async () => {
          // Fallback: local Node API (useful when quizzes.php not yet deployed)
          if (registryUrl !== '/api/quizzes') return tryFetch('/api/quizzes');
          throw new Error('unavailable');
        });
        setRemoteQuizzes(Array.isArray(data) ? data : []);
      } catch {
        setRemoteQuizzes([]);
      } finally {
        setRegistryLoading(false);
      }
    })();
  }, [registryUrl]);

  const remoteById = Object.fromEntries(remoteQuizzes.map((q) => [q.id, q]));

  function hasUpdateAvailable(localQuiz) {
    const remote = remoteById[localQuiz.id];
    if (!remote) return false;
    // serverUpdatedAt is the server's timestamp at last sync; use it to avoid
    // false positives when the server clock is ahead of the client clock.
    const localSyncTs = localQuiz.serverUpdatedAt || localQuiz.updatedAt;
    if (remote.updatedAt && localSyncTs) return remote.updatedAt > localSyncTs;
    return remote.version !== localQuiz.version;
  }

  async function handleUpdate(localQuiz) {
    const remote = remoteById[localQuiz.id];
    if (remote) await handleDownloadRemote(remote);
  }

  const localIds = new Set(localQuizzes.map((q) => q.id));

  const allQuizzes = [
    ...localQuizzes.map((q) => ({ ...q, _isDownloaded: true })),
    ...remoteQuizzes
      .filter((q) => !localIds.has(q.id))
      .map((q) => ({ ...q, _isDownloaded: false })),
  ];

  const displayed = allQuizzes.filter((q) => {
    if (filter === 'downloaded' && !q._isDownloaded) return false;
    if (langFilter !== 'all' && q.language && q.language !== langFilter) return false;
    return true;
  });

  function handleSelect(quiz) {
    setSelectedQuizId(quiz.id);
    onSelect(quiz);
  }

  function getShareUrl(quiz) {
    return `${window.location.origin}${window.location.pathname}?quiz=${quiz.id}`;
  }

  function handleDelete(quiz) {
    if (!confirm(t('quiz.delete_confirm'))) return;
    deleteQuiz(quiz.id);
    refresh();
  }

  function handleClone(quiz) {
    const now = new Date().toISOString();
    const { id: _newId } = createBlankQuiz();
    const cloned = saveQuiz({ ...quiz, id: _newId, name: `${quiz.name || t('quiz.untitled')} (2)`, isLocal: true, createdAt: now, updatedAt: now });
    refresh();
    setEditorQuiz(cloned);
  }

  function handleEditorSave(saved) {
    refresh();
    setEditorQuiz(null);
  }

  async function handleDownloadRemote(quiz) {
    setDownloadingId(quiz.id);
    try {
      let fullQuiz;
      if (quiz.downloadUrl) {
        // Resolve relative URLs against the registry URL so they reach the correct server
        let url = quiz.downloadUrl;
        if (url && !url.startsWith('http') && registryUrl?.startsWith('http')) {
          url = new URL(url, registryUrl).href;
        }
        const raw = await fetchQuizByUrl(url);
        fullQuiz = Array.isArray(raw)
          ? { ...quiz, questions: raw, isLocal: true }
          : { ...quiz, ...raw, isLocal: true };
      } else {
        fullQuiz = { ...quiz, isLocal: true };
      }
      // Pre-fetch and cache remote questions so the quiz works offline
      if (fullQuiz.remoteQuestionsUrl) {
        try {
          const questions = await fetchQuizByUrl(resolveUrl(fullQuiz.remoteQuestionsUrl, language));
          if (Array.isArray(questions) && questions.length > 0) {
            fullQuiz = { ...fullQuiz, questions };
          }
        } catch {
          // Non-fatal: quiz saved without cached questions
        }
      }
      saveQuiz({ ...fullQuiz, serverUpdatedAt: fullQuiz.updatedAt });
      refresh();
    } catch {
      alert(t('quiz.download_error'));
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleFetchByUrl() {
    const input = addUrl.trim();
    if (!input) return;
    setAddLoading(true);
    setAddError('');
    try {
      let fetchUrl = input;
      let registryMeta = null;

      // Bare ID (no protocol, no path separator) → look up in registry for the real download URL
      if (!input.startsWith('http') && !input.includes('/')) {
        const remote = remoteById[input];
        if (!remote) {
          throw new Error(t('quiz.add_id_not_found'));
        }
        fetchUrl = remote.downloadUrl;
        if (fetchUrl && !fetchUrl.startsWith('http') && registryUrl?.startsWith('http')) {
          fetchUrl = new URL(fetchUrl, registryUrl).href;
        }
        registryMeta = remote;
      }

      const data = await fetchQuizByUrl(fetchUrl);
      let quiz;
      if (Array.isArray(data)) {
        quiz = { ...createBlankQuiz(), ...(registryMeta || {}), questions: data, name: registryMeta?.name || t('quiz.imported_name'), isLocal: true };
      } else {
        quiz = { ...createBlankQuiz(), ...(registryMeta || {}), ...data, isLocal: true };
      }
      const saved = saveQuiz({ ...quiz, serverUpdatedAt: quiz.updatedAt });
      setSelectedQuizId(saved.id);
      onSelect(saved);
      onClose();
    } catch (e) {
      setAddError(`${t('quiz.add_id_error')}: ${e.message}`);
    } finally {
      setAddLoading(false);
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        let quiz;
        if (Array.isArray(data)) {
          quiz = { ...createBlankQuiz(), questions: data, name: file.name.replace(/\.json$/i, ''), isLocal: true };
        } else {
          quiz = { ...createBlankQuiz(), ...data, isLocal: true };
        }
        saveQuiz(quiz);
        refresh();
      } catch {
        alert(t('quiz.import_error'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (editorQuiz) {
    return (
      <QuizEditorModal
        quiz={editorQuiz}
        onSave={handleEditorSave}
        onClose={() => setEditorQuiz(null)}
        onDelete={() => { refresh(); setEditorQuiz(null); }}
        publishUrl={registryUrl}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-card"
        style={{ width: 'min(95vw, 700px)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="font-display text-xl font-bold text-brand-gold">{t('quiz.library_title')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors text-2xl leading-none" aria-label="Close">✕</button>
        </div>

        {/* Primary action: add by URL / code */}
        <div className="mb-4 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={addUrl}
              onChange={(e) => { setAddUrl(e.target.value); setAddError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchByUrl()}
              placeholder={t('quiz.add_id_placeholder')}
              className="flex-1 bg-brand-dark/80 border border-brand-gold/35 rounded-xl px-4 py-2.5 text-sm text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-brand-gold/70 transition-colors"
              autoFocus
            />
            <button
              onClick={handleFetchByUrl}
              disabled={addLoading || !addUrl.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold bg-brand-gold text-brand-dark hover:bg-brand-gold-light transition-all disabled:opacity-40"
            >
              {addLoading ? '…' : t('quiz.add_id_fetch')}
            </button>
          </div>
          {addError && <p className="text-red-400 text-xs mt-1.5">{addError}</p>}
        </div>

        {/* Secondary actions */}
        <div className="flex flex-wrap gap-2 mb-3 flex-shrink-0">
          <button
            onClick={() => setEditorQuiz(createBlankQuiz({ language }))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-gold/10 border border-brand-gold/30 text-brand-gold/80 hover:bg-brand-gold/20 hover:text-brand-gold transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg>
            {t('quiz.create_new')}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-gold/10 border border-brand-gold/30 text-brand-gold/80 hover:bg-brand-gold/20 hover:text-brand-gold transition-all"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/></svg>
            {t('quiz.import_json')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-4 flex-shrink-0 flex-wrap">
          {['all', 'downloaded'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === f ? 'bg-brand-gold text-brand-dark' : 'text-slate-400 hover:text-slate-200 hover:bg-brand-gold/5'
              }`}
            >
              {t(`quiz.filter_${f}`)}
              {f === 'downloaded' && (
                <span className="ml-1.5 text-xs opacity-60">({localQuizzes.length})</span>
              )}
            </button>
          ))}
          {registryLoading && (
            <span className="ml-1 flex items-center gap-1 text-xs text-slate-500">
              <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {t('quiz.loading_registry')}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {['all', 'de', 'en'].map((l) => (
              <button
                key={l}
                onClick={() => setLangFilter(l)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  langFilter === l
                    ? 'bg-brand-gold/25 text-brand-gold border border-brand-gold/40'
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                {l === 'all' ? t('quiz.filter_lang_all') : l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Quiz grid */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {displayed.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">{t('quiz.no_quizzes')}</p>
              <p className="text-slate-500 text-xs mt-1">{t('quiz.no_quizzes_sub')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pr-1 pb-1">
              {displayed.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  isSelected={quiz.id === selectedQuizId}
                  isDownloaded={quiz._isDownloaded}
                  showShare={!!(remoteById[quiz.id] || quiz.isPublished)}
                  shareUrl={getShareUrl(quiz)}
                  onSelect={() => handleSelect(quiz)}
                  onEdit={() => setEditorQuiz(quiz)}
                  onDelete={() => handleDelete(quiz)}
                  onExport={() => exportQuizAsJson(quiz)}
                  onClone={() => handleClone(quiz)}
                  onDownload={() => handleDownloadRemote(quiz)}
                  hasUpdate={quiz._isDownloaded && hasUpdateAvailable(quiz)}
                  onUpdate={() => handleUpdate(quiz)}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer: deselect / use default */}
        {selectedQuizId && (
          <div className="mt-3 pt-3 border-t border-brand-gold/15 flex-shrink-0 flex justify-between items-center">
            <span className="text-xs text-slate-500">{t('quiz.active_quiz_note')}</span>
            <button
              onClick={() => { setSelectedQuizId(null); onSelect(null); }}
              className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
            >
              {t('quiz.use_default')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
