'use strict';
/* The score, exactly as the site describes it (and as the sample in the site was built):
   five parts, linear between "full" and "zero"; red flags force DANGER; caps hold the verdict at RISKY.
   This file is the server's own score module; only the two require() lines point here instead. */
const cfg = require('./limits');
const { pct, usd, sum } = require('./format');

const WEIGHTS = { operator: 35, virgin: 25, transfer: 20, sniper: 10, concentration: 10 };
const SCALE = { operator: [0.10, 0.60], virgin: [0.10, 0.80], transfer: [0.01, 0.10], sniper: [0.01, 0.15], concentration: [0.25, 0.70] };
function part(k, x) { const g = SCALE[k][0], bd = SCALE[k][1], q = x <= g ? 1 : x >= bd ? 0 : (bd - x) / (bd - g); return Math.round(WEIGHTS[k] * q * 10) / 10; }
/* price drop when q tokens are sold into a constant-product pool holding R tokens */
function impact(q, R) { return q <= 0 || !(R > 0) ? 0 : 1 - Math.pow(R / (R + q), 2); }

/* H: holders, ops: operators sorted by weighted, floatTokens, reserveTokens (R), liquidityUsd, unread: holders not read in time */
function score(H, ops, ctx) {
  const F = ctx.floatTokens, R = ctx.reserveTokens, unread = ctx.unread;
  const real = ops.filter(o => o.wallets.length > 1);
  const big = ops[0], imp = big ? impact(big.weighted * F, R) : 0;
  const nonDev = H.filter(h => !h.dev), readW = nonDev.filter(h => !h.unread);
  const C = sum(H, h => h.share);
  const m = { impact: imp, operator: big ? big.weighted : 0, unread,
    virgin: readW.filter(h => h.virgin).length / Math.max(1, readW.length),
    transfer: sum(H.filter(h => h.kind === 'transfer'), h => h.share),
    sniper: sum(nonDev.filter(h => h.sniper && !h.sold), h => h.share),
    concentration: C };
  const parts = { operator: part('operator', imp), virgin: part('virgin', m.virgin), transfer: part('transfer', m.transfer), sniper: part('sniper', m.sniper), concentration: part('concentration', C) };
  let total = Math.round(parts.operator + parts.virgin + parts.transfer + parts.sniper + parts.concentration);
  const gates = [];
  if (big && imp >= 0.5 && big.wallets.length > 1) gates.push({ hard: true, text: 'biggest operator could move price −' + Math.round(imp * 100) + '% if sold (' + pct(big.share) + ' of float, ' + big.wallets.length + ' linked wallets)' });
  if (m.virgin >= 0.8 && readW.length) gates.push({ hard: true, text: Math.round(m.virgin * 100) + '% of the top wallets never traded before this token' });
  if (m.transfer >= 0.10) gates.push({ hard: true, text: pct(m.transfer) + ' of float was received by transfer, not bought' });
  real.forEach(o => { if (o.level === 'pack' || o.wallets.length >= 3) gates.push({ hard: false, text: (o.level === 'pack' ? 'pack of ' : 'proven operator of ') + o.wallets.length + ' wallets holds ' + pct(o.share) + ' of float' }); });
  if (big && imp >= 0.5 && big.wallets.length === 1) gates.push({ hard: false, text: 'one holder could move price −' + Math.round(imp * 100) + '% (thin liquidity)' });
  if (ctx.liquidityUsd != null && ctx.liquidityUsd < cfg.scan.lowLiquidityUsd) gates.push({ hard: false, text: 'liquidity is only ' + usd(ctx.liquidityUsd) + ' · verdict capped at RISKY' });
  const hard = gates.some(g => g.hard); let soft = gates.some(g => !g.hard);
  if (unread >= 3) { gates.push({ hard: false, text: unread + ' of ' + H.length + ' wallets could not be read in time · verdict capped at RISKY' }); soft = true; }
  else if (unread > 0) gates.push({ hard: false, note: true, text: unread + ' wallet' + (unread > 1 ? 's' : '') + ' could not be read in time · not counted as evidence' });
  if (soft) total = Math.min(total, 59);
  const band = hard ? 'DANGER' : total >= 80 ? 'CLEAN' : total >= 60 ? 'OK' : total >= 40 ? 'RISKY' : 'DANGER';
  /* sell scenario: only for DANGER driven by linked, fresh or transferred supply, and only if it would move the price 40%+ */
  let scenario = null;
  if (band === 'DANGER') {
    const realIds = new Set(real.map(o => o.id));
    const sus = H.filter(h => (h.op && realIds.has(h.op)) || h.kind === 'transfer' || h.virgin || (h.bundle && !h.sold));
    const q = sum(sus, h => h.share), d = impact(q * F, R);
    if (d >= 0.4) scenario = { drop: d, share: q, wallets: sus.length, parts: [
      { k: 'linked', share: sum(sus.filter(h => h.op && realIds.has(h.op)), h => h.share) },
      { k: 'fresh', share: sum(sus.filter(h => !(h.op && realIds.has(h.op)) && h.virgin), h => h.share) },
      { k: 'transfer', share: sum(sus.filter(h => !(h.op && realIds.has(h.op)) && !h.virgin && h.kind === 'transfer'), h => h.share) }] };
  }
  const headline = H.length + ' wallets → ' + ops.length + ' operators, biggest holds ' + pct(big ? big.share : 0) + ' of float' + (imp >= 0.01 ? ', could move price −' + Math.round(imp * 100) + '% if sold' : '');
  return { score: total, band, parts, metrics: m, gates, scenario, headline };
}

module.exports = { score, part, impact, WEIGHTS, SCALE };
