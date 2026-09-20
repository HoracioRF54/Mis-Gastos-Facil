const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(len, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makePng(width, height, drawPixel) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }
  
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function renderWalletIcon(isMaskable) {
  return function(x, y, width, height) {
    // Normalized coordinates [-1, 1]
    const nx = (x / width) * 2 - 1;
    const ny = (y / height) * 2 - 1;
    const scale = isMaskable ? 0.72 : 0.88;
    const px = nx / scale;
    const py = ny / scale;

    // Background color: slate-950 / dark slate
    let r = 15, g = 23, b = 42, a = 255; // #0f172a
    if (isMaskable) {
      // Full bleed dark background for maskable
      r = 2; g = 6; b = 23; // #020617
    } else {
      // Rounded squircle background for standard
      const cornerR = 0.85;
      const dCorner = Math.max(Math.abs(nx), Math.abs(ny));
      // Subtle squircle border
      if (Math.abs(nx) > 0.95 || Math.abs(ny) > 0.95) {
        return [0, 0, 0, 0]; // Transparent outside icon boundaries
      }
    }

    // Wallet body: px in [-0.65, 0.65], py in [-0.25, 0.55]
    const inWalletBody = (px >= -0.62 && px <= 0.62 && py >= -0.22 && py <= 0.52);
    // Rounded corners for wallet
    const cornerWallet = 0.12;
    const wx = Math.max(0, Math.abs(px) - (0.62 - cornerWallet));
    const wy = Math.max(0, Math.abs(py - 0.15) - (0.37 - cornerWallet));
    const distWalletCorner = Math.sqrt(wx * wx + wy * wy);
    const isInsideWallet = inWalletBody && (distWalletCorner <= cornerWallet);

    // Top gold coin: center (0, -0.45), radius 0.22
    const coinDist = Math.hypot(px, py - (-0.45));
    const inCoin = coinDist <= 0.22;

    // Wallet flap latch: px in [0.10, 0.68], py in [0.0, 0.32]
    const inLatch = (px >= 0.12 && px <= 0.65 && py >= 0.02 && py <= 0.32);
    // Clasp circle at (0.50, 0.17), radius 0.07
    const claspDist = Math.hypot(px - 0.50, py - 0.17);
    const inClasp = claspDist <= 0.07;

    // Dollar sign vertical bar
    const inDollarBar = isInsideWallet && (Math.abs(px - (-0.18)) <= 0.025 && py >= -0.10 && py <= 0.38);
    // Dollar sign S shapes approximate
    const inDollarS = isInsideWallet && (Math.abs(px - (-0.18)) <= 0.12 && py >= -0.05 && py <= 0.33);

    if (inCoin) {
      if (coinDist <= 0.18) {
        // Gold inside
        return [245, 158, 11, 255]; // amber-500
      } else {
        // Gold edge
        return [252, 211, 77, 255]; // amber-300
      }
    }

    if (inClasp) {
      if (claspDist <= 0.035) {
        return [245, 158, 11, 255];
      }
      return [254, 243, 199, 255];
    }

    if (inLatch) {
      return [4, 120, 87, 255]; // emerald-700
    }

    if (isInsideWallet) {
      if (inDollarBar) {
        return [255, 255, 255, 255];
      }
      // Top fold line
      if (Math.abs(py - (-0.03)) <= 0.015) {
        return [4, 120, 87, 255];
      }
      // Emerald gradient
      const grad = (py + 0.22) / 0.74;
      const er = Math.round(52 * (1 - grad) + 5 * grad);
      const eg = Math.round(211 * (1 - grad) + 150 * grad);
      const eb = Math.round(153 * (1 - grad) + 105 * grad);
      return [er, eg, eb, 255];
    }

    // Background radial subtle glow
    const glowDist = Math.hypot(px, py);
    if (glowDist < 0.95) {
      const gAlpha = Math.max(0, 1 - glowDist / 0.95) * 0.15;
      r = Math.round(r * (1 - gAlpha) + 16 * gAlpha);
      g = Math.round(g * (1 - gAlpha) + 185 * gAlpha);
      b = Math.round(b * (1 - gAlpha) + 129 * gAlpha);
    }

    return [r, g, b, 255];
  };
}

const publicDir = path.resolve(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PWA icons in /public...');

// 192x192
const pwa192 = makePng(192, 192, renderWalletIcon(false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192);

// 512x512
const pwa512 = makePng(512, 512, renderWalletIcon(false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512);

// 512x512 maskable (safe padded)
const pwaMaskable = makePng(512, 512, renderWalletIcon(true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pwaMaskable);

// apple-touch-icon 180x180
const appleTouch = makePng(180, 180, renderWalletIcon(true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

// favicon 64x64
const favicon = makePng(64, 64, renderWalletIcon(false));
fs.writeFileSync(path.join(publicDir, 'favicon.png'), favicon);

console.log('All icons generated successfully!');
