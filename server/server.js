import express from 'express';
import cors from 'cors';
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { questions } from './data/questions.js';
import { references } from './data/references.js';
import { demoQuizzes } from './data/demoQuizzes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLISHED_DIR = join(__dirname, 'data', 'published');

const DEFAULT_QUIZZES = [
  {
    id: 'default_en',
    name: 'Biblionaire – Standard English',
    description: 'The official Biblionaire question bank with 75 questions across 6 difficulty levels.',
    author: 'Biblionaire Team',
    version: '1.0',
    language: 'en',
    isPublished: true,
    downloadUrl: '/api/quiz-download/default_en',
  },
  {
    id: 'default_de',
    name: 'Biblionair – Standard Deutsch',
    description: 'Der offizielle Biblionair-Fragenkatalog mit 75 Fragen über 6 Schwierigkeitsstufen.',
    author: 'Biblionair Team',
    version: '1.0',
    language: 'de',
    isPublished: true,
    downloadUrl: '/api/quiz-download/default_de',
  },
];

// Build static registry from defaults + demo quizzes.
const STATIC_REGISTRY = [
  ...DEFAULT_QUIZZES.map((q) => ({ ...q, questionCount: questions.length })),
  ...demoQuizzes.map((q) => ({
    id: q.id,
    name: q.name,
    description: q.description,
    author: q.author,
    version: q.version,
    language: q.language,
    isPublished: q.isPublished,
    downloadUrl: `/api/quiz-download/${q.id}`,
    questionCount: q.questions.length,
  })),
];

const RESERVED_IDS = new Set(STATIC_REGISTRY.map((q) => q.id));

function sha256(str) {
  return createHash('sha256').update(str).digest('hex');
}

function loadPublishedQuizzes() {
  if (!existsSync(PUBLISHED_DIR)) return [];
  try {
    return readdirSync(PUBLISHED_DIR)
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        try {
          const data = JSON.parse(readFileSync(join(PUBLISHED_DIR, f), 'utf8'));
          return [{
            id: data.id,
            name: data.name || '',
            description: data.description || '',
            author: data.author || '',
            version: data.version || '1.0',
            language: data.language || 'en',
            isPublished: true,
            updatedAt: data.updatedAt,
            questionCount: (data.questions || []).length,
            downloadUrl: `/api/quiz-download/${data.id}`,
          }];
        } catch { return []; }
      });
  } catch { return []; }
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

app.get('/api/quiz', (req, res) => {
  const lang = req.query.lang === 'en' ? 'en' : 'de';
  const tiers = [1, 2, 3, 4, 5];
  const selected = [];
  for (const tier of tiers) {
    const pool = questions.filter((q) => q.difficulty === tier);
    selected.push(...shuffle(pool).slice(0, 3));
  }
  res.json(selected.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    text: q[lang].text,
    options: q[lang].options,
    correct: q.correct,
    reference: references[q.id]?.[lang],
  })));
});

/**
 * GET /api/quizzes — registry listing
 * POST /api/quizzes — publish / update a quiz (requires secret)
 */
app.get('/api/quizzes', (req, res) => {
  const published = loadPublishedQuizzes();
  const publishedIds = new Set(published.map((q) => q.id));
  res.json([
    ...STATIC_REGISTRY.filter((q) => !publishedIds.has(q.id)),
    ...published,
  ]);
});

app.post('/api/quizzes', (req, res) => {
  const { quiz, secret } = req.body || {};
  if (!quiz?.id || !secret) return res.status(400).json({ error: 'Missing quiz or secret' });

  const id = quiz.id;
  if (!/^[a-z0-9]{1,20}$/.test(id)) return res.status(400).json({ error: 'Invalid quiz ID' });
  if (RESERVED_IDS.has(id)) return res.status(403).json({ error: 'Reserved quiz ID' });

  if (!existsSync(PUBLISHED_DIR)) mkdirSync(PUBLISHED_DIR, { recursive: true });

  const hashFile = join(PUBLISHED_DIR, `${id}.hash`);
  const quizFile = join(PUBLISHED_DIR, `${id}.json`);
  const incomingHash = sha256(secret);

  if (existsSync(hashFile)) {
    const storedHash = readFileSync(hashFile, 'utf8').trim();
    if (storedHash !== incomingHash) return res.status(403).json({ error: 'Wrong secret' });
  }

  const now = new Date().toISOString();
  const { secret: _s, ...quizData } = quiz;
  const stored = { ...quizData, isPublished: true, updatedAt: now };

  writeFileSync(hashFile, incomingHash);
  writeFileSync(quizFile, JSON.stringify(stored, null, 2));

  res.json({ success: true, id, updatedAt: now });
});

/**
 * DELETE /api/quizzes — remove a published quiz (requires matching secret)
 */
app.delete('/api/quizzes', (req, res) => {
  const { id, secret } = req.body || {};
  if (!id || !secret) return res.status(400).json({ error: 'Missing id or secret' });

  const hashFile = join(PUBLISHED_DIR, `${id}.hash`);
  const quizFile = join(PUBLISHED_DIR, `${id}.json`);

  if (!existsSync(hashFile)) return res.status(404).json({ error: 'Quiz not found' });

  const storedHash = readFileSync(hashFile, 'utf8').trim();
  if (storedHash !== sha256(secret)) return res.status(403).json({ error: 'Wrong secret' });

  try { unlinkSync(hashFile); } catch {}
  try { unlinkSync(quizFile); } catch {}

  res.json({ success: true });
});

/**
 * GET /api/quiz-download/:id — full quiz with questions
 */
app.get('/api/quiz-download/:id', (req, res) => {
  const { id } = req.params;

  // User-published quizzes
  const quizFile = join(PUBLISHED_DIR, `${id}.json`);
  if (existsSync(quizFile)) {
    const data = JSON.parse(readFileSync(quizFile, 'utf8'));
    return res.json({ ...data, isLocal: false, downloadUrl: undefined });
  }

  // Demo quizzes
  const demo = demoQuizzes.find((q) => q.id === id);
  if (demo) return res.json({ ...demo, isLocal: false, downloadUrl: undefined });

  // Default question bank
  const defaults = { default_en: 'en', default_de: 'de' };
  if (!defaults[id]) return res.status(404).json({ error: 'Quiz not found' });

  const lang = defaults[id];
  const allQuestions = questions.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    text: q[lang].text,
    options: q[lang].options,
    correct: q.correct,
    reference: references[q.id]?.[lang] || '',
  }));
  const entry = DEFAULT_QUIZZES.find((q) => q.id === id);
  res.json({ ...entry, questions: allQuestions, isLocal: false, downloadUrl: undefined });
});

app.listen(PORT, () => {
  console.log(`Biblionaire server running on http://localhost:${PORT}`);
});
