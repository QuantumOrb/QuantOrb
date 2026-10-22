'use strict';
/* The score rules one by one, at their edges. The numbers are the ones on quantumorb.app/#how. */
const test = require('node:test');
const assert = require('node:assert');
const { part, impact, WEIGHTS, scanVerdict } = require('../rules');

const holders = (shares, extra) => shares.map((s, i) => Object.assign({ share: s, kind: 'buy' }, extra && extra(i)));
const spread = n => Array.from({ length: n }, () => 0.012);          /* 20 × 1.2% = 24% of float */
const deep = { floatTokens: 1e9, reserveTokens: 5e9, liquidityUsd: 500000, links: [] };
const run = (h, more) => scanVerdict(Object.assign({}, deep, { holders: h }, more));

test('the five parts add up to 100', () => {
  assert.strictEqual(Object.values(WEIGHTS).reduce((a, b) => a + b, 0), 100);
});

test('a part is full at its first mark, zero at its second, straight in between', () => {
  assert.strictEqual(part('operator', 0.10), 35);
  assert.strictEqual(part('operator', 0.60), 0);
  assert.strictEqual(part('operator', 0.35), 17.5);
  assert.strictEqual(part('virgin', 0.10), 25);
  assert.strictEqual(part('virgin', 0.80), 0);
  assert.strictEqual(part('transfer', 0.01), 20);
  assert.strictEqual(part('transfer', 0.10), 0);
  assert.strictEqual(part('sniper', 0.15), 0);
  assert.strictEqual(part('concentration', 0.25), 10);
  assert.strictEqual(part('concentration', 0.70), 0);
});

test('price impact is a constant-product sale', () => {
  assert.strictEqual(impact(0, 100), 0);
  assert.strictEqual(impact(100, 0), 0);
  assert.ok(Math.abs(impact(100, 100) - 0.75) < 1e-12);   /* selling as many tokens as the pool holds: −75% */
});

test('twenty independent wallets with history score CLEAN', () => {
  const r = run(holders(spread(20)));
  assert.strictEqual(r.band, 'CLEAN');
  assert.strictEqual(r.score, 100);
  assert.deepStrictEqual(r.gates, []);
});

test('bands: CLEAN 80+, OK 60–79, RISKY 40–59, DANGER under 40', () => {
  const bandOf = s => s >= 80 ? 'CLEAN' : s >= 60 ? 'OK' : s >= 40 ? 'RISKY' : 'DANGER';
  const seen = new Set();
  /* sweep fresh wallets (up to 75%, under the red flag) and received supply (up to 9%, under the red flag) */
  for (let fresh = 0; fresh <= 15; fresh++) {
    for (let t = 0; t <= 9; t += 3) {
      const h = holders(spread(20), i => ({ virgin: i < fresh }));
      if (t) { h[19].share = t / 100; h[19].kind = 'transfer'; }
      const r = run(h);
      assert.deepStrictEqual(r.gates, []);
      assert.strictEqual(r.band, bandOf(r.score));
      seen.add(r.band);
    }
  }
  assert.ok(seen.has('CLEAN') && seen.has('OK') && seen.has('RISKY'));
  /* 50% fresh: 25 × (0.8 − 0.5) / 0.7 */
  assert.strictEqual(run(holders(spread(20), i => ({ virgin: i < 10 }))).parts.virgin, 10.7);
});

test('red flag: 80% of read wallets never traded before → DANGER whatever the score', () => {
  const r = run(holders(spread(20), i => ({ virgin: i < 16 })));
  assert.strictEqual(r.band, 'DANGER');
  assert.ok(r.gates.some(g => g.hard && /never traded before/.test(g.text)));
});

test('red flag: 10% of float received by transfer → DANGER', () => {
  const h = holders(spread(20)); h[0].share = 0.10; h[0].kind = 'transfer';
  const r = run(h);
  assert.strictEqual(r.band, 'DANGER');
  assert.ok(r.gates.some(g => g.hard && /received by transfer/.test(g.text)));
});

