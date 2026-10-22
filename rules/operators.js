'use strict';
/* From links to operators: proven links merge wallets into one operator; a pack (3+ fresh wallets that
   entered together) is behaviour, not proof, so its share counts at 60%. Everyone else stands alone.
   This is the server's own function. Finding the links on the chain is the closed part of the scanner. */
const { sum } = require('./format');

/* hs: holders (index = position), links: [{ a, b, kind, level: 'proven' | 'pack' }] */
function operators(hs, links) {
  const parent = hs.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const packOf = {};
  links.forEach(l => { if (l.level === 'proven') parent[find(l.a)] = find(l.b); });
  const groups = {}; hs.forEach((h, i) => { const r = find(i); (groups[r] = groups[r] || []).push(i); });
  const out = [];
  Object.values(groups).forEach(g => { if (g.length > 1) out.push({ wallets: g, level: 'proven' }); });
  /* packs: the members not already in a proven group */
  const inProven = new Set(out.flatMap(o => o.wallets));
  const packs = {}; links.filter(l => l.level === 'pack').forEach(l => { const k = l.a; (packs[k] = packs[k] || new Set([l.a])).add(l.b); });
  Object.values(packs).forEach(s => { const w = [...s].filter(i => !inProven.has(i)); if (w.length >= 2) { out.push({ wallets: w, level: 'pack' }); w.forEach(i => { packOf[i] = 1; }); } });
  const taken = new Set(out.flatMap(o => o.wallets));
  hs.forEach((h, i) => { if (!taken.has(i)) out.push({ wallets: [i], level: null }); });
  out.forEach(o => { o.share = sum(o.wallets, i => hs[i].share); o.weighted = o.share * (o.level === 'pack' ? 0.6 : 1); });
  out.sort((a, b) => b.weighted - a.weighted);
  let n = 0;
  const res = out.map(o => { const idv = o.wallets.length > 1 ? 'OP-' + (++n) : null; if (idv) o.wallets.forEach(i => { hs[i].op = idv; }); return { id: idv, wallets: o.wallets.sort((a, b) => a - b), share: o.share, level: o.wallets.length > 1 ? o.level : null, weighted: o.weighted }; });
  return res;
}

module.exports = { operators };
