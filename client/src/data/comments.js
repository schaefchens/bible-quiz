// Commentator lines triggered the moment the user PRESELECTS an answer.
// Templates use {{selected}} for the preselected letter and {{correct}} for the right one.
//
// Probability of commenting at all scales with difficulty:
//   diff 1 → 30%   diff 2 → 50%   diff 3 → 65%   diff 4 → 82%   diff 5 → 100%
//
// Helpful hints (subtly pointing toward the correct answer) are only possible on
// diff 1–3, capped at a random per-game budget of 1–3. On diff 4–5 only
// irritating/misleading lines are produced. Helpful budget is consumed at most
// once per question (tracked via usedHelpfulThisQRef).

export const COMMENT_PROB = { 1: 0.30, 2: 0.50, 3: 0.65, 4: 0.82, 5: 1.00 };
export const HELPFUL_PROB = { 1: 0.50, 2: 0.28, 3: 0.10, 4: 0,    5: 0    };

// ─── Irritating / misleading ─────────────────────────────────────────────────
// All reference {{selected}} so the comment feels personal.

export const IRRITATING = {
  de: [
    '{{selected}} – interessante Wahl.',
    'Du hast {{selected}} gewählt? Das ist... mutig.',
    'Hmm, {{selected}}. Ich sage nichts.',
    '{{selected}}... ich hatte denselben Gedanken. Für ungefähr zwei Sekunden.',
    '{{selected}}? Meine Oma hätte das auch genommen. Sie lag oft falsch.',
    'Oh, {{selected}}! Das ist... eine Entscheidung.',
    'Mit {{selected}} zu gehen? Ich bin gespannt.',
    '{{selected}} sieht verlockend aus. Das sag ich immer.',
    '{{selected}}? Okay. Okay okay okay.',
    'Ich hätte {{selected}} auch nicht ausgeschlossen.',
    '{{selected}}... eine sehr... interessante Perspektive.',
    '{{selected}} – da bin ich mal gespannt.',
    'Weißt du, bei {{selected}} fällt mir nichts ein. Das sagt auch viel.',
    '{{selected}} ist mindestens... vorhanden auf dieser Liste.',
    '{{selected}}? Pastor Klaus hätte lange überlegt.',
    'Ich hätte nicht sofort an {{selected}} gedacht. Aber gut.',
    '{{selected}} – damit kann man Glück haben. Oder auch nicht.',
    '{{selected}}. Hmm. Ich schreibe mir das auf.',
    'Ah, {{selected}}! Damit überraschst du mich.',
    '{{selected}}? Ich verrate nichts. Aber ich mache ein Gesicht.',
    '{{selected}} – da steckt bestimmt eine Überlegung dahinter.',
    'Alle außer {{selected}} wären auch möglich. Oder auch nicht.',
    '{{selected}}? Das klingt sowohl richtig als auch... nicht richtig.',
    'Ich bin sicher, dass du dir bei {{selected}} sicher bist. Oder?',
    'Lass mich nichts sagen zu {{selected}}. Das ist das Klügste.',
    '{{selected}}... irgendwas sagt mir das Wort. Weiß leider nicht was.',
    '{{selected}} – ganz solide. Oder war es das?',
    'Bei {{selected}} zucke ich nicht mit der Wimper. Ich übe das.',
    '{{selected}}? Ich hätte eher gefragt als gewählt. Aber das bin ich.',
    '{{selected}}. Nun denn. Die Bibel ist ein großes Buch.',
  ],
  en: [
    '{{selected}} — interesting choice.',
    'You went with {{selected}}? That\'s... bold.',
    'Hmm, {{selected}}. I\'ll say nothing.',
    '{{selected}}... I had the same thought. For about two seconds.',
    '{{selected}}? My grandmother would have picked that too. She was often wrong.',
    'Oh, {{selected}}! That\'s certainly... a decision.',
    'Going with {{selected}}? I\'m curious to see how this plays out.',
    '{{selected}} does look tempting. I always say that.',
    '{{selected}}? Okay. Okay okay okay.',
    'I wouldn\'t have ruled out {{selected}} either.',
    '{{selected}}... a very... interesting perspective.',
    '{{selected}} — I look forward to seeing how this goes.',
    'You know, {{selected}} just leaves me speechless.',
    '{{selected}} is at least... present on this list.',
    '{{selected}}? Pastor Klaus would have thought long and hard.',
    '{{selected}} wasn\'t my first thought. But here we are.',
    '{{selected}} — sometimes that works out. Sometimes not.',
    '{{selected}}. Hmm. I\'m making a note of this.',
    'Ah, {{selected}}! I didn\'t see that coming.',
    '{{selected}}? I won\'t say a word. But look at my face.',
    '{{selected}} — there must be some reasoning behind that.',
    'Everything except {{selected}} was also possible. Or maybe not.',
    '{{selected}}? That sounds both right and... not quite right.',
    'I\'m sure you\'re sure about {{selected}}. Are you?',
    'Let me say nothing about {{selected}}. That\'s the wisest move.',
    '{{selected}}... that word rings a bell. No idea why.',
    '{{selected}} — quite solid. Or was it?',
    'At {{selected}} I don\'t bat an eye. I\'ve been practising.',
    '{{selected}}? I would have asked rather than guessed. But that\'s me.',
    '{{selected}}. Very well then. The Bible is a large book.',
  ],
};

