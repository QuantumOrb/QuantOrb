'use strict';
/* The three helpers the rules need, as the server has them. */
const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
function pct(v, d) { return v == null ? '—' : (v * 100).toFixed(d == null ? 1 : d) + '%'; }
function usd(v) { if (v == null || !isFinite(v)) return '—'; const a = Math.abs(v), s = v < 0 ? '−$' : '$'; if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return s + (a / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return s + (a / 1e3).toFixed(1) + 'K'; return s + a.toFixed(0); }

module.exports = { sum, pct, usd };
