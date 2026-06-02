const QUIZ_LIBRARY_KEY = 'biblionaire_quiz_library';
const SELECTED_QUIZ_KEY = 'biblionaire_selected_quiz_id';

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
function generateId() {
  return Array.from({ length: 4 }, () => ID_CHARS[Math.floor(Math.random() * ID_CHARS.length)]).join('');
}

export function getQuizzes() {
  try {
    const raw = localStorage.getItem(QUIZ_LIBRARY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Remove quizzes saved with an ambiguous bilingual language tag (e.g. 'en/de').
// These are stale entries from the old registry format; the editor only ever
// writes 'en' or 'de', so a slash can only come from old server metadata.
(function migrateLanguageField() {
  try {
    const quizzes = getQuizzes();
    const cleaned = quizzes.filter((q) => !q.language?.includes('/'));
    if (cleaned.length !== quizzes.length) {
      localStorage.setItem(QUIZ_LIBRARY_KEY, JSON.stringify(cleaned));
    }
  } catch {
    // ignore
  }
})();

export function saveQuiz(quiz) {
  const quizzes = getQuizzes();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  const now = new Date().toISOString();
  const updated = { ...quiz, updatedAt: now };
  if (idx >= 0) {
    quizzes[idx] = updated;
  } else {
    quizzes.push({ ...updated, createdAt: updated.createdAt || now });
  }
  localStorage.setItem(QUIZ_LIBRARY_KEY, JSON.stringify(quizzes));
  return updated;
}

export function deleteQuiz(id) {
  const quizzes = getQuizzes().filter((q) => q.id !== id);
  localStorage.setItem(QUIZ_LIBRARY_KEY, JSON.stringify(quizzes));
  if (getSelectedQuizId() === id) localStorage.removeItem(SELECTED_QUIZ_KEY);
}

export function getSelectedQuizId() {
  return localStorage.getItem(SELECTED_QUIZ_KEY) || null;
}

export function setSelectedQuizId(id) {
  if (id) localStorage.setItem(SELECTED_QUIZ_KEY, id);
  else localStorage.removeItem(SELECTED_QUIZ_KEY);
}

export function getSelectedQuiz() {
  const id = getSelectedQuizId();
  if (!id) return null;
  return getQuizzes().find((q) => q.id === id) || null;
}

export function exportQuizAsJson(quiz) {
  const { secret: _s, ...exportable } = quiz;
  const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `quiz_${quiz.id}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function createBlankQuiz(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: '',
    description: '',
    author: '',
    version: '1.0',
    language: 'en',
    createdAt: now,
    updatedAt: now,
    isLocal: true,
    isPublished: false,
    remoteQuestionsUrl: '',
    secret: '',
    questions: [],
    ...overrides,
  };
}

export function createBlankQuestion() {
  return {
    id: generateId(),
    difficulty: 1,
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    reference: '',
  };
}

export async function fetchQuizByUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
