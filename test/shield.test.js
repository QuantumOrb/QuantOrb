'use strict';
/* Shield: the check on every launch on the Radar, and the Telegram bot's rule. */
const test = require('node:test');
const assert = require('node:assert');
const { shield, evaluateCreator, shieldCreatorCheck, shieldDevCheck } = require('../rules');

test('a serial creator: 10+ launches and under 10% graduated', () => {
  assert.deepStrictEqual(evaluateCreator({ launched: 10, graduated: 0 }), { launches: 10, graduated: 0, serial: true });
  assert.strictEqual(evaluateCreator({ launched: 10, graduated: 1 }).serial, false);       /* exactly 10% passes */
  assert.strictEqual(evaluateCreator({ launched: 279, graduated: 3 }).serial, true);
  assert.strictEqual(evaluateCreator({ launched: 9, graduated: 0 }).serial, false);
  assert.strictEqual(evaluateCreator(null), null);
});

test('0 launches for the creator of a pump.fun token is an incomplete answer, never a pass', () => {
  const c = shieldCreatorCheck({ launched: 0, graduated: 0 });
  assert.strictEqual(c.ok, null);
  assert.strictEqual(shieldCreatorCheck(null).ok, null);
});

test('dev at launch: buying 15% of supply or more in the create transaction is held', () => {
  assert.strictEqual(shieldDevCheck({ devAtLaunch: 149e6 }).ok, true);
  assert.strictEqual(shieldDevCheck({ devAtLaunch: 150e6 }).ok, false);
  assert.strictEqual(shieldDevCheck({ devAtLaunch: 32e6 }).text, 'dev bought 3.2% of supply at launch');
  assert.strictEqual(shieldDevCheck({}).ok, null);
});

test('the Shield verdict: HELD with the first reason, PASS when both checks pass', () => {
  const held = shield({ creator: { launched: 2500, graduated: 4 }, devAtLaunch: 1e6 });
  assert.strictEqual(held.pass, false);
  assert.strictEqual(held.reason, 'serial creator: 2500 launches, 4 graduated');
  const ok = shield({ creator: { launched: 3, graduated: 1 }, devAtLaunch: 20e6 });
  assert.strictEqual(ok.pass, true);
  assert.strictEqual(ok.pending, undefined);
  const early = shield({ creator: null, devAtLaunch: 20e6 });
  assert.strictEqual(early.pass, true);
  assert.strictEqual(early.pending, true);               /* creator read once the launch gets traction */
});
