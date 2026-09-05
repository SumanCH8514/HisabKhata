import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create PNG buffer from RGBA buffer
function createPng(width, height, rgbaBuffer) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // color type 6: RGBA
  ihdr.writeUInt8(0, 10); // compression method 0
  ihdr.writeUInt8(0, 11); // filter method 0
  ihdr.writeUInt8(0, 12); // interlace method 0
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(height * scanlineLength);
  for (let y = 0; y < height; y++) {
    rawData[y * scanlineLength] = 0; // Filter None
    rgbaBuffer.copy(
      rawData,
      y * scanlineLength + 1,
      y * width * 4,
      (y + 1) * width * 4
    );
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const typeBuf = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Generate HisabKhata icon image pixels
function renderHisabKhataIcon(size, isMaskable = false) {
  const buf = Buffer.alloc(size * size * 4);

  const radius = isMaskable ? 0 : Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;

  // Colors
  const bgTop = [0, 87, 187];       // #0057BB (Brand Royal Blue)
  const bgBottom = [0, 48, 120];     // #003078 (Deep Indigo Blue)
  const white = [255, 255, 255];
  const gold = [245, 158, 11];       // Amber / Gold for accent
  const darkBlue = [0, 50, 110];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check rounded corner for non-maskable
      let inBounds = true;
      if (!isMaskable) {
        const dx = Math.max(radius - x, 0, x - (size - 1 - radius));
        const dy = Math.max(radius - y, 0, y - (size - 1 - radius));
        if (dx * dx + dy * dy > radius * radius) {
          inBounds = false;
        }
      }

      if (!inBounds) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Background gradient
      const t = y / size;
      const r = Math.round(bgTop[0] * (1 - t) + bgBottom[0] * t);
      const g = Math.round(bgTop[1] * (1 - t) + bgBottom[1] * t);
      const b = Math.round(bgTop[2] * (1 - t) + bgBottom[2] * t);

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }

  // Draw crisp Wallet / Ledger emblem on top
  const scale = size / 512;
  
  // Helper to draw rectangle
  function fillRect(rx, ry, rw, rh, color, alpha = 255) {
    const x0 = Math.max(0, Math.round(rx));
    const y0 = Math.max(0, Math.round(ry));
    const x1 = Math.min(size, Math.round(rx + rw));
    const y1 = Math.min(size, Math.round(ry + rh));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * size + x) * 4;
        if (buf[idx + 3] === 0) continue;
        buf[idx] = color[0];
        buf[idx + 1] = color[1];
        buf[idx + 2] = color[2];
        buf[idx + 3] = alpha;
      }
    }
  }

  // Helper to draw rounded rect
  function fillRoundedRect(rx, ry, rw, rh, rad, color) {
    const x0 = Math.max(0, Math.round(rx));
    const y0 = Math.max(0, Math.round(ry));
    const x1 = Math.min(size, Math.round(rx + rw));
    const y1 = Math.min(size, Math.round(ry + rh));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * size + x) * 4;
        if (buf[idx + 3] === 0) continue;
        const dx = Math.max(rad - (x - rx), 0, (x - rx) - (rw - 1 - rad));
        const dy = Math.max(rad - (y - ry), 0, (y - ry) - (rh - 1 - rad));
        if (dx * dx + dy * dy <= rad * rad) {
          buf[idx] = color[0];
          buf[idx + 1] = color[1];
          buf[idx + 2] = color[2];
          buf[idx + 3] = 255;
        }
      }
    }
  }

  // Helper to draw circle
  function fillCircle(cx, cy, radius, color) {
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.round(cx - radius));
    const y0 = Math.max(0, Math.round(cy - radius));
    const x1 = Math.min(size, Math.round(cx + radius));
    const y1 = Math.min(size, Math.round(cy + radius));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = (y * size + x) * 4;
        if (buf[idx + 3] === 0) continue;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          buf[idx] = color[0];
          buf[idx + 1] = color[1];
          buf[idx + 2] = color[2];
          buf[idx + 3] = 255;
        }
      }
    }
  }

  // Main Wallet Body (Crisp Pure White)
  // Dimensions for 512px canvas, scaled proportionally
  const wX = 116 * scale;
  const wY = 140 * scale;
  const wW = 280 * scale;
  const wH = 220 * scale;
  const wRad = 36 * scale;

  fillRoundedRect(wX, wY, wW, wH, wRad, white);

  // Wallet top flap / divider groove
  fillRect(wX, wY + 60 * scale, wW, 14 * scale, [226, 232, 240]);

  // Wallet Clasp on the right
  const claspX = wX + wW - 80 * scale;
  const claspY = wY + (wH / 2) - 40 * scale;
  const claspW = 95 * scale;
  const claspH = 80 * scale;
  const claspRad = 24 * scale;

  fillRoundedRect(claspX, claspY, claspW, claspH, claspRad, [241, 245, 249]);
  fillRoundedRect(claspX + 6 * scale, claspY + 6 * scale, claspW - 12 * scale, claspH - 12 * scale, claspRad - 6 * scale, [0, 87, 187]);

  // Gold Coin / Fastener in Clasp
  fillCircle(claspX + claspW - 32 * scale, claspY + (claspH / 2), 16 * scale, gold);
  fillCircle(claspX + claspW - 32 * scale, claspY + (claspH / 2), 7 * scale, [254, 243, 199]);

  // Rupee Symbol / Bookmark on left side of wallet
  const rupeeCX = wX + 75 * scale;
  const rupeeCY = wY + (wH / 2) + 18 * scale;
  
  // Upper Rupee horizontal bars
  fillRect(rupeeCX - 30 * scale, rupeeCY - 34 * scale, 60 * scale, 10 * scale, darkBlue);
  fillRect(rupeeCX - 30 * scale, rupeeCY - 16 * scale, 60 * scale, 10 * scale, darkBlue);
  // Rupee stem & curve
  fillRect(rupeeCX - 22 * scale, rupeeCY - 34 * scale, 12 * scale, 68 * scale, darkBlue);
  // Upper curve of R
  fillRoundedRect(rupeeCX - 22 * scale, rupeeCY - 34 * scale, 48 * scale, 34 * scale, 16 * scale, darkBlue);
  fillRoundedRect(rupeeCX - 12 * scale, rupeeCY - 26 * scale, 28 * scale, 18 * scale, 8 * scale, white);
  // Diagonal leg of Rupee
  for (let d = 0; d < 32 * scale; d++) {
    fillRect(rupeeCX - 6 * scale + d, rupeeCY + 2 * scale + d, 14 * scale, 10 * scale, darkBlue);
  }

  // PRO badge at bottom right
  const pW = 120 * scale;
  const pH = 44 * scale;
  const pX = size - pW - 40 * scale;
  const pY = size - pH - (isMaskable ? 55 * scale : 40 * scale);
  fillRoundedRect(pX, pY, pW, pH, 12 * scale, [249, 115, 22]); // Orange-500

  return buf;
}

// Generate files
const outDir = path.join(__dirname, '../public/icons');
fs.mkdirSync(outDir, { recursive: true });

// 192x192
console.log('Generating 192x192 PNG icon...');
const buf192 = renderHisabKhataIcon(192, false);
const png192 = createPng(192, 192, buf192);
fs.writeFileSync(path.join(outDir, 'icon-192x192.png'), png192);

// 512x512
console.log('Generating 512x512 PNG icon...');
const buf512 = renderHisabKhataIcon(512, false);
const png512 = createPng(512, 512, buf512);
fs.writeFileSync(path.join(outDir, 'icon-512x512.png'), png512);

// 512x512 maskable
console.log('Generating 512x512 maskable PNG icon...');
const buf512m = renderHisabKhataIcon(512, true);
const png512m = createPng(512, 512, buf512m);
fs.writeFileSync(path.join(outDir, 'icon-maskable-512x512.png'), png512m);

// Favicon png 64x64
const buf64 = renderHisabKhataIcon(64, false);
const png64 = createPng(64, 64, buf64);
fs.writeFileSync(path.join(__dirname, '../public/favicon.png'), png64);

console.log('Icons successfully generated!');
