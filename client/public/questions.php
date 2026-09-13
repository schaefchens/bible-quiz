<?php
/**
 * Bible Millionaire – AI Question Generator
 *
 * Generates 80 Christian Bible quiz questions via the OpenAI API — 15 per
 * difficulty level 1–5, plus 5 at level 6 (the final-question tier, q076–q080)
 * — and caches the result for 24 hours.
 *
 * Deployed to /api/ on the web server by scripts/deploy.sh, not next to the
 * built app. Example: https://yoursite.de/api/questions.php?lang=de
 *
 * Parameters
 *   lang    = de | en   (default: de)
 *   refresh = 1          (bypass cache and regenerate)
 *
 * SECURITY: The OpenAI API key lives in secrets.php (same directory),
 * which is gitignored. Copy secrets.php.example to secrets.php and fill
 * in your key before deploying.
 */

require __DIR__ . '/secrets.php'; // defines OPENAI_API_KEY
define('OPENAI_MODEL',   'gpt-4o');
define('CACHE_TTL',      86400); // seconds – regenerate after 24 h

set_time_limit(300);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// ── Input validation ──────────────────────────────────────────────────────────

$lang    = in_array($_GET['lang'] ?? '', ['de', 'en']) ? $_GET['lang'] : 'de';
$refresh = !empty($_GET['refresh']);

// ── Cache ─────────────────────────────────────────────────────────────────────

$cacheDir  = __DIR__ . '/qcache';
$cacheFile = $cacheDir . "/biblionaire_q_{$lang}.json";

if (!is_dir($cacheDir)) {
    @mkdir($cacheDir, 0755, true);
    // Prevent direct HTTP access to cached JSON files
    $htaccess = $cacheDir . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Require all denied\n");
    }
}

if (!$refresh && file_exists($cacheFile) && (time() - filemtime($cacheFile)) < CACHE_TTL) {
    readfile($cacheFile);
    exit;
}

// ── Generation ────────────────────────────────────────────────────────────────

// Load persistent question history (capped at last 150 questions across regenerations)
$historyFile = $cacheDir . "/qhistory_{$lang}.json";
$history     = [];
if (file_exists($historyFile)) {
    $raw = @file_get_contents($historyFile);
    if ($raw) $history = json_decode($raw, true) ?: [];
}