test('red flag: linked wallets that could move the price 50% → DANGER; one honest whale only caps', () => {
  const h = holders([0.2, 0.2].concat(spread(18)));
  const thin = { reserveTokens: 4e8 };
  const linked = run(h, Object.assign({ links: [{ a: 0, b: 1, kind: 'same_tx', level: 'proven' }] }, thin));
  assert.strictEqual(linked.band, 'DANGER');
  const whale = run(holders([0.4].concat(spread(19))), thin);
  assert.notStrictEqual(whale.band, 'DANGER');
  assert.ok(whale.score <= 59);
  assert.ok(whale.gates.some(g => !g.hard && /one holder could move price/.test(g.text)));
});

test('cap: a proven operator of 3+ wallets holds the verdict at RISKY', () => {
  const links = [{ a: 0, b: 1, kind: 'same_tx', level: 'proven' }, { a: 0, b: 2, kind: 'direct', level: 'proven' }];
  const r = run(holders(spread(20)), { links });
  assert.ok(r.score <= 59);
  assert.ok(r.gates.some(g => /proven operator of 3 wallets/.test(g.text)));
});

test('cap: liquidity under $1,000 holds the verdict at RISKY', () => {
  const r = run(holders(spread(20)), { liquidityUsd: 900 });
  assert.strictEqual(r.score, 59);
  assert.strictEqual(r.band, 'RISKY');
});

test('unread wallets are never evidence; 3 or more cap the verdict and make it PARTIAL', () => {
  const two = run(holders(spread(20), i => ({ unread: i < 2 })));
  assert.strictEqual(two.state, 'ok');
  assert.ok(two.gates.some(g => g.note));
  const three = run(holders(spread(20), i => ({ unread: i < 3 })));
  assert.strictEqual(three.state, 'partial');
  assert.ok(three.score <= 59);
});

test('a wallet under 0.5% of float that was not read does not count toward PARTIAL', () => {
  const h = holders(spread(17).concat([0.004, 0.004, 0.004]), i => ({ unread: i >= 17 }));
  assert.strictEqual(run(h).state, 'ok');
});

test('the dev wallet is left out of fresh wallets and snipers', () => {
  const h = holders(spread(20), i => ({ dev: i === 0, virgin: i === 0, sniper: i === 0 }));
  const r = run(h);
  assert.strictEqual(r.metrics.virgin, 0);
  assert.strictEqual(r.metrics.sniper, 0);
});

test('snipers who already sold are not counted', () => {
  const held = run(holders(spread(20), i => ({ sniper: i < 10 })));
  const sold = run(holders(spread(20), i => ({ sniper: i < 10, sold: true })));
  assert.ok(held.parts.sniper < 10);
  assert.strictEqual(sold.parts.sniper, 10);
});

test('the sell scenario appears only on DANGER, and only when the drop is 40% or more', () => {
  const ok = run(holders(spread(20)));
  assert.strictEqual(ok.scenario, null);
  const h = holders(spread(20), i => ({ virgin: i < 16 }));
  const shallow = run(h);                                  /* DANGER, but a deep pool: no scenario */
  assert.strictEqual(shallow.band, 'DANGER');
  assert.strictEqual(shallow.scenario, null);
  const steep = run(h, { reserveTokens: 1e8 });
  assert.ok(steep.scenario && steep.scenario.drop >= 0.4);
});

test('too early under 10 holders, too established when old, deep and big', () => {
  assert.strictEqual(run(holders(spread(9))).band, 'EARLY');
  assert.strictEqual(run(holders(spread(10))).band !== 'EARLY', true);
  const old = run(holders(spread(20)), { market: { ageDays: 31, liquidityUsd: 600000, mcap: 2e7 } });
  assert.strictEqual(old.band, 'ESTABLISHED');
  const young = run(holders(spread(20)), { market: { ageDays: 29, liquidityUsd: 600000, mcap: 2e7 } });
  assert.notStrictEqual(young.band, 'ESTABLISHED');
});
