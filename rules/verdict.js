'use strict';
/* One scan, from the holders and links the scanner found to the verdict on the page.
   The steps and their order are the scanner's: too established → too early → operators → score.
   What the scanner reads from the chain to fill this input (who holds, how each one got in, which
   wallets are linked, the pool) is the closed part. */
const cfg = require('./limits');
const { sum } = require('./format');
const { operators } = require('./operators');
const { score } = require('./score');
const { guard } = require('./guard');

const HOLDER = { kind: null, virgin: false, unread: false, sniper: false, bundle: false, dev: false, sold: false, op: null };

/* input:
     holders       top 20 wallets by share of float: { share, kind: 'buy'|'transfer', virgin, sniper, bundle, sold, dev, unread }
     links         [{ a, b, kind, level: 'proven'|'pack' }] between holders (by position)
     floatTokens   supply outside the curve, pools, lockers and burn addresses
     reserveTokens tokens in the pool a sale would go into
     liquidityUsd  the pool's liquidity
     stage         'curve' or a pool name (only for the TOO EARLY headline)
     market        { ageDays, liquidityUsd, mcap } (only for TOO ESTABLISHED)
     creator, slot0Share, devShare, traded   (optional: Guard) */
function scanVerdict(input) {
  const SC = cfg.scan, mk = input.market || null;
  const out = { guard: hasGuard(input) ? guard({ history: input.creator, slot0Share: input.slot0Share, devShare: input.devShare, traded: input.traded }) : undefined };

  if (mk && mk.ageDays > SC.establishedDays && mk.liquidityUsd > SC.establishedLiq && mk.mcap > SC.establishedMcap)
    return Object.assign({ state: 'too_established', band: 'ESTABLISHED', score: null, operators: [], gates: [], scenario: null, headline: 'Too established for a holder scan' }, out);

  const hs = (input.holders || []).map((h, i) => Object.assign({}, HOLDER, h, { i, op: null }));
  if (hs.length < SC.minHolders) {
    const tot = sum(hs, h => h.share) || 1;
    hs.forEach(h => { h.share = h.share / tot; });
    const n = hs.length;
    return Object.assign({ state: 'too_early', band: 'EARLY', score: null, holders: hs, gates: [], scenario: null,
      operators: hs.map(h => ({ id: null, wallets: [h.i], share: h.share, level: null, weighted: h.share })),
      headline: n + ' wallet' + (n === 1 ? '' : 's') + ' hold' + (n === 1 ? 's' : '') + ' this token outside the ' + ((input.stage || 'curve') === 'curve' ? 'curve' : 'pools') }, out);
  }

  const ops = operators(hs, input.links || []);
  const unread = hs.filter(h => h.unread && h.share >= SC.deepMinShare).length;
  const s = score(hs, ops, { floatTokens: input.floatTokens, reserveTokens: input.reserveTokens, liquidityUsd: input.liquidityUsd == null ? null : input.liquidityUsd, unread });
  return Object.assign({ state: unread >= 3 ? 'partial' : 'ok', unread, holders: hs, operators: ops }, s, out);
}

function hasGuard(x) { return x.creator !== undefined || x.slot0Share !== undefined || x.devShare !== undefined; }

module.exports = { scanVerdict };
