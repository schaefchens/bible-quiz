<?php
/**
 * Bible Millionaire – Quiz Registry
 *
 * GET quizzes.php           → registry listing
 * GET quizzes.php?download=<id> → full quiz download
 * POST quizzes.php          → publish / update a quiz (body: {quiz, secret})
 * OPTIONS quizzes.php       → CORS preflight
 *
 * Published quizzes are stored in published/{id}.json (quiz data)
 * and published/{id}.hash (SHA-256 of the owner's secret).
 * The hash file is never served directly.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$publishDir = __DIR__ . '/published';
$download   = $_GET['download'] ?? null;
$proto      = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$baseUrl    = $proto . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\') . '/';

// Maps quiz ID → bilingual source key + language
$demoIdMap = [
    'otqe' => ['src' => 'ot', 'lang' => 'en'],
    'otqd' => ['src' => 'ot', 'lang' => 'de'],
    'ntqe' => ['src' => 'nt', 'lang' => 'en'],
    'ntqd' => ['src' => 'nt', 'lang' => 'de'],
    'wbqe' => ['src' => 'wb', 'lang' => 'en'],
    'wbqd' => ['src' => 'wb', 'lang' => 'de'],
];

$reservedIds = array_merge(['default_en', 'default_de', 'gale', 'gald', 'bibe', 'bibd'], array_keys($demoIdMap));

// ── POST: publish / update a quiz ────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body   = json_decode(file_get_contents('php://input'), true);
    $quiz   = $body['quiz']   ?? null;
    $secret = $body['secret'] ?? '';

    if (!$quiz || !isset($quiz['id']) || !$secret) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing quiz or secret']);
        exit;
    }

    $id = $quiz['id'];
    if (!preg_match('/^[a-z0-9]{1,20}$/', $id)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid quiz ID']);
        exit;
    }
    if (in_array($id, $reservedIds, true)) {
        http_response_code(403);
        echo json_encode(['error' => 'Reserved quiz ID']);
        exit;
    }

    if (!is_dir($publishDir)) mkdir($publishDir, 0755, true);

    $hashFile  = $publishDir . '/' . $id . '.hash';
    $quizFile  = $publishDir . '/' . $id . '.json';
    $incomingHash = hash('sha256', $secret);

    if (file_exists($hashFile)) {
        $storedHash = trim(file_get_contents($hashFile));
        if (!hash_equals($storedHash, $incomingHash)) {
            http_response_code(403);
            echo json_encode(['error' => 'Wrong secret']);
            exit;
        }
    }

    $now = date('c');
    unset($quiz['secret']);
    $stored = array_merge($quiz, ['isPublished' => true, 'updatedAt' => $now]);

    file_put_contents($hashFile, $incomingHash);
    file_put_contents($quizFile, json_encode($stored, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    echo json_encode(['success' => true, 'id' => $id, 'updatedAt' => $now]);
    exit;
}

// ── DELETE: remove a published quiz ──────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $body   = json_decode(file_get_contents('php://input'), true);
    $id     = $body['id']     ?? null;
    $secret = $body['secret'] ?? '';

    if (!$id || !$secret) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing id or secret']);
        exit;
    }

    $hashFile = $publishDir . '/' . $id . '.hash';
    $quizFile = $publishDir . '/' . $id . '.json';

    if (!file_exists($hashFile)) {
        http_response_code(404);
        echo json_encode(['error' => 'Quiz not found']);
        exit;
    }

    $storedHash   = trim(file_get_contents($hashFile));
    $incomingHash = hash('sha256', $secret);
    if (!hash_equals($storedHash, $incomingHash)) {
        http_response_code(403);
        echo json_encode(['error' => 'Wrong secret']);
        exit;
    }

    @unlink($hashFile);
    @unlink($quizFile);
    echo json_encode(['success' => true]);
    exit;
}

// ── Build registry ────────────────────────────────────────────────────────────

$registry = [
    ['id' => 'default_en', 'name' => 'Bible Millionaire – Standard English',       'description' => 'The official Bible Millionaire question bank generated fresh by AI. 80 questions across 6 difficulty levels.', 'author' => 'Bible Millionaire Team', 'version' => '1.0', 'language' => 'en', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=default_en'],
    ['id' => 'default_de', 'name' => 'Bibel-Millionär – Standard Deutsch',        'description' => 'Der offizielle Bibel-Millionär-Fragenkatalog, KI-generiert. 80 Fragen über 6 Schwierigkeitsstufen.',         'author' => 'Bibel-Millionär Team',  'version' => '1.0', 'language' => 'de', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=default_de'],
    ['id' => 'otqe',       'name' => 'Old Testament Quiz',                   'description' => 'Journey through the Hebrew scriptures: creation, the patriarchs, the law, the prophets, and more.',        'author' => 'Bible Millionaire Team', 'version' => '1.0', 'language' => 'en', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=otqe'],
    ['id' => 'otqd',       'name' => 'Altes-Testament-Quiz',                 'description' => 'Reise durch die hebräischen Schriften: Schöpfung, Patriarchen, das Gesetz, die Propheten und mehr.',       'author' => 'Bibel-Millionär Team',  'version' => '1.0', 'language' => 'de', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=otqd'],
    ['id' => 'ntqe',       'name' => 'New Testament Quiz',                   'description' => 'Test your knowledge of the Gospels, Acts, the letters of Paul, and the book of Revelation.',                'author' => 'Bible Millionaire Team', 'version' => '1.0', 'language' => 'en', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=ntqe'],
    ['id' => 'ntqd',       'name' => 'Neues-Testament-Quiz',                 'description' => 'Teste dein Wissen über die Evangelien, die Apostelgeschichte, die Paulusbriefe und die Offenbarung.',       'author' => 'Bibel-Millionär Team',  'version' => '1.0', 'language' => 'de', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=ntqd'],
    ['id' => 'wbqe',       'name' => 'Whole Bible Quiz',                     'description' => 'A broad survey spanning both testaments — people, places, events, and theology across all 66 books.',        'author' => 'Bible Millionaire Team', 'version' => '1.0', 'language' => 'en', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=wbqe'],
    ['id' => 'wbqd',       'name' => 'Gesamte-Bibel-Quiz',                   'description' => 'Ein breiter Überblick über beide Testamente – Personen, Orte, Ereignisse und Theologie durch alle 66 Bücher.', 'author' => 'Bibel-Millionär Team', 'version' => '1.0', 'language' => 'de', 'isPublished' => true, 'downloadUrl' => $baseUrl . 'quizzes.php?download=wbqd'],
];

// Append user-published quizzes
$publishedEntries = loadPublishedRegistry($publishDir, $baseUrl);
$publishedIds     = array_column($publishedEntries, 'id');
// Remove any static entries overridden by a published version
$registry = array_filter($registry, fn($e) => !in_array($e['id'], $publishedIds, true));
$registry = array_values(array_merge($registry, $publishedEntries));

// ── GET: registry listing ─────────────────────────────────────────────────────

if (!$download) {
    $bilingual = demoData();
    foreach ($registry as &$entry) {
        if (in_array($entry['id'], ['default_en', 'default_de'])) {
            $entry['questionCount'] = count(loadStaticQuestions($entry['language']));
        } elseif (isset($demoIdMap[$entry['id']])) {
            $src = $demoIdMap[$entry['id']]['src'];
            $entry['questionCount'] = $entry['questionCount'] ?? count($bilingual[$src] ?? []);
        }
        // published quizzes already have questionCount set
    }
    unset($entry);
    echo json_encode(array_values($registry), JSON_UNESCAPED_UNICODE);
    exit;
}

// ── GET: full quiz download ───────────────────────────────────────────────────

// User-published quiz
$quizFile = $publishDir . '/' . $download . '.json';
if (file_exists($quizFile)) {
    $data = json_decode(file_get_contents($quizFile), true);
    $data['isLocal']     = false;
    $data['downloadUrl'] = null;
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Demo quiz
if (isset($demoIdMap[$download])) {
    $map  = $demoIdMap[$download];
    $data = demoData();
    $meta = null;
    foreach ($registry as $e) {
        if ($e['id'] === $download) { $meta = $e; break; }
    }
    echo json_encode(array_merge($meta ?? [], [
        'questions'   => flattenQuestions($data[$map['src']] ?? [], $map['lang']),
        'isLocal'     => false,
        'downloadUrl' => null,
    ]), JSON_UNESCAPED_UNICODE);
    exit;
}

// Default question bank
$defaultMap = ['default_en' => 'en', 'default_de' => 'de'];
if (!isset($defaultMap[$download])) {
    http_response_code(404);
    echo json_encode(['error' => 'Quiz not found']);
    exit;
}

$ql        = $defaultMap[$download];
$questions = loadStaticQuestions($ql);
if (empty($questions)) {
    http_response_code(503);
    echo json_encode(['error' => 'Questions not available – generate them first via questions.php']);
    exit;
}
$meta = null;
foreach ($registry as $e) {
    if ($e['id'] === $download) { $meta = $e; break; }
}
echo json_encode(array_merge($meta ?? [], [
    'questions'   => $questions,
    'isLocal'     => false,
    'downloadUrl' => null,
]), JSON_UNESCAPED_UNICODE);

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadPublishedRegistry(string $dir, string $baseUrl): array
{
    if (!is_dir($dir)) return [];
    $result = [];
    foreach (glob($dir . '/*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if (!is_array($data) || !isset($data['id'])) continue;
        $id = $data['id'];
        $result[] = [
            'id'            => $id,
            'name'          => $data['name'] ?? '',
            'description'   => $data['description'] ?? '',
            'author'        => $data['author'] ?? '',
            'version'       => $data['version'] ?? '1.0',
            'language'      => $data['language'] ?? 'en',
            'isPublished'   => true,
            'updatedAt'     => $data['updatedAt'] ?? null,
            'questionCount' => count($data['questions'] ?? []),
            'downloadUrl'   => $baseUrl . 'quizzes.php?download=' . urlencode($id),
        ];
    }
    return $result;
}

function loadStaticQuestions(string $lang): array
{
    foreach ([__DIR__ . "/qcache/biblionaire_q_{$lang}.json", __DIR__ . "/questions_{$lang}.json"] as $f) {
        if (file_exists($f)) {
            $d = json_decode(file_get_contents($f), true);
            if (is_array($d)) return $d;
        }
    }
    return [];
}

function flattenQuestions(array $qs, string $lang): array
{
    return array_map(fn($q) => [
        'id'         => $q['id'],
        'difficulty' => $q['difficulty'],
        'text'       => $q[$lang]['text'],
        'options'    => $q[$lang]['options'],
        'correct'    => $q['correct'],
        'reference'  => $q['reference'],
    ], $qs);
}

function demoData(): array
{
    return [
        'ot' => [
            ['id'=>'ot01','difficulty'=>1,'de'=>['text'=>'Wer baute die Arche, um sich und seine Familie vor der Sintflut zu retten?','options'=>['Abraham','Mose','Noah','David']],'en'=>['text'=>'Who built the ark to save himself and his family from the flood?','options'=>['Abraham','Moses','Noah','David']],'correct'=>2,'reference'=>'Genesis 6:14'],
            ['id'=>'ot02','difficulty'=>1,'de'=>['text'=>'Wer war der erste Mensch, den Gott erschuf?','options'=>['Abel','Adam','Seth','Noah']],'en'=>['text'=>'Who was the first human that God created?','options'=>['Abel','Adam','Seth','Noah']],'correct'=>1,'reference'=>'Genesis 2:7'],
            ['id'=>'ot03','difficulty'=>1,'de'=>['text'=>'Wer besiegte den Riesen Goliat mit einer Steinschleuder?','options'=>['Saul','Jonatan','David','Samuel']],'en'=>['text'=>'Who defeated the giant Goliath with a sling and a stone?','options'=>['Saul','Jonathan','David','Samuel']],'correct'=>2,'reference'=>'1 Samuel 17:50'],
            ['id'=>'ot04','difficulty'=>1,'de'=>['text'=>'Was gab Gott Mose auf dem Berg Sinai?','options'=>['Die Bundeslade','Die Zehn Gebote','Das Gelobte Land','Die Bundesrolle']],'en'=>['text'=>'What did God give Moses on Mount Sinai?','options'=>['The Ark of the Covenant','The Ten Commandments','The Promised Land','The Book of the Covenant']],'correct'=>1,'reference'=>'Exodus 20:1–17'],
            ['id'=>'ot05','difficulty'=>2,'de'=>['text'=>'Wie viele Plagen sandte Gott über Ägypten?','options'=>['7','10','12','15']],'en'=>['text'=>'How many plagues did God send upon Egypt?','options'=>['7','10','12','15']],'correct'=>1,'reference'=>'Exodus 7–12'],
            ['id'=>'ot06','difficulty'=>2,'de'=>['text'=>'Wie viele Jahre irrten die Israeliten in der Wüste umher?','options'=>['20','30','40','70']],'en'=>['text'=>'How many years did the Israelites wander in the wilderness?','options'=>['20','30','40','70']],'correct'=>2,'reference'=>'Numbers 14:33'],
            ['id'=>'ot07','difficulty'=>2,'de'=>['text'=>'Wie hieß die Frau Abrahams?','options'=>['Rebekka','Rahel','Rut','Sara']],'en'=>['text'=>'What was the name of Abraham\'s wife?','options'=>['Rebekah','Rachel','Ruth','Sarah']],'correct'=>3,'reference'=>'Genesis 17:15'],
            ['id'=>'ot08','difficulty'=>2,'de'=>['text'=>'Wer war der erste König Israels?','options'=>['David','Salomo','Saul','Samuel']],'en'=>['text'=>'Who was the first king of Israel?','options'=>['David','Solomon','Saul','Samuel']],'correct'=>2,'reference'=>'1 Samuel 10:1'],
            ['id'=>'ot09','difficulty'=>3,'de'=>['text'=>'Welcher Prophet wurde von einem großen Fisch verschluckt?','options'=>['Elija','Amos','Jona','Jesaja']],'en'=>['text'=>'Which prophet was swallowed by a large fish?','options'=>['Elijah','Amos','Jonah','Isaiah']],'correct'=>2,'reference'=>'Jonah 1:17'],
            ['id'=>'ot10','difficulty'=>3,'de'=>['text'=>'Wie hieß die Schwiegermutter von Rut?','options'=>['Hanna','Debora','Naomi','Mirjam']],'en'=>['text'=>'What was the name of Ruth\'s mother-in-law?','options'=>['Hannah','Deborah','Naomi','Miriam']],'correct'=>2,'reference'=>'Ruth 1:4'],
            ['id'=>'ot11','difficulty'=>3,'de'=>['text'=>'Wer folgte Mose als Anführer Israels nach?','options'=>['Aaron','Kaleb','Josua','Eleazar']],'en'=>['text'=>'Who succeeded Moses as leader of Israel?','options'=>['Aaron','Caleb','Joshua','Eleazar']],'correct'=>2,'reference'=>'Joshua 1:1–2'],
            ['id'=>'ot12','difficulty'=>3,'de'=>['text'=>'Welcher Prophet sah ein Tal voller trockener Knochen und sprach Leben darüber?','options'=>['Jeremia','Hesekiel','Jesaja','Sacharja']],'en'=>['text'=>'Which prophet saw a valley of dry bones and prophesied life into them?','options'=>['Jeremiah','Ezekiel','Isaiah','Zechariah']],'correct'=>1,'reference'=>'Ezekiel 37:1–14'],
            ['id'=>'ot13','difficulty'=>4,'de'=>['text'=>'In welcher Stadt lebte Abraham ursprünglich, bevor Gott ihn rief?','options'=>['Ninive','Ur der Chaldäer','Haran','Babel']],'en'=>['text'=>'In which city did Abraham originally live before God called him?','options'=>['Nineveh','Ur of the Chaldeans','Haran','Babylon']],'correct'=>1,'reference'=>'Genesis 11:31'],
            ['id'=>'ot14','difficulty'=>4,'de'=>['text'=>'Welcher Prophet konfrontierte König David wegen seiner Sünde mit Batseba?','options'=>['Elija','Jesaja','Natan','Samuel']],'en'=>['text'=>'Which prophet confronted King David about his sin with Bathsheba?','options'=>['Elijah','Isaiah','Nathan','Samuel']],'correct'=>2,'reference'=>'2 Samuel 12:1–7'],
            ['id'=>'ot15','difficulty'=>4,'de'=>['text'=>'Welcher Hohepriester fand das Buch des Gesetzes zur Zeit König Josias?','options'=>['Abiathar','Hilkija','Zadok','Eleazar']],'en'=>['text'=>'Which high priest found the Book of the Law during King Josiah\'s reign?','options'=>['Abiathar','Hilkiah','Zadok','Eleazar']],'correct'=>1,'reference'=>'2 Kings 22:8'],
            ['id'=>'ot16','difficulty'=>4,'de'=>['text'=>'Was sagte Josua beim Erneuerungsbund kurz vor seinem Tod?','options'=>['"Seid stark und mutig!"','"Wählt heute, wem ihr dienen wollt!"','"Das Gesetz soll euch leiten!"','"Ihr sollt nicht fürchten!"']],'en'=>['text'=>'What did Joshua say to Israel at the covenant renewal just before his death?','options'=>['"Be strong and courageous!"','"Choose this day whom you will serve!"','"Let the law guide you!"','"Do not be afraid!"']],'correct'=>1,'reference'=>'Joshua 24:15'],
            ['id'=>'ot17','difficulty'=>5,'de'=>['text'=>'Welcher Richter Israels gelobte, das Erste aus seinem Haus zu opfern, wenn Gott ihm den Sieg schenkt – und es war seine Tochter?','options'=>['Gideon','Simson','Jeftah','Barak']],'en'=>['text'=>'Which judge vowed to sacrifice the first thing from his house if God gave him victory – and it turned out to be his daughter?','options'=>['Gideon','Samson','Jephthah','Barak']],'correct'=>2,'reference'=>'Judges 11:30–40'],
            ['id'=>'ot18','difficulty'=>5,'de'=>['text'=>'Was befand sich im Stiftszelt hinter dem zweiten Vorhang im Allerheiligsten?','options'=>['Der Räucheraltar','Die Bundeslade','Der Schaubrottisch','Der Menora-Leuchter']],'en'=>['text'=>'What was kept behind the second curtain in the Most Holy Place of the Tabernacle?','options'=>['The altar of incense','The Ark of the Covenant','The table of showbread','The menorah']],'correct'=>1,'reference'=>'Hebrews 9:3–4; Exodus 26:33'],
            ['id'=>'ot19','difficulty'=>5,'de'=>['text'=>'Wie hieß der Sohn Jonathans, dem König David Gnade erwies?','options'=>['Ischboschet','Meribaal','Adonia','Amnon']],'en'=>['text'=>'What was the name of Jonathan\'s son to whom David showed kindness?','options'=>['Ish-bosheth','Mephibosheth','Adonijah','Amnon']],'correct'=>1,'reference'=>'2 Samuel 9:1–7'],
            ['id'=>'ot20','difficulty'=>6,'de'=>['text'=>'Was ist der hebräische Name des ersten Buches Mose, der wörtlich „Im Anfang" bedeutet?','options'=>['Elohim','Berescheit','Schalom','Tora']],'en'=>['text'=>'What is the Hebrew name of the first book of Moses, literally meaning "In the beginning"?','options'=>['Elohim','Bereshit','Shalom','Torah']],'correct'=>1,'reference'=>'Genesis 1:1'],
            ['id'=>'ot21','difficulty'=>6,'de'=>['text'=>'Was geschah laut Levitikus 16 mit dem „Sündenbock" am Versöhnungstag?','options'=>['Er wurde auf dem Altar verbrannt','Er wurde in die Wüste geschickt','Er wurde dem Priester übergeben','Er wurde im Fluss ertränkt']],'en'=>['text'=>'According to Leviticus 16, what happened to the "scapegoat" on the Day of Atonement?','options'=>['It was burned on the altar','It was sent into the wilderness','It was given to the priest','It was drowned in the river']],'correct'=>1,'reference'=>'Leviticus 16:21–22'],
        ],
        'nt' => [
            ['id'=>'nt01','difficulty'=>1,'de'=>['text'=>'In welcher Stadt wurde Jesus geboren?','options'=>['Nazareth','Jerusalem','Bethlehem','Jericho']],'en'=>['text'=>'In which city was Jesus born?','options'=>['Nazareth','Jerusalem','Bethlehem','Jericho']],'correct'=>2,'reference'=>'Luke 2:4–7'],
            ['id'=>'nt02','difficulty'=>1,'de'=>['text'=>'Wer taufte Jesus im Jordan?','options'=>['Petrus','Paulus','Johannes der Täufer','Philippus']],'en'=>['text'=>'Who baptized Jesus in the Jordan river?','options'=>['Peter','Paul','John the Baptist','Philip']],'correct'=>2,'reference'=>'Matthew 3:13–17'],
            ['id'=>'nt03','difficulty'=>1,'de'=>['text'=>'Was war das erste Wunder Jesu?','options'=>['Die Speisung der 5000','Die Auferweckung des Lazarus','Das Wandeln auf dem Wasser','Die Verwandlung von Wasser in Wein']],'en'=>['text'=>'What was Jesus\'s first miracle?','options'=>['Feeding 5,000','Raising Lazarus','Walking on water','Turning water into wine']],'correct'=>3,'reference'=>'John 2:1–11'],
            ['id'=>'nt04','difficulty'=>1,'de'=>['text'=>'Wie viele Jünger berief Jesus in seinen engsten Kreis?','options'=>['7','10','12','14']],'en'=>['text'=>'How many disciples did Jesus choose for his inner circle?','options'=>['7','10','12','14']],'correct'=>2,'reference'=>'Luke 6:13'],
            ['id'=>'nt05','difficulty'=>2,'de'=>['text'=>'Wer verleugnete Jesus dreimal, bevor der Hahn krähte?','options'=>['Jakobus','Johannes','Judas','Petrus']],'en'=>['text'=>'Who denied Jesus three times before the rooster crowed?','options'=>['James','John','Judas','Peter']],'correct'=>3,'reference'=>'Matthew 26:69–75'],
            ['id'=>'nt06','difficulty'=>2,'de'=>['text'=>'Was war der Beruf von Matthäus, bevor er Jesus nachfolgte?','options'=>['Fischer','Zöllner','Zimmermann','Hirte']],'en'=>['text'=>'What was Matthew\'s occupation before he followed Jesus?','options'=>['Fisherman','Tax collector','Carpenter','Shepherd']],'correct'=>1,'reference'=>'Matthew 9:9'],
            ['id'=>'nt07','difficulty'=>2,'de'=>['text'=>'Nach wie vielen Tagen stand Jesus von den Toten auf?','options'=>['1','2','3','7']],'en'=>['text'=>'After how many days did Jesus rise from the dead?','options'=>['1','2','3','7']],'correct'=>2,'reference'=>'Matthew 12:40; 1 Corinthians 15:4'],
            ['id'=>'nt08','difficulty'=>2,'de'=>['text'=>'Was ist das letzte Buch des Neuen Testaments?','options'=>['Judas','Hebräer','1. Johannes','Offenbarung']],'en'=>['text'=>'What is the last book of the New Testament?','options'=>['Jude','Hebrews','1 John','Revelation']],'correct'=>3,'reference'=>'Revelation 22:21'],
            ['id'=>'nt09','difficulty'=>3,'de'=>['text'=>'Auf welcher Insel befand sich Johannes, als er die Offenbarung empfing?','options'=>['Zypern','Malta','Kreta','Patmos']],'en'=>['text'=>'On which island was John when he received the book of Revelation?','options'=>['Cyprus','Malta','Crete','Patmos']],'correct'=>3,'reference'=>'Revelation 1:9'],
            ['id'=>'nt10','difficulty'=>3,'de'=>['text'=>'Wer wurde als Nachfolger des Judas Iskariot in den Zwölferkreis gewählt?','options'=>['Barnabas','Matthias','Stephanus','Silas']],'en'=>['text'=>'Who was chosen to replace Judas Iscariot among the twelve apostles?','options'=>['Barnabas','Matthias','Stephen','Silas']],'correct'=>1,'reference'=>'Acts 1:26'],
            ['id'=>'nt11','difficulty'=>3,'de'=>['text'=>'Welcher Pharisäer kam nachts zu Jesus, um mit ihm zu reden?','options'=>['Gamaliel','Nikodemus','Josef von Arimathäa','Hannas']],'en'=>['text'=>'Which Pharisee came to Jesus at night to speak with him?','options'=>['Gamaliel','Nicodemus','Joseph of Arimathea','Annas']],'correct'=>1,'reference'=>'John 3:1–2'],
            ['id'=>'nt12','difficulty'=>3,'de'=>['text'=>'Wie viele Fische zogen die Jünger in Johannes 21 auf Jesu Weisung ans Netz?','options'=>['99','100','153','200']],'en'=>['text'=>'How many fish did the disciples haul in at Jesus\'s direction in John 21?','options'=>['99','100','153','200']],'correct'=>2,'reference'=>'John 21:11'],
            ['id'=>'nt13','difficulty'=>4,'de'=>['text'=>'Wer war der erste christliche Märtyrer?','options'=>['Jakobus','Stephanus','Philippus','Andreas']],'en'=>['text'=>'Who was the first Christian martyr?','options'=>['James','Stephen','Philip','Andrew']],'correct'=>1,'reference'=>'Acts 7:54–60'],
            ['id'=>'nt14','difficulty'=>4,'de'=>['text'=>'Wie viele Gemeinden werden in der Offenbarung mit Briefen angesprochen?','options'=>['5','6','7','12']],'en'=>['text'=>'How many churches does the book of Revelation address with letters?','options'=>['5','6','7','12']],'correct'=>2,'reference'=>'Revelation 1:11'],
            ['id'=>'nt15','difficulty'=>4,'de'=>['text'=>'Was ist der kürzeste Vers in der Bibel?','options'=>['"Fürchtet euch nicht."','"Gott ist Liebe."','"Jesus weinte."','"Amen."']],'en'=>['text'=>'What is the shortest verse in the Bible?','options'=>['"Fear not."','"God is love."','"Jesus wept."','"Amen."']],'correct'=>2,'reference'=>'John 11:35'],
            ['id'=>'nt16','difficulty'=>4,'de'=>['text'=>'Welcher römische Statthalter verurteilte Jesus zum Tod?','options'=>['Herodes Antipas','Kaiphas','Pontius Pilatus','Festus']],'en'=>['text'=>'Which Roman governor sentenced Jesus to death?','options'=>['Herod Antipas','Caiaphas','Pontius Pilate','Festus']],'correct'=>2,'reference'=>'Matthew 27:26'],
            ['id'=>'nt17','difficulty'=>5,'de'=>['text'=>'In welcher Stadt hatte Paulus eine Vision von einem Mann aus Mazedonien, der ihn um Hilfe bat?','options'=>['Athen','Korinth','Philippi','Troas']],'en'=>['text'=>'In which city did Paul see a vision of a man from Macedonia asking for help?','options'=>['Athens','Corinth','Philippi','Troas']],'correct'=>3,'reference'=>'Acts 16:8–9'],
            ['id'=>'nt18','difficulty'=>5,'de'=>['text'=>'Wie vielen Menschen erschien der auferstandene Jesus laut 1. Korinther 15 auf einmal?','options'=>['100','500','1000','5000']],'en'=>['text'=>'According to 1 Corinthians 15, to how many people did the risen Jesus appear at one time?','options'=>['100','500','1,000','5,000']],'correct'=>1,'reference'=>'1 Corinthians 15:6'],
            ['id'=>'nt19','difficulty'=>5,'de'=>['text'=>'Welcher griechische Begriff, der „Herr" bedeutet, wird im NT am häufigsten als Titel für Jesus verwendet?','options'=>['Christos','Kyrios','Soter','Logos']],'en'=>['text'=>'Which Greek term meaning "Lord" is most frequently used as a title for Jesus in the New Testament?','options'=>['Christos','Kyrios','Soter','Logos']],'correct'=>1,'reference'=>'Romans 10:9'],
            ['id'=>'nt20','difficulty'=>6,'de'=>['text'=>'Welches griechische Wort, das Johannes 1,1 für Jesus verwendet, bedeutet wörtlich „Wort" oder „Vernunft"?','options'=>['Pneuma','Logos','Christos','Episkopos']],'en'=>['text'=>'What Greek word used for Jesus in John 1:1 literally means "Word" or "Reason"?','options'=>['Pneuma','Logos','Christos','Episkopos']],'correct'=>1,'reference'=>'John 1:1'],
            ['id'=>'nt21','difficulty'=>6,'de'=>['text'=>'Welcher griechische Begriff bezeichnet den Gemeindeleiter, der wörtlich „Aufseher" bedeutet?','options'=>['Diakonos','Episkopos','Presbuteros','Apostolos']],'en'=>['text'=>'Which Greek term for a church leader literally means "overseer" and is also translated "bishop"?','options'=>['Diakonos','Episkopos','Presbuteros','Apostolos']],'correct'=>1,'reference'=>'1 Timothy 3:1–2'],
        ],
        'wb' => [
            ['id'=>'wb01','difficulty'=>1,'de'=>['text'=>'Wie viele Bücher hat die protestantische Bibel?','options'=>['39','66','73','77']],'en'=>['text'=>'How many books does the Protestant Bible contain?','options'=>['39','66','73','77']],'correct'=>1,'reference'=>'(Biblical canon)'],
            ['id'=>'wb02','difficulty'=>1,'de'=>['text'=>'Wer schrieb die meisten Psalmen?','options'=>['Mose','Salomo','David','Asaf']],'en'=>['text'=>'Who wrote most of the Psalms?','options'=>['Moses','Solomon','David','Asaph']],'correct'=>2,'reference'=>'Psalm 3 (title)'],
            ['id'=>'wb03','difficulty'=>1,'de'=>['text'=>'Wie hieß der älteste Mensch in der Bibel?','options'=>['Noah','Adam','Henoch','Methusalem']],'en'=>['text'=>'Who was the oldest person in the Bible?','options'=>['Noah','Adam','Enoch','Methuselah']],'correct'=>3,'reference'=>'Genesis 5:27'],
            ['id'=>'wb04','difficulty'=>1,'de'=>['text'=>'Welches Meer teilte Mose, damit Israel hindurchziehen konnte?','options'=>['Totes Meer','Schilfmeer / Rotes Meer','Mittelmeer','See Genezareth']],'en'=>['text'=>'Which sea did Moses part so Israel could cross on dry ground?','options'=>['Dead Sea','Red Sea','Mediterranean Sea','Sea of Galilee']],'correct'=>1,'reference'=>'Exodus 14:21–22'],
            ['id'=>'wb05','difficulty'=>2,'de'=>['text'=>'Wie viele Bücher hat das Neue Testament?','options'=>['18','27','39','66']],'en'=>['text'=>'How many books are in the New Testament?','options'=>['18','27','39','66']],'correct'=>1,'reference'=>'(Biblical canon)'],
            ['id'=>'wb06','difficulty'=>2,'de'=>['text'=>'Wer wurde in eine Löwengrube geworfen und überlebte?','options'=>['Jeremia','Elija','Daniel','Schadrach']],'en'=>['text'=>'Who was thrown into a den of lions and survived?','options'=>['Jeremiah','Elijah','Daniel','Shadrach']],'correct'=>2,'reference'=>'Daniel 6:16–23'],
            ['id'=>'wb07','difficulty'=>2,'de'=>['text'=>'Wie lautete der ursprüngliche Name des Apostels Paulus?','options'=>['Barnabas','Simon','Saulus','Kornelius']],'en'=>['text'=>'What was the original name of the apostle Paul?','options'=>['Barnabas','Simon','Saul','Cornelius']],'correct'=>2,'reference'=>'Acts 9:1'],
            ['id'=>'wb08','difficulty'=>2,'de'=>['text'=>'Welches Buch der Bibel hat die meisten Kapitel?','options'=>['Genesis','Jesaja','Jeremia','Psalmen']],'en'=>['text'=>'Which book of the Bible has the most chapters?','options'=>['Genesis','Isaiah','Jeremiah','Psalms']],'correct'=>3,'reference'=>'(Psalms, 150 chapters)'],
            ['id'=>'wb09','difficulty'=>3,'de'=>['text'=>'Wie oft verleugnete Petrus Jesus?','options'=>['1','2','3','4']],'en'=>['text'=>'How many times did Peter deny Jesus?','options'=>['1','2','3','4']],'correct'=>2,'reference'=>'Matthew 26:69–75'],
            ['id'=>'wb10','difficulty'=>3,'de'=>['text'=>'Welche Frau wurde von Petrus von den Toten auferweckt?','options'=>['Lydia','Dorkas / Tabita','Priscilla','Rhode']],'en'=>['text'=>'Which woman was raised from the dead by Peter?','options'=>['Lydia','Dorcas / Tabitha','Priscilla','Rhoda']],'correct'=>1,'reference'=>'Acts 9:36–41'],
            ['id'=>'wb11','difficulty'=>3,'de'=>['text'=>'In welchem Garten wurde Jesus verhaftet?','options'=>['Eden','Gethsemane','Olivenberg','Siloah']],'en'=>['text'=>'In which garden was Jesus arrested?','options'=>['Eden','Gethsemane','Mount of Olives','Siloam']],'correct'=>1,'reference'=>'Matthew 26:36'],
            ['id'=>'wb12','difficulty'=>3,'de'=>['text'=>'Wie viele Bücher schrieb Lukas im Neuen Testament?','options'=>['1','2','3','4']],'en'=>['text'=>'How many books of the New Testament did Luke write?','options'=>['1','2','3','4']],'correct'=>1,'reference'=>'Luke 1:1; Acts 1:1'],
            ['id'=>'wb13','difficulty'=>4,'de'=>['text'=>'Welche zwei Bücher des AT nennen Gott nicht ausdrücklich beim Namen?','options'=>['Rut und Ester','Ester und Hoheslied','Rut und Hoheslied','Ester und Sprüche']],'en'=>['text'=>'Which two Old Testament books do not explicitly mention God by name?','options'=>['Ruth and Esther','Esther and Song of Solomon','Ruth and Song of Solomon','Esther and Proverbs']],'correct'=>1,'reference'=>'(Esther; Song of Solomon)'],
            ['id'=>'wb14','difficulty'=>4,'de'=>['text'=>'Was war die erste Sünde im Garten Eden?','options'=>['Zorn','Hochmut','Essen vom verbotenen Baum','Lügen']],'en'=>['text'=>'What was the first sin committed in the garden of Eden?','options'=>['Anger','Pride','Eating from the forbidden tree','Lying']],'correct'=>2,'reference'=>'Genesis 3:6'],
            ['id'=>'wb15','difficulty'=>4,'de'=>['text'=>'Welches Buch handelt von der Ehe des Propheten Hosea als Bild für Gottes Liebe zu Israel?','options'=>['Joel','Hosea','Amos','Micha']],'en'=>['text'=>'Which Bible book centers on the marriage of the prophet Hosea as a picture of God\'s love for Israel?','options'=>['Joel','Hosea','Amos','Micah']],'correct'=>1,'reference'=>'Hosea 1:2'],
            ['id'=>'wb16','difficulty'=>4,'de'=>['text'=>'Welcher König Israels war für seine Weisheit bekannt und baute den ersten Tempel in Jerusalem?','options'=>['David','Hiskija','Salomo','Josafat']],'en'=>['text'=>'Which king of Israel was famous for his wisdom and built the first Temple in Jerusalem?','options'=>['David','Hezekiah','Solomon','Jehoshaphat']],'correct'=>2,'reference'=>'1 Kings 6:1; 1 Kings 4:30'],
            ['id'=>'wb17','difficulty'=>5,'de'=>['text'=>'Was ist der hebräische Begriff für „Im Anfang", mit dem die Bibel beginnt?','options'=>['Elohim','Berescheit','Schalom','Schma']],'en'=>['text'=>'What is the Hebrew phrase meaning "In the beginning" that opens the Bible?','options'=>['Elohim','Bereshit','Shalom','Shema']],'correct'=>1,'reference'=>'Genesis 1:1'],
            ['id'=>'wb18','difficulty'=>5,'de'=>['text'=>'Welchem altestamentlichen Priesterkönig wird Jesus in Hebräer 7 gegenübergestellt?','options'=>['Zadok','Melchisedek','Aaron','Eleazar']],'en'=>['text'=>'To which Old Testament priest-king is Jesus compared in Hebrews 7?','options'=>['Zadok','Melchizedek','Aaron','Eleazar']],'correct'=>1,'reference'=>'Hebrews 7:1–3'],
            ['id'=>'wb19','difficulty'=>5,'de'=>['text'=>'Welche griechische Bibelübersetzung verwendeten frühe Christen und wird mit LXX abgekürzt?','options'=>['Vulgata','Septuaginta','Peschitta','Targum']],'en'=>['text'=>'Which Greek Bible translation, abbreviated LXX, was widely used by early Christians?','options'=>['Vulgate','Septuagint','Peshitta','Targum']],'correct'=>1,'reference'=>'(Biblical scholarship)'],
            ['id'=>'wb20','difficulty'=>6,'de'=>['text'=>'Welches Konzil im Jahr 325 n. Chr. bestätigte die Gottheit Christi und verurteilte den Arianismus?','options'=>['Konzil von Chalcedon','Konzil von Nicäa','Konzil von Ephesus','Konzil von Konstantinopel']],'en'=>['text'=>'Which council in AD 325 confirmed the full deity of Christ and condemned Arianism?','options'=>['Council of Chalcedon','Council of Nicaea','Council of Ephesus','Council of Constantinople']],'correct'=>1,'reference'=>'(Church history, AD 325)'],
            ['id'=>'wb21','difficulty'=>6,'de'=>['text'=>'Laut Offenbarung 13,18 ist die Zahl des Tieres eine Menschenzahl. Welche Zahl ist gemeint?','options'=>['616','666','777','888']],'en'=>['text'=>'According to Revelation 13:18, the number of the beast is a human number. What is it?','options'=>['616','666','777','888']],'correct'=>1,'reference'=>'Revelation 13:18'],
        ],
    ];
}