// ─── Helpful — reference both {{selected}} and {{correct}} ───────────────────

export const HELPFUL = {
  de: [
    '{{selected}} klingt gut... wobei ich bei dieser Frage eher an {{correct}} denken würde.',
    'Wenn ich mich recht entsinne, hat {{correct}} etwas damit zu tun – aber {{selected}} ist auch nicht übel.',
    '{{selected}}? Mein Großvater war Pastor und schwor auf {{correct}}. Nur so.',
    'Ich sage nicht, dass {{selected}} falsch ist. Ich sage nur, {{correct}} klingt vertraut.',
    'Interessant, dass du {{selected}} nimmst. Ich hätte {{correct}} getippt.',
    '{{selected}} ist eine Wahl. {{correct}} ist... naja, ich schweige jetzt.',
  ],
  en: [
    '{{selected}} sounds good... though for this question I\'d lean more towards {{correct}}.',
    'If I remember correctly, {{correct}} has something to do with this — but {{selected}} isn\'t bad either.',
    '{{selected}}? My grandfather was a pastor and swore by {{correct}}. Just saying.',
    'I\'m not saying {{selected}} is wrong. I\'m just saying {{correct}} rings a bell.',
    'Interesting that you\'d pick {{selected}}. I\'d have guessed {{correct}}.',
    '{{selected}} is a choice. {{correct}} is... well, I\'ll keep quiet now.',
  ],
};

// ─── Generator ───────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Called when the user PRESELECTS an answer.
 *
 * @param {object} question           - { difficulty, correct, options }
 * @param {string} lang               - 'de' | 'en'
 * @param {object} budgetRef          - React ref: { current: number } — per-game helpful quota
 * @param {number} selectedIndex      - 0-based index of the preselected answer
 * @param {object} usedThisQRef       - React ref: { current: boolean } — prevents double helpful per Q
 * @returns {string|null}
 */
export function generateComment(question, lang, budgetRef, selectedIndex, usedThisQRef) {
  const diff = question.difficulty;

  if (Math.random() > (COMMENT_PROB[diff] ?? 1)) return null;

  const selectedLetter = ['A', 'B', 'C', 'D'][selectedIndex] ?? '?';
  const correctLetter  = ['A', 'B', 'C', 'D'][question.correct] ?? '?';

  const canHelp = (
    budgetRef.current > 0
    && diff <= 3
    && usedThisQRef != null
    && !usedThisQRef.current
  );
  const isHelpful = canHelp && Math.random() < (HELPFUL_PROB[diff] ?? 0);

  let template;
  if (isHelpful) {
    budgetRef.current     -= 1;
    usedThisQRef.current   = true;
    template = pick(HELPFUL[lang] ?? HELPFUL.en);
  } else {
    template = pick(IRRITATING[lang] ?? IRRITATING.en);
  }

  return template
    .replace(/\{\{selected\}\}/g, selectedLetter)
    .replace(/\{\{correct\}\}/g,  correctLetter);
}
