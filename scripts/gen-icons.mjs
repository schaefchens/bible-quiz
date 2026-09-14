/**
 * Generates the PWA icons and the favicon from logo-design.png,
 * using only Node built-ins (no npm deps).
 * Run: node scripts/gen-icons.mjs
 *
 * Source:
 *   logo-design.png                            (repo root, 1254×1254 RGBA)
 *
 * Outputs:
 *   client/public/icons/icon-192.png           (purpose: any)
 *   client/public/icons/icon-512.png           (purpose: any)
 *   client/public/icons/icon-maskable-512.png  (purpose: maskable, full-bleed)
 *   client/public/icons/apple-touch-icon.png   (180×180, opaque — iOS shows
 *                                               transparency as black)
 *   client/public/favicon.svg
 *
 * The artwork is drawn as a macOS-style tile: a rounded square floating on a
 * transparent canvas with a drop shadow. Browsers and launchers draw their own
 * shadow and their own mask, so every step below works from the tile's alpha
 * bounding box and throws the shadow margin away.
 */
import { deflateSync, inflateSync }  from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname }             from 'node:path';
import { fileURLToPath }             from 'node:url';

const ROOT   = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'logo-design.png');
const PUBLIC = join(ROOT, 'client', 'public');
const ICONS  = join(PUBLIC, 'icons');
mkdirSync(ICONS, { recursive: true });

// Maskable icons are cropped by the launcher to whatever shape it likes; only
// the middle 80% is guaranteed to survive. https://w3c.github.io/manifest/#icon-masks
const SAFE_ZONE = 0.8;

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

// ─── Images ─────────────────────────────────────────────────────────────────
// One shape everywhere: { w, h, data } with data as straight (un-premultiplied)
// RGBA bytes, row-major.

function image(w, h, fill = [0, 0, 0, 0]) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0]; data[i+1] = fill[1]; data[i+2] = fill[2]; data[i+3] = fill[3];
  }
  return { w, h, data };
}

// ─── PNG decoder (8-bit, non-interlaced) ────────────────────────────────────
function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('not a PNG');

  let off = 8, ihdr = null;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len  = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4),
               depth: data[8], colour: data[9], interlace: data[12] };
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (!ihdr) throw new Error('PNG has no IHDR');

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[ihdr.colour];
  if (!channels || ihdr.depth !== 8 || ihdr.interlace !== 0) {
    throw new Error(`unsupported PNG: depth ${ihdr.depth}, colour type ${ihdr.colour}, ` +
                    `interlace ${ihdr.interlace} (need 8-bit, non-interlaced, non-palette)`);
  }

  const { w, h } = ihdr;
  const bpp    = channels;             // bytes per pixel, depth is always 8 here
  const stride = w * bpp;
  const raw    = inflateSync(Buffer.concat(idat));
  const px     = Buffer.alloc(h * stride);

  // Undo the per-scanline filter (PNG spec §9).
  let p = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[p++];
    const line   = raw.subarray(p, p + stride); p += stride;
    const cur    = px.subarray(y * stride, (y + 1) * stride);
    const prev   = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;                  // left
      const b = prev ? prev[i] : 0;                           // up
      const c = prev && i >= bpp ? prev[i - bpp] : 0;         // up-left
      let v = line[i];
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {                                             // Paeth
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`unknown PNG filter ${filter} on row ${y}`);
      }
      cur[i] = v & 255;
    }
  }

  // Normalise every colour type to straight RGBA.
  const img = image(w, h);
  for (let i = 0, o = 0; i < px.length; i += bpp, o += 4) {
    if (channels >= 3) {
      img.data[o] = px[i]; img.data[o+1] = px[i+1]; img.data[o+2] = px[i+2];
      img.data[o+3] = channels === 4 ? px[i+3] : 255;
    } else {
      img.data[o] = img.data[o+1] = img.data[o+2] = px[i];
      img.data[o+3] = channels === 2 ? px[i+1] : 255;
    }
  }
  return img;
}

// ─── PNG encoder ────────────────────────────────────────────────────────────

