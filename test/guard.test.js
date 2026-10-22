'use strict';
/* Guard's three checks at their thresholds: a launch is held back only on evidence. */
const test = require('node:test');
const assert = require('node:assert');
const { guard, historyCheck, slot0Check, devCheck } = require('../rules');

test('creator history: 10+ launches and fewer than 1 in 5 alive is held', () => {
  assert.strictEqual(historyCheck({ launched: 10, alive: 1 }).ok, false);
  assert.strictEqual(historyCheck({ launched: 10, alive: 2 }).ok, true);    /* exactly 1 in 5 passes */
  assert.strictEqual(historyCheck({ launched: 9, alive: 0 }).ok, true);     /* under 10 launches never holds */
  assert.strictEqual(historyCheck({ launched: 2500, alive: 4 }).ok, false);
});

test('creator history that is not read yet never holds a launch', () => {
  assert.strictEqual(historyCheck(null).ok, null);
  assert.strictEqual(historyCheck({ unavailable: true }).ok, null);
  assert.strictEqual(historyCheck({ launched: 1, alive: 1, local: true }).text, 'new to us · no earlier launches recorded');
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
  const g = guard({ history: { launched: 3, alive: 1 }, slot0Share: 0.05, devShare: 0.23, traded: true });
  assert.strictEqual(g.pass, false);
  assert.strictEqual(g.reason, 'dev still holds 23% after launch');
});

test('a launch with checks still pending passes so far', () => {
  const g = guard({ history: null, slot0Share: 0.05, devShare: 0.02 });
  assert.strictEqual(g.pass, true);
  assert.strictEqual(g.pending, true);
});
