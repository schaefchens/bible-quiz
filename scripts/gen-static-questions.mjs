/**
 * Generates client/public/questions_de.json and questions_en.json
 * from the server question bank. Run once: node scripts/gen-static-questions.mjs
 * Re-run whenever server/data/questions.js changes.
 */
import { questions } from '../server/data/questions.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'client', 'public');
mkdirSync(outDir, { recursive: true });

for (const lang of ['de', 'en']) {
  const data = questions.map((q) => ({
    id: q.id,
    difficulty: q.difficulty,
    text: q[lang].text,
    options: q[lang].options,
    correct: q.correct,
  }));
  const dest = join(outDir, `questions_${lang}.json`);
  writeFileSync(dest, JSON.stringify(data, null, 2) + '\n');
  console.log(`wrote ${dest}  (${data.length} questions)`);
}
