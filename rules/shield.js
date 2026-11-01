'use strict';
/* Shield: the launch check on the Radar, the 1,000-launch grid and the home page, and the Telegram bot's rule.
   Two checks, both free to read:
     creator history  a serial creator launched 10+ tokens and under 10% of them graduated (every pump.fun curve
                      of the wallet, read from the chain)
     dev at launch    the creator's own buy in the create transaction is 15% of supply or more
   evaluate() and devCheck() are the server's own functions. Looking a creator up on the chain, the cache and the
   fallback to launches the server recorded itself are the closed part; creatorCheck() below keeps only what
   happens once the record is known. A check that is not read yet is ok:null and never holds a launch. */
const cfg = require('./limits');
const { verdict } = require('./guard');
const { pct } = require('./format');

const SH = cfg.shield;

/* the bot's evaluate(): {launches, graduated, serial} */
function evaluate(r) {
  if (!r || r.launched == null) return null;
  const serial = r.launched >= SH.minLaunches && r.graduated * 100 < SH.maxGradPct * r.launched;
  return { launches: r.launched, graduated: r.graduated, serial };
}

/* rec: { launched, graduated } from the chain, or null while it is not read. 0 launches for the creator of a
   pump.fun token is an incomplete answer (the launch itself is one of them), so it is "unavailable", not a pass. */
function creatorCheck(rec) {
  const r = rec && rec.launched > 0 ? evaluate(rec) : null;
  if (r) return { k: 'history', name: 'Creator history', ok: !r.serial, text: r.launches + ' token' + (r.launches === 1 ? '' : 's') + ' launched, ' + r.graduated + ' graduated',
    reason: 'serial creator: ' + r.launches + ' launches, ' + r.graduated + ' graduated' };
  if (rec && rec.launched === 0) return { k: 'history', name: 'Creator history', ok: null, text: 'creator check unavailable (incomplete answer)' };
  return { k: 'history', name: 'Creator history', ok: null, text: 'read once the launch gets traction' };
}

/* x: { devAtLaunch (tokens the dev bought in the create transaction), supply } */
function devCheck(x) {
  if (x.devAtLaunch == null) return { k: 'dev', name: 'Dev at launch', ok: null, text: 'dev buy not known' };
  const share = x.devAtLaunch / (x.supply || cfg.curve.totalSupply);
  return { k: 'dev', name: 'Dev at launch', ok: share < SH.devMax, text: 'dev bought ' + pct(share, share < 0.1 ? 1 : 0) + ' of supply at launch',
    reason: 'dev bought ' + pct(share, 0) + ' at launch' };
}

/* the Shield verdict of one launch: { creator: { launched, graduated } | null, devAtLaunch, supply } */
function shield(x) { return verdict([creatorCheck(x.creator), devCheck(x)]); }

module.exports = { evaluate, creatorCheck, devCheck, shield };
