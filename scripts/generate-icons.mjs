import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

mkdirSync('/agent/programa/public/icons', { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function png(size, rgb = [15, 31, 23], accent = [232, 184, 109]) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const i = row + 1 + x * 4;
      const nx = x / (size - 1);
      const ny = y / (size - 1);
      const dx = nx - 0.5;
      const dy = ny - 0.42;
      const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2.2);
      let r = rgb[0] + glow * 40;
      let g = rgb[1] + glow * 50;
      let b = rgb[2] + glow * 30;

      // simple V mark
      const thickness = 0.045;
      const left = Math.abs(ny - (0.28 + nx * 0.7)) < thickness && nx > 0.22 && nx < 0.52;
      const right = Math.abs(ny - (0.98 - nx * 0.7)) < thickness && nx >= 0.48 && nx < 0.78;
      if (left || right) {
        r = accent[0];
        g = accent[1];
        b = accent[2];
      }

      raw[i] = Math.min(255, r);
      raw[i + 1] = Math.min(255, g);
      raw[i + 2] = Math.min(255, b);
      raw[i + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  writeFileSync(`/agent/programa/public/icons/icon-${size}.png`, png(size));
}
console.log('icons_ok');
