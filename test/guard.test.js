'use strict';
/* Guard's three checks at their thresholds: a launch is held back only on evidence. */
const test = require('node:test');
const assert = require('node:assert');
const { guard, historyCheck, slot0Check, devCheck } = require('../rules');

test('creator history from the chain: 10+ launches and under 10% graduated is held', () => {
  assert.strictEqual(historyCheck({ launched: 10, graduated: 0, chain: true }).ok, false);
  assert.strictEqual(historyCheck({ launched: 10, graduated: 1, chain: true }).ok, true);     /* exactly 10% passes */
  assert.strictEqual(historyCheck({ launched: 9, graduated: 0, chain: true }).ok, true);      /* under 10 launches never holds */
  assert.strictEqual(historyCheck({ launched: 2500, graduated: 4, chain: true }).ok, false);
});

test('creator history from the chain, in the words the token page uses', () => {
  const serial = historyCheck({ launched: 68, graduated: 0, chain: true });
  assert.strictEqual(serial.text, '68 tokens launched, 0 graduated · from the chain');
  assert.strictEqual(serial.reason, 'serial creator: 68 launches, 0 graduated');
  assert.strictEqual(historyCheck({ launched: 1, graduated: 1, chain: true }).text, '1 token launched, 1 graduated · from the chain');
});

test('only the server\'s own record: evidence when it already shows a serial creator, otherwise not read', () => {
  assert.strictEqual(historyCheck({ launched: 12, alive: 1, local: true }).ok, false);
  const few = historyCheck({ launched: 3, alive: 3, local: true });
  assert.strictEqual(few.ok, null);                                                          /* never a made-up pass */
  assert.strictEqual(historyCheck({ launched: 1, alive: 1, local: true }).text, 'creator check unavailable: the public RPC did not answer');
});

test('creator history that is not read yet never holds a launch', () => {
  assert.strictEqual(historyCheck(null).ok, null);
  assert.strictEqual(historyCheck({ unavailable: true }).ok, null);
});

test('first-slot buyers: 30% of supply or more is held', () => {
  assert.strictEqual(slot0Check(0.299).ok, true);
  assert.strictEqual(slot0Check(0.30).ok, false);
  assert.strictEqual(slot0Check(null).ok, null);
});

test('dev holdings: 15% of supply or more is held', () => {
  assert.strictEqual(devCheck(0.149).ok, true);
  assert.strictEqual(devCheck(0.15).ok, false);
  assert.strictEqual(devCheck(0.042, true).text, 'dev holds 4.2% of supply now');
});

test('one failed check holds the launch and gives its reason', () => {
  const g = guard({ history: { launched: 3, graduated: 1, chain: true }, slot0Share: 0.05, devShare: 0.23, traded: true });
  assert.strictEqual(g.pass, false);
  assert.strictEqual(g.reason, 'dev still holds 23% after launch');
});

test('a check that is not read makes Guard pending, not a pass on evidence', () => {
  const g = guard({ history: { launched: 2, alive: 2, local: true }, slot0Share: 0.05, devShare: 0.02 });
  assert.strictEqual(g.pass, true);
  assert.strictEqual(g.pending, true);                    /* the site shows GUARD · PARTIAL */
});
