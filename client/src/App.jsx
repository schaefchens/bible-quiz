import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import StartScreen from './components/StartScreen.jsx';
import QuizGame from './components/QuizGame.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import { useAudio } from './context/AudioContext.jsx';
import { getSelectedQuiz, getSelectedQuizId, setSelectedQuizId, saveQuiz } from './utils/quizStorage.js';

const CACHE_KEY      = 'biblionaire_cached_questions';
const BACKEND_KEY    = 'biblionaire_backend_url';
const WINNINGS_KEY   = 'biblionaire_total_winnings'; // default (no quiz selected)

function winningsKey(quizId) {
  return quizId ? `biblionaire_winnings_${quizId}` : WINNINGS_KEY;
}

function readWinnings(quizId) {
  const s = localStorage.getItem(winningsKey(quizId));
  return s ? parseInt(s, 10) || 0 : 0;
}

function writeWinnings(quizId, amount) {
  localStorage.setItem(winningsKey(quizId), String(amount));
}

export const DEFAULT_BACKEND_URL = 'questions_{lang}.json'; // local static file (offline fallback)
// Every backend call goes through one prefix, in every target:
//   web prod  → /api/ on the deploy host (the htaccess-protected PHP folder)
//   dev       → /api/ proxied to the Node dev server (see vite.config.js)
//   Capacitor → VITE_API_BASE, an absolute URL; a packaged app has no origin
//               of its own to resolve a relative path against.
const API_BASE = (import.meta.env.VITE_API_BASE || '/api/').replace(/\/?$/, '/');

const PHP_BACKEND_URL            = `${API_BASE}questions.php?lang={lang}`; // AI generator (online default)
const PHP_REGISTRY_URL           = `${API_BASE}quizzes.php`;

// Backends that no longer exist. A stored value matching one of these is reset
// to the default instead of being fetched (the old domains were retired).
const RETIRED_BACKEND_HOSTS = ['komm-folge-mir-nach.de'];

// Derive the quiz registry URL that pairs with a given questions backend.
export function resolveRegistryUrl(backendUrl) {
  // Custom PHP backend → derive registry from the same host
  if (backendUrl && backendUrl !== DEFAULT_BACKEND_URL && backendUrl.includes('questions.php')) {
    return backendUrl.replace(/questions\.php.*$/, 'quizzes.php');
  }
  // Default backend → canonical registry. Offline is not special-cased: the URL
  // is the same one dev proxies to the Node server, and QuizLibraryModal already
  // degrades to the locally cached quizzes when the fetch fails.
  return PHP_REGISTRY_URL;
}

