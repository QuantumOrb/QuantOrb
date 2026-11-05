'use strict';
/* Small helpers the chain reader needs: base58, program-derived addresses, little-endian readers, a TTL cache.
   The server's own lib/util.js, unchanged. */
const crypto = require('crypto');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const now = () => Date.now();
const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);

/* ---------- base58 ---------- */
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58MAP = {}; for (let i = 0; i < B58.length; i++) B58MAP[B58[i]] = BigInt(i);
function b58encode(buf) {
  let n = 0n; for (const b of buf) n = n * 256n + BigInt(b);
  let s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of buf) { if (b === 0) s = '1' + s; else break; }
  return s;
}
function b58decode(str) {
  let n = 0n; for (const c of str) { const v = B58MAP[c]; if (v == null) throw new Error('bad base58'); n = n * 58n + v; }
  const out = []; while (n > 0n) { out.unshift(Number(n % 256n)); n /= 256n; }
  for (const c of str) { if (c === '1') out.unshift(0); else break; }
  return Buffer.from(out);
}
function isAddress(s) {
  if (typeof s !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return false;
  try { return b58decode(s).length === 32; } catch (e) { return false; }
}

/* ---------- ed25519: is a 32-byte string a point on the curve? (program addresses must not be) ---------- */
const P = 2n ** 255n - 19n;
const D = (-121665n * modInv(121666n)) % P;
function mod(a) { const r = a % P; return r < 0n ? r + P : r; }
function modPow(b, e) { let r = 1n; b = mod(b); while (e > 0n) { if (e & 1n) r = r * b % P; b = b * b % P; e >>= 1n; } return r; }
function modInv(a) { return modPow(mod(a), P - 2n); }
function onCurve(bytes) {
  const b = Buffer.from(bytes); b[31] &= 0x7f;
  let y = 0n; for (let i = 31; i >= 0; i--) y = (y << 8n) + BigInt(b[i]);
  if (y >= P) return false;
  const y2 = mod(y * y), u = mod(y2 - 1n), v = mod(D * y2 + 1n);
  if (v === 0n) return u === 0n;
  const x2 = mod(u * modInv(v));
  if (x2 === 0n) return true;
  return modPow(x2, (P - 1n) / 2n) === 1n;        /* Euler's criterion: x² must be a square */
}

/* ---------- program-derived addresses ---------- */
function sha256(...parts) { const h = crypto.createHash('sha256'); parts.forEach(p => h.update(p)); return h.digest(); }
function seedBuf(s) { return Buffer.isBuffer(s) ? s : typeof s === 'string' && isAddress(s) && s.length >= 32 ? b58decode(s) : Buffer.from(s); }
function findPda(seeds, programId) {
  const prog = b58decode(programId), sb = seeds.map(seedBuf);
  for (let bump = 255; bump >= 0; bump--) {
    const h = sha256(...sb, Buffer.from([bump]), prog, Buffer.from('ProgramDerivedAddress'));
    if (!onCurve(h)) return b58encode(h);
  }
  throw new Error('no PDA');
}

/* ---------- little-endian readers ---------- */
const u64 = (buf, o) => Number(buf.readBigUInt64LE(o));
const i64 = (buf, o) => Number(buf.readBigInt64LE(o));
const pk = (buf, o) => b58encode(buf.subarray(o, o + 32));

/* ---------- small TTL cache with a size cap ---------- */
class TTL {
  constructor(ms, max) { this.ms = ms; this.max = max || 5000; this.m = new Map(); }
  get(k) { const e = this.m.get(k); if (!e) return undefined; if (e.t < Date.now()) { this.m.delete(k); return undefined; } return e.v; }
  set(k, v, ms) { if (this.m.size >= this.max) this.m.delete(this.m.keys().next().value); this.m.set(k, { v, t: Date.now() + (ms || this.ms) }); return v; }
  has(k) { return this.get(k) !== undefined; }
  delete(k) { this.m.delete(k); }
  /* one fetch per key at a time; the result (or failure) is shared */
  wrap(k, fn, ms) {
    const hit = this.get(k); if (hit !== undefined) return Promise.resolve(hit);
    const pk2 = '\u0000p' + k; const pend = this.m.get(pk2); if (pend) return pend.v;
    const p = Promise.resolve().then(fn).then(v => { this.m.delete(pk2); if (v !== undefined) this.set(k, v, ms); return v; }, e => { this.m.delete(pk2); throw e; });
    this.m.set(pk2, { v: p, t: Date.now() + 60000 }); return p;
  }
}

/* ---------- formatting, as the site formats it ---------- */
function pct(v, d) { return v == null ? '—' : (v * 100).toFixed(d == null ? 1 : d) + '%'; }
function usd(v) { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v), s = v < 0 ? '−$' : '$'; if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return s + (a / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return s + (a / 1e3).toFixed(1) + 'K'; return s + a.toFixed(0); }
function short(a) { return a ? a.slice(0, 4) + '…' + a.slice(-4) : '—'; }
function randomId(n) { return crypto.randomBytes(n || 12).toString('base64url'); }

const log = {
  info: (...a) => console.log(new Date().toISOString().slice(11, 19), ...a),
  warn: (...a) => console.warn(new Date().toISOString().slice(11, 19), 'WARN', ...a),
  error: (...a) => console.error(new Date().toISOString().slice(11, 19), 'ERROR', ...a)
};

module.exports = { sleep, cl, now, sum, b58encode, b58decode, isAddress, onCurve, findPda, sha256, u64, i64, pk, TTL, pct, usd, short, randomId, log };
