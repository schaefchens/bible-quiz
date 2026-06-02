/**
 * Adds a `reference` field (Bible passage) to every question in both
 * questions_de.json and questions_en.json.
 * Run: node scripts/add-references.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// id → { de, en }  — one entry per question
const REFS = {
  // ── Difficulty 1 ─────────────────────────────────────────────────────────
  q001: { de: 'Matthäus 4,23; Markus 1,1; Lukas 1,1; Johannes 1,1',  en: 'Matthew 4:23; Mark 1:1; Luke 1:1; John 1:1' },
  q002: { de: '1. Mose 1,1',           en: 'Genesis 1:1' },
  q003: { de: 'Lukas 2,4–7',           en: 'Luke 2:4–7' },
  q004: { de: 'Matthäus 10,1–4',       en: 'Matthew 10:1–4' },
  q005: { de: 'Matthäus 3,13–17',      en: 'Matthew 3:13–17' },
  q006: { de: 'Matthäus 3,13',         en: 'Matthew 3:13' },
  q007: { de: 'Matthäus 4,1–2',        en: 'Matthew 4:1–2' },
  q008: { de: 'Matthäus 13,55',        en: 'Matthew 13:55' },
  q009: { de: 'Lukas 1,30–31',         en: 'Luke 1:30–31' },
  q010: { de: '2. Mose 20,3',          en: 'Exodus 20:3' },
  q011: { de: 'Lukas 2,1–20',          en: 'Luke 2:1–20' },
  q012: { de: 'Matthäus 28,1–10',      en: 'Matthew 28:1–10' },
  q013: { de: '2. Samuel 23,1–2',      en: '2 Samuel 23:1–2' },
  q014: { de: '1. Mose 7,12',          en: 'Genesis 7:12' },
  q015: { de: '1. Mose 9,13–16',       en: 'Genesis 9:13–16' },
  // ── Difficulty 2 ─────────────────────────────────────────────────────────
  q016: { de: 'Matthäus 26,14–16',     en: 'Matthew 26:14–16' },
  q017: { de: 'Matthäus 26,69–75',     en: 'Matthew 26:69–75' },
  q018: { de: 'Jesaja 7,14',           en: 'Isaiah 7:14' },
  q019: { de: 'Psalm 23,1',            en: 'Psalm 23:1' },
  q020: { de: 'Lukas 1,26–27',         en: 'Luke 1:26–27' },
  q021: { de: '1. Mose 2,7',           en: 'Genesis 2:7' },
  q022: { de: '1. Mose 2,21–22',       en: 'Genesis 2:21–22' },
  q023: { de: 'Jona 1,17',             en: 'Jonah 1:17' },
  q024: { de: '2. Mose 19–20',         en: 'Exodus 19–20' },
  q025: { de: 'Matthäus 3,16',         en: 'Matthew 3:16' },
  q026: { de: '1. Samuel 10,1',        en: '1 Samuel 10:1' },
  q027: { de: 'Matthäus 22,37–39',     en: 'Matthew 22:37–39' },
  q028: { de: 'Römer 1,1 (NT-Briefe)', en: 'Romans 1:1 (NT letters)' },
  q029: { de: 'Matthäus 26,36',        en: 'Matthew 26:36' },
  q030: { de: 'Römer 1,1',             en: 'Romans 1:1' },
  // ── Difficulty 3 ─────────────────────────────────────────────────────────
  q031: { de: '2. Timotheus 3,16',     en: '2 Timothy 3:16' },
  q032: { de: 'Psalm 1–150',           en: 'Psalm 1–150' },
  q033: { de: '1. Mose 17,15',         en: 'Genesis 17:15' },
  q034: { de: 'Offenbarung 1,1',       en: 'Revelation 1:1' },
  q035: { de: 'Matthäus 2,11',         en: 'Matthew 2:11' },
  q036: { de: '2. Mose 4,14',          en: 'Exodus 4:14' },
  q037: { de: 'Apostelgeschichte 2,1–4', en: 'Acts 2:1–4' },
  q038: { de: 'Offenbarung 22,20',     en: 'Revelation 22:20' },
  q039: { de: '1. Mose 35,22–26',      en: 'Genesis 35:22–26' },
  q040: { de: '1. Mose 22,1–2',        en: 'Genesis 22:1–2' },
  q041: { de: 'Johannes 20,24–25',     en: 'John 20:24–25' },
  q042: { de: 'Apostelgeschichte 9,1', en: 'Acts 9:1' },
  q043: { de: 'Johannes 2,1',          en: 'John 2:1' },
  q044: { de: 'Johannes 2,1–11',       en: 'John 2:1–11' },
  q045: { de: 'Matthäus 6,9–13',       en: 'Matthew 6:9–13' },
  // ── Difficulty 4 ─────────────────────────────────────────────────────────
  q046: { de: '4. Mose 3,6–10',        en: 'Numbers 3:6–10' },
  q047: { de: '1. Mose 8,4',           en: 'Genesis 8:4' },
  q048: { de: 'Psalm 150',             en: 'Psalm 150' },
  q049: { de: '1. Könige 1,28–30',     en: '1 Kings 1:28–30' },
  q050: { de: 'Johannes 20,19',        en: 'John 20:19' },
  q051: { de: 'Matthäus 9,9',          en: 'Matthew 9:9' },
  q052: { de: '1. Mose 1,1 (Pentateuch)', en: 'Genesis 1:1 (Pentateuch)' },
  q053: { de: 'Lukas 1,1–4',           en: 'Luke 1:1–4' },
  q054: { de: 'Apostelgeschichte 9,3–4', en: 'Acts 9:3–4' },
  q055: { de: 'Johannes 18,24',        en: 'John 18:24' },
  q056: { de: 'Johannes 5,1–9',        en: 'John 5:1–9' },
  q057: { de: 'Apostelgeschichte 1,1', en: 'Acts 1:1' },
  q058: { de: '1. Mose 17,5',          en: 'Genesis 17:5' },
  q059: { de: 'Apostelgeschichte 1,23–26', en: 'Acts 1:23–26' },
  q060: { de: '1. Mose 4,1–2',         en: 'Genesis 4:1–2' },
  // ── Difficulty 5 ─────────────────────────────────────────────────────────
  q061: { de: 'Apostelgeschichte 15,28', en: 'Acts 15:28' },
  q062: { de: 'Johannes 1,14',         en: 'John 1:14' },
  q063: { de: 'Römer 7,24–25',         en: 'Romans 7:24–25' },
  q064: { de: 'Lukas 1,43',            en: 'Luke 1:43' },
  q065: { de: '2. Timotheus 3,16',     en: '2 Timothy 3:16' },
  q066: { de: 'Philipper 2,7',         en: 'Philippians 2:7' },
  q067: { de: 'Johannes 1,1',          en: 'John 1:1' },
  q068: { de: 'Offenbarung 21,1',      en: 'Revelation 21:1' },
  q069: { de: 'Apostelgeschichte 7,59–60', en: 'Acts 7:59–60' },
  q070: { de: '2. Mose 3,14',          en: 'Exodus 3:14' },
  q071: { de: 'Matthäus 28,19–20',     en: 'Matthew 28:19–20' },
  q072: { de: 'Johannes 1,1 (Griechisch: λόγος)', en: 'John 1:1 (Greek: λόγος)' },
  q073: { de: '2. Timotheus 3,16',     en: '2 Timothy 3:16' },
  q074: { de: '1. Mose 14,18',         en: 'Genesis 14:18' },
  q075: { de: '1. Mose 2,2',           en: 'Genesis 2:2' },
};

function addRefs(filePath, lang) {
  const questions = JSON.parse(readFileSync(filePath, 'utf8'));
  const updated = questions.map((q) => {
    const ref = REFS[q.id];
    if (!ref) { console.warn(`No reference for ${q.id}`); return q; }
    return { ...q, reference: ref[lang] };
  });
  writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log(`Updated ${filePath} (${updated.length} questions)`);
}

addRefs(join(ROOT, 'client/public/questions_de.json'), 'de');
addRefs(join(ROOT, 'client/public/questions_en.json'), 'en');
console.log('Done.');
