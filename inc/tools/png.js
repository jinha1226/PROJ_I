// 작은 PNG 읽기·쓰기 (RGBA 8비트, 인터레이스 없음). 픽셀 편집 도구용, 외부 라이브러리 없음.
// img = { w, h, d: Uint8Array(w*h*4) }
const zlib = require('zlib');

function read(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('PNG가 아니다');
  let p = 8, w, h, depth, type;
  const idat = [];
  let pal = null, trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8), c = buf.subarray(p + 8, p + 8 + len);
    if (t === 'IHDR') { w = c.readUInt32BE(0); h = c.readUInt32BE(4); depth = c[8]; type = c[9]; if (c[12]) throw new Error('인터레이스 PNG는 못 읽는다'); }
    else if (t === 'PLTE') pal = c;
    else if (t === 'tRNS') trns = c;
    else if (t === 'IDAT') idat.push(c);
    else if (t === 'IEND') break;
    p += 12 + len;
  }
  if (depth !== 8) throw new Error('8비트 PNG만 읽는다');
  const ch = { 6: 4, 2: 3, 0: 1, 4: 2, 3: 1 }[type], bpp = ch, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), out = px.subarray(y * stride, (y + 1) * stride), prev = y ? px.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = prev ? prev[i] : 0, cc = prev && i >= bpp ? prev[i - bpp] : 0;
      let v = src[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - cc, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - cc); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : cc; }
      out[i] = v & 255;
    }
  }
  const d = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    if (type === 6) d.set(px.subarray(i * 4, i * 4 + 4), i * 4);
    else if (type === 2) { d.set(px.subarray(i * 3, i * 3 + 3), i * 4); d[i * 4 + 3] = 255; }
    else if (type === 0) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = px[i]; d[i * 4 + 3] = 255; }
    else if (type === 4) { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = px[i * 2]; d[i * 4 + 3] = px[i * 2 + 1]; }
    else if (type === 3) { const k = px[i]; d[i * 4] = pal[k * 3]; d[i * 4 + 1] = pal[k * 3 + 1]; d[i * 4 + 2] = pal[k * 3 + 2]; d[i * 4 + 3] = trns && k < trns.length ? trns[k] : 255; }
  }
  return { w, h, d };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
function crc(b) { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(t, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(t, 'ascii'), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
}
function write(img) {
  const { w, h, d } = img, raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(d.buffer, d.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
module.exports = { read, write };