export function resolveUrl(template, lang) {
  return (template || DEFAULT_BACKEND_URL)
    .replace(/\{lang\}/g,  lang)
    .replace(/\{LANG\}/g,  lang.toUpperCase());
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pick 15 questions: 3×d1–d4, 2×d5, 1×d6 (the final "million" question).
// Falls back to a 3rd d5 question if no d6 questions exist in the bank.
function pickQuestions(data) {
  const out = [];
  for (const tier of [1, 2, 3, 4]) {
    const pool = data.filter((q) => q.difficulty === tier);
    out.push(...shuffle(pool).slice(0, 3));
  }
  const d5pool = shuffle(data.filter((q) => q.difficulty === 5));
  out.push(...d5pool.slice(0, 2));
  const d6pool = shuffle(data.filter((q) => q.difficulty === 6));
  if (d6pool.length > 0) {
    out.push(d6pool[0]);
  } else {
    out.push(...d5pool.slice(2, 3)); // fallback: 3rd d5 question
  }
  return out;
}

// Randomise the order of each question's answer options, keeping correct in sync.
function shuffleAnswers(questions) {
  return questions.map((q) => {
    const order = shuffle([0, 1, 2, 3]);
    return {
      ...q,
      options: order.map((i) => q.options[i]),
      correct: order.indexOf(q.correct),
    };
  });
}

export default function App() {
  const { i18n } = useTranslation();
  const { initAudio } = useAudio();
  const [screen, setScreen] = useState('start'); // 'start' | 'game' | 'result'
  const [questions, setQuestions] = useState([]);
  const [language, setLanguage] = useState(i18n.language?.startsWith('en') ? 'en' : 'de');
  const [gameResult, setGameResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(() => getSelectedQuiz());
  const [totalWinnings, setTotalWinnings] = useState(() => readWinnings(getSelectedQuizId()));
  const [backendUrl, setBackendUrl] = useState(() => {
    const stored = localStorage.getItem(BACKEND_KEY);
    // Migrate users whose stored value is the old API default
    if (!stored || stored === '/api/quiz?lang={lang}' || stored === '/questions_{lang}.json') return DEFAULT_BACKEND_URL;
    // Migrate users pinned to a retired domain back onto the default backend
    if (RETIRED_BACKEND_HOSTS.some((h) => stored.includes(h))) {
      localStorage.removeItem(BACKEND_KEY);
      return DEFAULT_BACKEND_URL;
    }
    return stored;
  });

  const handleBackendUrlChange = useCallback((url) => {
    const v = url.trim() || DEFAULT_BACKEND_URL;
    setBackendUrl(v);
    localStorage.setItem(BACKEND_KEY, v);
  }, []);

  const changeLanguage = useCallback(
    (lang) => {
      setLanguage(lang);
      i18n.changeLanguage(lang);
    },
    [i18n]
  );

  const handleQuizSelect = useCallback((quiz) => {
    setSelectedQuizId(quiz?.id || null);
    setSelectedQuiz(quiz || null);
    setTotalWinnings(readWinnings(quiz?.id || null));
  }, []);

  // Auto-select quiz from share link: ?quiz=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get('quiz');
    if (!quizId) return;

    // Remove param from URL immediately so it doesn't re-fire on reload
    history.replaceState(null, '', window.location.pathname);

    const regUrl = resolveRegistryUrl(backendUrl);
    (async () => {
      try {
        const registry = await fetch(regUrl).then((r) => { if (!r.ok) throw new Error(); return r.json(); });
        const entry = Array.isArray(registry) ? registry.find((q) => q.id === quizId) : null;
        if (!entry) return;

        let dlUrl = entry.downloadUrl || '';
        if (dlUrl && !dlUrl.startsWith('http') && regUrl.startsWith('http')) {
          dlUrl = new URL(dlUrl, regUrl).href;
        }

        const raw = dlUrl ? await fetch(dlUrl).then((r) => r.json()) : entry;
        const quiz = Array.isArray(raw)
          ? { ...entry, questions: raw, isLocal: true }
          : { ...entry, ...raw, isLocal: true };
        const saved = saveQuiz({ ...quiz, serverUpdatedAt: quiz.updatedAt });
        setSelectedQuizId(saved.id);
        handleQuizSelect(saved);
      } catch {
        // Silently ignore — user can still pick manually
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchQuestions = useCallback(
    async (lang) => {
      setLoading(true);
      setError(null);
      // initAudio must run on the user-gesture call stack (button click).
      try { await initAudio(); } catch { /* audio unavailable, continue anyway */ }

      const tryFetch = async (urlTemplate) => {
        const res = await fetch(resolveUrl(urlTemplate, lang));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      };

      // If a custom quiz is selected, use it — remote URL or local questions.
      const active = getSelectedQuiz();
      if (active) {
        if (active.remoteQuestionsUrl) {
          try {
            const raw = await tryFetch(active.remoteQuestionsUrl);
            const picked = raw.length > 15 ? pickQuestions(raw) : raw;
            saveQuiz({ ...active, questions: picked }); // cache for offline
            setQuestions(shuffleAnswers(picked));
            setScreen('game');
          } catch {
            if (active.questions?.length) {
              const picked = active.questions.length > 15 ? pickQuestions(active.questions) : active.questions;
              setQuestions(shuffleAnswers(picked));
              setScreen('game');
            } else {
              setError('remote');
            }
          }
          setLoading(false);
          return;
        }
        if (active.questions?.length) {
          const picked = active.questions.length > 15 ? pickQuestions(active.questions) : active.questions;
          setQuestions(shuffleAnswers(picked));
          setScreen('game');
          setLoading(false);
          return;
        }
      }

      const isDefault = backendUrl === DEFAULT_BACKEND_URL;

      try {
        let raw;
        if (!isDefault) {
          // User specified a custom URL → use it directly
          raw = await tryFetch(backendUrl);
        } else if (navigator.onLine) {
          // Online → try PHP generator, fall back to local file on error
          try {
            raw = await tryFetch(PHP_BACKEND_URL);
          } catch {
            raw = await tryFetch(DEFAULT_BACKEND_URL);
          }
        } else {
          // Offline → use local file (served from SW cache)
          raw = await tryFetch(DEFAULT_BACKEND_URL);
        }

        const picked = raw.length > 15 ? pickQuestions(raw) : raw;
        localStorage.setItem(CACHE_KEY, JSON.stringify({ lang, data: picked, ts: Date.now() }));
        setQuestions(shuffleAnswers(picked));
        setScreen('game');
      } catch (err) {
        // Try localStorage cache
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const cached = JSON.parse(raw);
            if (cached.lang === lang && cached.data?.length >= 1) {
              setQuestions(shuffleAnswers(cached.data));
              setScreen('game');
              return;
            }
          }
        } catch {
          // ignore parse errors
        }
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [initAudio, backendUrl]
  );

  const handleStart = useCallback(() => {
    const qid = selectedQuiz?.id || null;
    if (totalWinnings > 0) {
      const fee = Math.round(totalWinnings * 0.1);
      const next = totalWinnings - fee;
      setTotalWinnings(next);
      writeWinnings(qid, next);
    }
    fetchQuestions(language);
  }, [fetchQuestions, language, totalWinnings, selectedQuiz]);

  const handleGameEnd = useCallback((result) => {
    const qid = selectedQuiz?.id || null;
    if (result.finalAmount > 0) {
      setTotalWinnings((prev) => {
        const next = prev + result.finalAmount;
        writeWinnings(qid, next);
        return next;
      });
    }
    setGameResult(result);
    setScreen('result');
  }, [selectedQuiz]);

  const handlePlayAgain = useCallback(() => {
    setGameResult(null);
    setQuestions([]);
    setScreen('start');
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark bg-cross-watermark">
      {screen === 'start' && (
        <StartScreen
          onStart={handleStart}
          language={language}
          onLanguageChange={changeLanguage}
          loading={loading}
          error={error}
          backendUrl={backendUrl}
          onBackendUrlChange={handleBackendUrlChange}
          totalWinnings={totalWinnings}
          selectedQuiz={selectedQuiz}
          onQuizSelect={handleQuizSelect}
          registryUrl={resolveRegistryUrl(backendUrl)}
        />
      )}
      {screen === 'game' && questions.length > 0 && (
        <QuizGame
          questions={questions}
          language={language}
          onGameEnd={handleGameEnd}
        />
      )}
      {screen === 'result' && gameResult && (
        <ResultScreen
          result={gameResult}
          language={language}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </div>
  );
}