/** Apply one PNG scanline filter (spec §9.2) to a row of pixel bytes. */
function filterRow(type, cur, prev, out, bpp) {
  for (let i = 0; i < cur.length; i++) {
    const a = i >= bpp ? cur[i - bpp] : 0;                  // left
    const b = prev ? prev[i] : 0;                           // up
    const c = prev && i >= bpp ? prev[i - bpp] : 0;         // up-left
    let v;
    switch (type) {
      case 0: v = cur[i]; break;
      case 1: v = cur[i] - a; break;
      case 2: v = cur[i] - b; break;
      case 3: v = cur[i] - ((a + b) >> 1); break;
      default: {                                            // 4, Paeth
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v = cur[i] - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
    }
    out[i] = v & 255;
  }
  return out;
}

function encodePNG(img) {
  // Drop the alpha channel when nothing in the image uses it: a quarter less
  // data to deflate, and every consumer of an opaque icon is happier for it.
  let opaque = true;
  for (let i = 3; i < img.data.length && opaque; i += 4) opaque = img.data[i] === 255;

  const bpp      = opaque ? 3 : 4;
  const rowBytes = img.w * bpp;
  const pixels   = opaque ? Buffer.alloc(img.w * img.h * 3) : img.data;
  if (opaque) {
    for (let i = 0, o = 0; i < img.data.length; i += 4, o += 3) {
      pixels[o] = img.data[i]; pixels[o+1] = img.data[i+1]; pixels[o+2] = img.data[i+2];
    }
  }

  const raw       = Buffer.alloc(img.h * (1 + rowBytes));
  const candidate = Buffer.alloc(rowBytes);
  let prev = null;

  for (let y = 0; y < img.h; y++) {
    const cur = pixels.subarray(y * rowBytes, (y + 1) * rowBytes);

    // Pick the filter per scanline by the spec's minimum-sum-of-absolute-
    // differences heuristic. On this artwork — smooth rays and gradients — it
    // cuts the deflated size by about a third against filter None everywhere.
    let bestType = 0, bestScore = Infinity;
    for (let type = 0; type <= 4; type++) {
      filterRow(type, cur, prev, candidate, bpp);
      let score = 0;
      for (const v of candidate) score += v < 128 ? v : 256 - v;
      if (score < bestScore) { bestScore = score; bestType = type; }
    }

    const at = y * (1 + rowBytes);
    raw[at] = bestType;
    filterRow(bestType, cur, prev, raw.subarray(at + 1, at + 1 + rowBytes), bpp);
    prev = cur;
  }

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(img.w, 0); ihdr.writeUInt32BE(img.h, 4);
  ihdr[8] = 8; ihdr[9] = opaque ? 2 : 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),  // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Tightest box holding every pixel at or above `threshold` alpha. */
function alphaBounds(img, threshold) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      if (img.data[(y * img.w + x) * 4 + 3] < threshold) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('source image is fully transparent');
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Grow a box to a square around its own centre, clamped to the image. */
function squared(rect, img) {
  const side = Math.min(Math.max(rect.w, rect.h), img.w, img.h);
  const cx   = rect.x + rect.w / 2;
  const cy   = rect.y + rect.h / 2;
  return {
    x: Math.round(Math.min(Math.max(cx - side / 2, 0), img.w - side)),
    y: Math.round(Math.min(Math.max(cy - side / 2, 0), img.h - side)),
    w: side, h: side,
  };
}

/**
 * Area-average resample of `rect` from `img` down to dw×dh.
 * Alpha is premultiplied for the averaging and divided back out afterwards,
 * so the transparent margin never bleeds dark fringes into the edges.
 */
function resample(img, rect, dw, dh) {
  const out     = image(dw, dh);
  const scaleX  = rect.w / dw;
  const scaleY  = rect.h / dh;

  for (let dy = 0; dy < dh; dy++) {
    const fy0 = rect.y + dy * scaleY, fy1 = fy0 + scaleY;
    const y0  = Math.max(0, Math.floor(fy0));
    const y1  = Math.min(img.h - 1, Math.ceil(fy1) - 1);

    for (let dx = 0; dx < dw; dx++) {
      const fx0 = rect.x + dx * scaleX, fx1 = fx0 + scaleX;
      const x0  = Math.max(0, Math.floor(fx0));
      const x1  = Math.min(img.w - 1, Math.ceil(fx1) - 1);

      let r = 0, g = 0, b = 0, alpha = 0, area = 0;
      for (let y = y0; y <= y1; y++) {
        const wy = Math.min(y + 1, fy1) - Math.max(y, fy0);
        if (wy <= 0) continue;
        for (let x = x0; x <= x1; x++) {
          const wx = Math.min(x + 1, fx1) - Math.max(x, fx0);
          if (wx <= 0) continue;
          const weight = wx * wy;
          const i      = (y * img.w + x) * 4;
          const a      = (img.data[i+3] / 255) * weight;
          r += img.data[i] * a; g += img.data[i+1] * a; b += img.data[i+2] * a;
          alpha += a; area += weight;
        }
      }

      const o = (dy * dw + dx) * 4;
      if (alpha > 0) {
        out.data[o]   = Math.round(r / alpha);
        out.data[o+1] = Math.round(g / alpha);
        out.data[o+2] = Math.round(b / alpha);
        out.data[o+3] = Math.round((alpha / area) * 255);
      }
    }
  }
  return out;
}

/** Source-over composite of `src` onto `dst` at (ox, oy). Mutates `dst`. */
function over(dst, src, ox, oy) {
  for (let y = 0; y < src.h; y++) {
    const dy = oy + y;
    if (dy < 0 || dy >= dst.h) continue;
    for (let x = 0; x < src.w; x++) {
      const dx = ox + x;
      if (dx < 0 || dx >= dst.w) continue;
      const s = (y * src.w + x) * 4;
      const d = (dy * dst.w + dx) * 4;
      const sa = src.data[s+3] / 255;
      if (sa === 0) continue;
      const da = (dst.data[d+3] / 255) * (1 - sa);
      const oa = sa + da;
      for (let c = 0; c < 3; c++) {
        dst.data[d+c] = Math.round((src.data[s+c] * sa + dst.data[d+c] * da) / oa);
      }
      dst.data[d+3] = Math.round(oa * 255);
    }
  }
  return dst;
}

/**
 * Average colour of the artwork's own outer edge, sampled just inside `rect`
 * and away from the rounded corners. Padding and flattening with this keeps
 * the seam invisible wherever the tile has to be set into a larger square.
 */
function edgeColour(img, rect) {
  const inset = Math.round(rect.w * 0.03);
  let r = 0, g = 0, b = 0, n = 0;

  const sample = (x, y) => {
    const i = (y * img.w + x) * 4;
    if (img.data[i+3] < 250) return;
    r += img.data[i]; g += img.data[i+1]; b += img.data[i+2]; n++;
  };

  for (let t = 0.15; t <= 0.85; t += 0.01) {
    const x = Math.round(rect.x + rect.w * t);
    const y = Math.round(rect.y + rect.h * t);
    sample(x, rect.y + inset);                  // top edge
    sample(x, rect.y + rect.h - 1 - inset);     // bottom edge
    sample(rect.x + inset, y);                  // left edge
    sample(rect.x + rect.w - 1 - inset, y);     // right edge
  }
  if (!n) throw new Error('could not sample an edge colour');
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// ─── Generate ───────────────────────────────────────────────────────────────
const source = decodePNG(readFileSync(SOURCE));

// Threshold 128 rather than 1: the drop shadow and the outer glow are faint,
// and cropping to them would leave a ring of near-empty pixels on every icon.
const tile = squared(alphaBounds(source, 128), source);
const edge = edgeColour(source, tile);

console.log(`source ${source.w}×${source.h} → tile ${tile.w}×${tile.h} at (${tile.x},${tile.y})`);
console.log(`edge colour ${hex(edge)}\n`);

function write(path, img) {
  const buf = encodePNG(img);
  writeFileSync(path, buf);
  console.log(`wrote ${path}  (${img.w}×${img.h}, ${buf.length} bytes)`);
}

// Standard icons — the tile as drawn, rounded corners and all (purpose: any).
for (const size of [192, 512]) {
  write(join(ICONS, `icon-${size}.png`), resample(source, tile, size, size));
}

// Maskable — full-bleed background in the artwork's own edge colour, tile
// inside the safe zone, so a launcher can crop to any shape without biting
// into the book or the question mark.
{
  const size  = 512;
  const inner = Math.round(size * SAFE_ZONE);
  const pad   = Math.round((size - inner) / 2);
  const canvas = image(size, size, [...edge, 255]);
  write(join(ICONS, 'icon-maskable-512.png'),
        over(canvas, resample(source, tile, inner, inner), pad, pad));
}

// Apple touch icon — flattened onto the edge colour: iOS renders any
// transparency as black and applies its own mask, so the tile goes full bleed.
{
  const size   = 180;
  const canvas = image(size, size, [...edge, 255]);
  write(join(ICONS, 'apple-touch-icon.png'),
        over(canvas, resample(source, tile, size, size), 0, 0));
}

// Favicon — vector, and deliberately not a shrunken copy of the logo: at 16px
// the rays and the book turn to mush, so this keeps only the part that still
// reads at that size, the gold question mark on the blue tile.
const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <radialGradient id="sky" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stop-color="#1e57c8"/>
      <stop offset="100%" stop-color="${hex(edge)}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffd966"/>
      <stop offset="100%" stop-color="#e8a317"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#sky)"/>
  <g fill="none" stroke="url(#gold)" stroke-width="4.4" stroke-linecap="round">
    <path d="M10.4 11.6a5.8 5.8 0 1 1 5.8 5.8v2.4"/>
  </g>
  <circle cx="16.2" cy="25.4" r="2.6" fill="url(#gold)"/>
</svg>
`;
writeFileSync(join(PUBLIC, 'favicon.svg'), faviconSVG);
console.log(`wrote ${join(PUBLIC, 'favicon.svg')}`);

console.log('\nDone. Run again whenever logo-design.png changes.');
