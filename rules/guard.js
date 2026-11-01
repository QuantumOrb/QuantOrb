'use strict';
/* Guard: three checks, the same for every new launch and for the creator card of a scan.
   HELD only on evidence: a check that has not been read yet is ok:null and never holds a launch.
   These are the server's own check functions. Reading the creator's launches from the chain, the launch
   slot and the dev's balance is the closed part. Guard runs on token pages and in scans; the Radar uses
   Shield (shield.js). */
const cfg = require('./limits');
const { pct } = require('./format');

const G = cfg.guard;

/* h: the creator's pump.fun launches.
     { launched, graduated, chain: true }  read from the chain (every pump.fun curve of the wallet): the Shield rule
     { launched, alive, local: true }      only the launches the server saw itself: evidence only when already serial
     { launched, alive }                   an older source that knew which launches are still alive */
function historyCheck(h) {
  if (!h) return { k: 'history', name: 'Creator history', ok: null, text: 'read once the launch gets traction' };
  if (h.unavailable) return { k: 'history', name: 'Creator history', ok: null, text: 'launch history not available right now' };
  /* from the chain: every launch with its graduated flag; the Telegram bot's rule (Shield): a serial creator launched
     GUARD_HISTORY_MIN+ tokens and under SHIELD_MAX_GRAD_PCT % of them graduated */
  if (h.chain) {
    const bad = h.launched >= G.historyMinLaunched && h.graduated * 100 < cfg.shield.maxGradPct * h.launched;
    return { k: 'history', name: 'Creator history', ok: !bad, text: h.launched + ' token' + (h.launched === 1 ? '' : 's') + ' launched, ' + h.graduated + ' graduated · from the chain',
      reason: 'serial creator: ' + h.launched + ' launches, ' + h.graduated + ' graduated' };
  }
  /* from our own record only (the chain query failed): it starts when our stream started, so it is evidence
     only when it already shows a serial creator; anything less is "not read", never a pass */
  if (h.local) {
    const bad = h.launched >= G.historyMinLaunched && h.alive / Math.max(1, h.launched) < G.historyMaxAliveRate;
    if (bad) return { k: 'history', name: 'Creator history', ok: false, text: h.launched + ' launches recorded by us, ' + h.alive + ' still alive', reason: 'creator launched ' + h.launched + ' tokens we saw, ' + h.alive + ' alive' };
    return { k: 'history', name: 'Creator history', ok: null, text: h.launched <= 1 ? 'creator check unavailable: the public RPC did not answer' : h.launched + ' launches in our own record · full history not read' };
  }
  const bad = h.launched >= G.historyMinLaunched && h.alive / Math.max(1, h.launched) < G.historyMaxAliveRate;
  return { k: 'history', name: 'Creator history', ok: !bad, text: h.launched + ' token' + (h.launched === 1 ? '' : 's') + ' launched, ' + h.alive + ' still alive',
    reason: 'creator launched ' + h.launched + ' tokens, ' + h.alive + ' alive' };
}
/* share: fraction of supply bought in the launch slot (null = not read) */
function slot0Check(share) {
  if (share == null) return { k: 'slot0', name: 'First-slot buyers', ok: null, text: 'launch slot not read' };
  return { k: 'slot0', name: 'First-slot buyers', ok: share < G.slot0Max, text: pct(share, 0) + ' of supply bought in the launch slot', reason: pct(share, 0) + ' bought in the first slot' };
}
/* share: fraction of supply the dev wallet holds; after: true once the launch has traded */
function devCheck(share, after) {
  if (share == null) return { k: 'dev', name: 'Dev holdings', ok: null, text: 'dev balance not read' };
  return { k: 'dev', name: 'Dev holdings', ok: share < G.devMax, text: 'dev holds ' + pct(share, share < 0.1 && after ? 1 : 0) + ' of supply' + (after ? ' now' : ''),
    reason: 'dev still holds ' + pct(share, 0) + ' after launch' };
}
/* checks → the Guard object the site and the bot show */
function verdict(checks) {
  const failed = checks.filter(c => c.ok === false);
  return { pass: failed.length === 0, reason: failed.length ? failed[0].reason : null, checks: checks.map(c => ({ k: c.k, name: c.name, ok: c.ok, text: c.text })),
    pending: checks.some(c => c.ok === null) || undefined };
}

/* one call for all three: { history, slot0Share, devShare, traded } */
function guard(x) {
  return verdict([historyCheck(x.history || null), slot0Check(x.slot0Share == null ? null : x.slot0Share), devCheck(x.devShare == null ? null : x.devShare, !!x.traded)]);
}

module.exports = { historyCheck, slot0Check, devCheck, verdict, guard };