try {
    $all         = [];
    $usedTexts   = array_slice($history, -150); // start with persistent history
    $topicPool   = getTopicPool($lang);

    for ($diff = 1; $diff <= 5; $diff++) {
        $topics = pickTopics($topicPool, 3);
        $batch  = generateBatch($lang, $diff, ($diff - 1) * 15 + 1, $usedTexts, $topics);
        $batch  = verifyBatch($batch, $lang, $diff);
        foreach ($batch as $q) { $usedTexts[] = $q['text']; }
        $all = array_merge($all, $batch);
    }
    // Difficulty 6: 5 "final question" calibre questions (IDs q076–q080)
    $batch6 = generateBatch($lang, 6, 76, $usedTexts, pickTopics($topicPool, 2));
    $all    = array_merge($all, verifyBatch($batch6, $lang, 6));

    // Persist new question texts to history (keep last 300 total)
    $newTexts    = array_map(fn($q) => $q['text'], $all);
    $merged      = array_values(array_unique(array_merge($history, $newTexts)));
    $trimmed     = array_slice($merged, -300);
    file_put_contents($historyFile, json_encode($trimmed, JSON_UNESCAPED_UNICODE));

    $json = json_encode($all, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    file_put_contents($cacheFile, $json);
    echo $json;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTopicPool(string $lang): array
{
    return $lang === 'de' ? [
        'Schöpfung und Urgeschichte', 'Abraham und die Erzväter', 'Mose und der Auszug aus Ägypten',
        'Josua und die Landnahme', 'Richter Israels', 'Saul, David und Salomo',
        'Die geteilte Monarchie und die Könige Israels', 'Alttestamentliche Propheten',
        'Psalmen und Weisheitsliteratur', 'Esther, Rut und die Schriften',
        'Esra, Nehemia und die Rückkehr aus dem Exil', 'Das Leben und die Lehren Jesu',
        'Gleichnisse Jesu', 'Wunder Jesu', 'Die Bergpredigt und die Reden Jesu',
        'Leiden, Tod und Auferstehung Jesu', 'Die Apostelgeschichte und die Urgemeinde',
        'Paulusbriefe', 'Andere neutestamentliche Briefe', 'Die Offenbarung des Johannes',
        'Biblische Theologie und Glaubenslehre', 'Kirchengeschichte und Kirchenväter',
        'Bibelkunde und Kanon', 'Das Gebet und die Anbetung in der Bibel',
        'Biblische Zahlen und Symbole',
    ] : [
        'Creation and the early history of the world', 'Abraham and the patriarchs',
        'Moses and the Exodus', 'Joshua and the conquest of Canaan', 'The judges of Israel',
        'Saul, David and Solomon', 'The divided monarchy and the kings of Israel',
        'Old Testament prophets', 'Psalms and wisdom literature', 'Esther, Ruth and the Writings',
        'Ezra, Nehemiah and the return from exile', 'The life and teachings of Jesus',
        'Parables of Jesus', 'Miracles of Jesus', 'The Sermon on the Mount and Jesus\' discourses',
        'The passion, death and resurrection of Jesus', 'Acts and the early church',
        'Letters of Paul', 'Other New Testament letters', 'The book of Revelation',
        'Biblical theology and doctrine', 'Church history and the church fathers',
        'The Bible and its canon', 'Prayer and worship in the Bible',
        'Biblical numbers and symbols',
    ];
}

function pickTopics(array $pool, int $n): array
{
    $keys = array_rand($pool, min($n, count($pool)));
    return array_map(fn($k) => $pool[$k], (array)$keys);
}

function generateBatch(string $lang, int $diff, int $startId, array $alreadyUsed = [], array $topics = []): array
{
    $langName  = $lang === 'de' ? 'German' : 'English';
    $refFormat = $lang === 'de'
        ? '1. Mose 1,1  or  Matthäus 5,3–12  or  Johannes 3,16'
        : 'Genesis 1:1  or  Matthew 5:3–12  or  John 3:16';

    $diffDesc = [
        1 => 'very easy – basic Bible knowledge, most well-known stories and figures',
        2 => 'easy – common Bible stories and named characters',
        3 => 'medium – requires solid Bible knowledge',
        4 => 'hard – detailed knowledge of specific Bible verses and events',
        5 => 'very hard – expert level, lesser-known details, church history, original languages',
        6 => 'ULTIMATE (final question only) – theology PhD level: obscure Greek/Hebrew terms, early church councils, patristic authors, specific textual variants, rarely-known doctrinal distinctions',
    ][$diff];

    $count   = $diff === 6 ? 5 : 15;
    $firstId = 'q' . str_pad($startId,            3, '0', STR_PAD_LEFT);
    $lastId  = 'q' . str_pad($startId + $count - 1, 3, '0', STR_PAD_LEFT);

    $topicHint = '';
    if (!empty($topics)) {
        $topicList = implode(', ', $topics);
        $topicHint = "\n- Focus questions on these topic areas (sub-topics are fine too): {$topicList}.";
    }

    $avoidHint = '';
    if (!empty($alreadyUsed)) {
        $list = implode("\n", array_map(fn($t) => "  - {$t}", $alreadyUsed));
        $avoidHint = "\n\nAlready used questions – do NOT repeat or closely paraphrase any of these:\n{$list}";
    }

    $prompt = <<<PROMPT
Generate exactly {$count} Christian Bible quiz questions in {$langName}.
Difficulty: {$diff} ({$diffDesc})
IDs: {$firstId} through {$lastId}

Return a JSON object with a single key "questions" whose value is an array of exactly {$count} items.
Each item has these fields:
  "id"            – sequential string, e.g. "q001"
  "difficulty"    – integer {$diff}
  "text"          – the question, in {$langName}
  "correct_answer"– a single string: the ONE correct answer in {$langName}
  "wrong_answers" – array of exactly 3 strings: answers that are clearly and definitively wrong
  "reference"     – a real, verifiable Bible passage in {$langName} format, e.g. {$refFormat}

Do NOT include an "options" array or a "correct" index — the server handles shuffling.
Your only job is to provide the one right answer and three wrong ones.

CRITICAL ACCURACY RULES – violating any of these makes the question unusable:
1. Every question and every answer MUST be 100 % biblically accurate and verifiable from the Bible text.
2. "correct_answer" must be unambiguously correct according to Scripture.
3. Each item in "wrong_answers" must be clearly and definitively incorrect — not just less likely, but genuinely wrong.
4. NEVER invent biblical events, confuse persons, or attribute actions to someone who did not perform them.
5. "reference" must point to a passage that actually supports the correct answer — do not fabricate references.
6. MULTIPLE-CORRECT-ANSWER TRAP — this is the most common error. Before writing each "wrong_answers" entry ask yourself: "Could this also be a correct answer to my question?" If yes, rewrite the question or replace that distractor.
   - BAD question: "Who was thrown into the fiery furnace?" → Shadrach IS correct, Abednego IS correct — invalid.
   - BAD question: "Who was an apostle of Jesus?" → Peter IS correct, John IS correct — invalid.
   - GOOD question: "What did King Nebuchadnezzar see as a fourth figure in the furnace?" → only one answer.
   - GOOD question: "Which apostle denied Jesus three times?" → only Peter.
   If an event involved a group, ask about a unique detail (how many, the king's reaction, what happened next) rather than naming group members as options.

Additional rules:
- All text (question + all answers) must be in {$langName}.
- Topics: Bible stories, persons, theology, church history, the life of Jesus.{$topicHint}
- Avoid the most famous, overused quiz questions. Prefer specific verse details, lesser-known figures, precise numbers, geographical and cultural context.
- Before finalising each question, silently verify: (a) the biblical event is real, (b) correct_answer is genuinely the right answer, (c) every wrong_answer is individually and clearly wrong.{$avoidHint}
PROMPT;

    $raw     = callOpenAI($prompt);
    $decoded = json_decode($raw, true);

    if (!isset($decoded['questions']) || !is_array($decoded['questions'])) {
        throw new Exception("Unexpected OpenAI response for difficulty {$diff}: {$raw}");
    }

    // Build final format: shuffle options in PHP so the model never has to track indices.
    $out = [];
    foreach (array_slice($decoded['questions'], 0, $count) as $i => $q) {
        $correctAnswer = (string)($q['correct_answer'] ?? '');
        $wrongAnswers  = array_values(array_slice((array)($q['wrong_answers'] ?? []), 0, 3));
        while (count($wrongAnswers) < 3) $wrongAnswers[] = '—';

        $options = array_merge([$correctAnswer], $wrongAnswers);
        shuffle($options);
        $correct = (int)array_search($correctAnswer, $options, true);

        $out[] = [
            'id'         => 'q' . str_pad($startId + $i, 3, '0', STR_PAD_LEFT),
            'difficulty' => $diff,
            'text'       => (string)($q['text'] ?? ''),
            'options'    => $options,
            'correct'    => $correct,
            'reference'  => (string)($q['reference'] ?? ''),
        ];
    }
    return $out;
}

function verifyBatch(array $questions, string $lang, int $diff): array
{
    $langName = $lang === 'de' ? 'German' : 'English';

    // Convert shuffled format back to correct_answer/wrong_answers so the verifier
    // never has to reason about indices — it just checks facts.
    $preShuffled = [];
    foreach ($questions as $q) {
        $correctAnswer = $q['options'][$q['correct']] ?? '';
        $wrongAnswers  = array_values(array_filter(
            $q['options'],
            fn($o, $idx) => $idx !== $q['correct'],
            ARRAY_FILTER_USE_BOTH
        ));
        $preShuffled[] = [
            'id'             => $q['id'],
            'difficulty'     => $q['difficulty'],
            'text'           => $q['text'],
            'correct_answer' => $correctAnswer,
            'wrong_answers'  => $wrongAnswers,
            'reference'      => $q['reference'],
        ];
    }

    $inputJson = json_encode(['questions' => $preShuffled], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    $prompt = <<<PROMPT
You are a strict biblical fact-checker. Below are Bible quiz questions in {$langName} at difficulty {$diff}.
Each question has "correct_answer" (the intended right answer) and "wrong_answers" (three intended distractors).

For EACH question examine:
1. Does the question describe a real, verifiable biblical event or fact?
2. Is "correct_answer" genuinely and unambiguously correct according to Scripture?
3. Is EVERY item in "wrong_answers" clearly and definitively wrong — could ANY of them also be a valid answer?
4. MULTIPLE-CORRECT-ANSWER CHECK (most common error): Ask yourself: "If a player chose one of the wrong_answers, would they actually be right?" If yes, that distractor must be replaced or the question must be rewritten.
   Example of invalid question: "Who was thrown into the fiery furnace?" with wrong_answers including Abednego — Abednego IS correct, so the question fails.
   Fix: rewrite the question to have a unique answer (e.g. "What did Nebuchadnezzar see as the fourth figure in the furnace?").

If a question is fully accurate, return it unchanged.
If a question contains ANY error:
- correct_answer is wrong → fix it (provide the biblically correct answer).
- A wrong_answer could also be correct → replace it with a clearly wrong distractor, OR rewrite the question to be specific enough that only one answer is right.
- Multiple wrong_answers are valid → rewrite the question entirely.
- Fabricated event, wrong name, wrong number → fix or replace the question entirely.

Return ONLY valid JSON: {"questions": [...]} with the same fields (id, difficulty, text, correct_answer, wrong_answers, reference), same number of items.

{$inputJson}
PROMPT;

    $raw     = callOpenAI($prompt);
    $decoded = json_decode($raw, true);

    if (!isset($decoded['questions']) || !is_array($decoded['questions'])) {
        return $questions; // verification call failed – keep originals
    }

    // Re-shuffle verified questions and rebuild final format
    $out = [];
    foreach (array_slice($decoded['questions'], 0, count($questions)) as $i => $q) {
        $orig          = $questions[$i];
        $correctAnswer = (string)($q['correct_answer'] ?? $orig['options'][$orig['correct']]);
        $wrongAnswers  = array_values(array_slice((array)($q['wrong_answers'] ?? []), 0, 3));
        while (count($wrongAnswers) < 3) $wrongAnswers[] = '—';

        $options = array_merge([$correctAnswer], $wrongAnswers);
        shuffle($options);
        $correct = (int)array_search($correctAnswer, $options, true);

        $out[] = [
            'id'         => $orig['id'],
            'difficulty' => $orig['difficulty'],
            'text'       => (string)($q['text'] ?? $orig['text']),
            'options'    => $options,
            'correct'    => $correct,
            'reference'  => (string)($q['reference'] ?? $orig['reference']),
        ];
    }
    return $out;
}

function callOpenAI(string $userPrompt): string
{
    $payload = json_encode([
        'model'           => OPENAI_MODEL,
        'messages'        => [
            [
                'role'    => 'system',
                'content' => 'You are a Christian Bible quiz question generator with expert-level biblical knowledge. Always respond with valid JSON only, no markdown fences. Your absolute top priority is biblical accuracy: every question, every correct answer, and every wrong answer must be factually accurate according to Scripture. Never invent biblical events, confuse biblical persons, or attribute deeds to the wrong person. Each question must have exactly one correct answer — never write a wrong_answers entry that could also be a valid answer to the question. Actively avoid the most obvious, overused quiz questions. Prefer specific verse details, lesser-known characters, precise numbers, geographical facts, and unusual angles on familiar stories.',
            ],
            [
                'role'    => 'user',
                'content' => $userPrompt,
            ],
        ],
        'response_format' => ['type' => 'json_object'],
        'max_tokens'      => 6000,
        'temperature'     => 0.5,
    ]);

    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 90,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . OPENAI_API_KEY,
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr  = curl_error($ch);
    curl_close($ch);

    if ($curlErr)       throw new Exception("cURL error: {$curlErr}");
    if ($httpCode !== 200) throw new Exception("OpenAI HTTP {$httpCode}: {$response}");

    $data = json_decode($response, true);
    if (!isset($data['choices'][0]['message']['content'])) {
        throw new Exception("Missing content in OpenAI response: {$response}");
    }

    return $data['choices'][0]['message']['content'];
}
