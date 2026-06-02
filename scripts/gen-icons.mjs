/**
 * Generates PWA icons and favicon using only Node built-ins (no npm deps).
 * Run: node scripts/gen-icons.mjs
 *
 * Outputs:
 *   client/public/favicon.svg
 *   client/public/icons/icon-192.png
 *   client/public/icons/icon-512.png
 *   client/public/icons/apple-touch-icon.png   (180×180)
 */
import { deflateSync }       from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname }     from 'node:path';
import { fileURLToPath }     from 'node:url';

const ROOT    = join(dirname(fileURLToPath(import.meta.url)), '..');
const ICONS   = join(ROOT, 'client', 'public', 'icons');
const PUBLIC  = join(ROOT, 'client', 'public');
mkdirSync(ICONS, { recursive: true });

// ─── colours ────────────────────────────────────────────────────────────────
const BG   = [10,  15,  30 ];   // #0a0f1e  brand-dark navy
const GOLD = [212, 175, 55 ];   // #d4af37  brand-gold
const LITE = [240, 192, 64 ];   // #f0c040  brand-gold-light (glow centre)

// ─── CRC32 (required by PNG chunk format) ───────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

// ─── PNG encoder ────────────────────────────────────────────────────────────
function makePNG(size, pixelFn) {
  // scanline: 1 filter byte + size*4 RGBA bytes
  const stride = 1 + size * 4;
  const raw    = Buffer.alloc(size * stride);

  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;                       // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = pixelFn(x, y, size);
      const i = y * stride + 1 + x * 4;
      raw[i] = r; raw[i+1] = g; raw[i+2] = b; raw[i+3] = a;
    }
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Icon pixel function ─────────────────────────────────────────────────────
// Latin cross centred in a navy square with a gold glow.
// padFrac: fraction of size added as safe-zone padding on each side.
function crossPixel(x, y, size, padFrac = 0.0) {
  const nx = x / size;
  const ny = y / size;

  // Cross geometry (normalised 0–1)
  const barW = 0.155;                       // bar thickness
  const pad  = 0.12 + padFrac;             // outer padding

  const vx1 = 0.5 - barW / 2, vx2 = 0.5 + barW / 2;
  const vy1 = pad,             vy2 = 1 - pad;
  const hx1 = pad,             hx2 = 1 - pad;
  const hy1 = 0.33 - barW / 2, hy2 = 0.33 + barW / 2;  // crossbar ~1/3 down

  const inV = nx >= vx1 && nx <= vx2 && ny >= vy1 && ny <= vy2;
  const inH = ny >= hy1 && ny <= hy2 && nx >= hx1 && nx <= hx2;

  if (inV || inH) {
    // Highlight: blend GOLD → LITE toward centre of bar
    let ht = 0;
    if (inV) ht = Math.max(ht, 1 - Math.abs(nx - 0.5) / (barW / 2));
    if (inH) ht = Math.max(ht, 1 - Math.abs(ny - (hy1 + hy2) / 2) / (barW / 2));
    ht = ht ** 2 * 0.55;
    return [
      Math.round(GOLD[0] + (LITE[0] - GOLD[0]) * ht),
      Math.round(GOLD[1] + (LITE[1] - GOLD[1]) * ht),
      Math.round(GOLD[2] + (LITE[2] - GOLD[2]) * ht),
      255,
    ];
  }

  // Distance from this pixel to the nearest cross edge (normalised)
  function rectDist(px, py, x0, y0, x1, y1) {
    const dx = Math.max(x0 - px, 0, px - x1);
    const dy = Math.max(y0 - py, 0, py - y1);
    return Math.sqrt(dx * dx + dy * dy);
  }
  const dist = Math.min(
    rectDist(nx, ny, vx1, vy1, vx2, vy2),
    rectDist(nx, ny, hx1, hy1, hx2, hy2),
  );

  // Ambient glow that fades with distance
  const glowR = 0.13;
  if (dist < glowR) {
    const t = (1 - dist / glowR) ** 2.2 * 0.55;
    return [
      Math.round(BG[0] + (GOLD[0] - BG[0]) * t),
      Math.round(BG[1] + (GOLD[1] - BG[1]) * t),
      Math.round(BG[2] + (GOLD[2] - BG[2]) * t),
      255,
    ];
  }

  return [...BG, 255];
}

// ─── Generate files ──────────────────────────────────────────────────────────

// Standard icons (purpose: any)
for (const size of [192, 512]) {
  const buf  = makePNG(size, (x, y, s) => crossPixel(x, y, s, 0));
  const dest = join(ICONS, `icon-${size}.png`);
  writeFileSync(dest, buf);
  console.log(`wrote ${dest}  (${buf.length} bytes)`);
}

// Apple touch icon 180×180
{
  const buf  = makePNG(180, (x, y, s) => crossPixel(x, y, s, 0));
  const dest = join(ICONS, 'apple-touch-icon.png');
  writeFileSync(dest, buf);
  console.log(`wrote ${dest}  (${buf.length} bytes)`);
}

// Favicon SVG  (vector, sharp at any size)
const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="4" fill="#0a0f1e"/>
  <path fill="#d4af37" d="M13 4h6v6h9v6h-9v16h-6V16H4v-6h9z"/>
</svg>
`;
writeFileSync(join(PUBLIC, 'favicon.svg'), faviconSVG);
console.log(`wrote ${join(PUBLIC, 'favicon.svg')}`);

console.log('\nDone. Run again whenever the brand colours change.');
