// Build a BibleServer.com URL for a single-part reference string.
// lang 'de' → SLT (Schlachter 2000), 'en' → ESV
// Both languages use a comma as the chapter-verse separator in the URL
// (BibleServer redirects EN comma refs to its colon-style canonical URL).
//
// Handles:
//   precise  "Matthäus 3,13–17" | "Matthew 3:13–17"
//   chapter  "Matthäus 3"       | "Matthew 3"
//   book     "Matthäus"         | "Matthew"
//   ranges   "2. Mose 19–20"    | "Exodus 19–20"
//   numbered "1. Samuel 10,1"   | "1 Samuel 10:1"
//   multi    "Matthäus 4,23; Markus 1,1"  ← caller should split on ";" first
export function toBibleServerUrl(singleRef, lang) {
  const translation = lang === 'de' ? 'SLT' : 'ESV';

  // Strip parenthetical annotations: "(Pentateuch)", "(NT letters)", etc.
  const clean = singleRef.replace(/\s*\([^)]*\)/g, '').trim();

  // Try to match "Book [Chapter[,/:Verse]]"
  //   book    – everything before the last space-then-digit
  //   chapter – first digit group after book (may be a range "19–20")
  //   verse   – optional, after comma or colon
  const m = clean.match(/^(.+?)\s+(\d[\d–\-]*)(?:[,:](\d[\d–\-]*))?$/);

  let bookRaw, chapter, verse;

  if (m) {
    [, bookRaw, chapter, verse] = m;
    // For ranges take the lower bound: "19–20" → "19", "13–17" → "13"
    chapter = chapter.split(/[–\-]/)[0];
    if (verse) verse = verse.split(/[–\-]/)[0];
  } else {
    // Book-only string (no chapter found) — default to chapter 1
    bookRaw = clean;
    chapter = '1';
    verse   = undefined;
  }

  const bookUrl = formatBookForUrl(bookRaw, lang);
  const ref     = verse ? `${chapter},${verse}` : chapter;

  return `https://www.bibleserver.com/${translation}/${bookUrl}${ref}`;
}

function formatBookForUrl(book, lang) {
  if (lang === 'de') {
    // "1. Mose" → "1.Mose"  (drop the space that follows the period)
    return book.replace(/^(\d+)\.\s+/, '$1.');
  }
  // EN: "1 Samuel" → "1%20Samuel"  (encode the space in numbered books)
  return book.replace(/^(\d+)\s+/, (_, n) => `${n}%20`);
}
