'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { operators } = require('../rules');

const hs = shares => shares.map((s, i) => ({ i, share: s }));

test('without links every wallet is its own operator, biggest first', () => {
  const ops = operators(hs([0.05, 0.2, 0.1]), []);
  assert.deepStrictEqual(ops.map(o => o.wallets), [[1], [2], [0]]);
  assert.ok(ops.every(o => o.id === null && o.level === null));
});

test('proven links merge wallets, even through a chain', () => {
  const h = hs([0.1, 0.1, 0.1, 0.05]);
  const ops = operators(h, [{ a: 0, b: 1, level: 'proven' }, { a: 1, b: 2, level: 'proven' }]);
  assert.deepStrictEqual(ops[0].wallets, [0, 1, 2]);
  assert.strictEqual(ops[0].id, 'OP-1');
  assert.ok(Math.abs(ops[0].share - 0.3) < 1e-12);
  assert.strictEqual(h[0].op, 'OP-1');
});

test('a pack counts at 60% of its share', () => {
  const ops = operators(hs([0.1, 0.1, 0.1, 0.25]), [{ a: 0, b: 1, level: 'pack' }, { a: 0, b: 2, level: 'pack' }]);
  const pack = ops.find(o => o.level === 'pack');
  assert.deepStrictEqual(pack.wallets, [0, 1, 2]);
  assert.ok(Math.abs(pack.weighted - 0.18) < 1e-12);
  /* 0.25 alone outweighs a 0.30 pack (0.18 weighted) */
  assert.deepStrictEqual(ops[0].wallets, [3]);
});

test('a wallet already in a proven operator is not counted again in a pack', () => {
  const links = [{ a: 0, b: 1, level: 'proven' }, { a: 1, b: 2, level: 'pack' }, { a: 1, b: 3, level: 'pack' }];
  const ops = operators(hs([0.1, 0.1, 0.1, 0.1]), links);
  const proven = ops.find(o => o.level === 'proven'), pack = ops.find(o => o.level === 'pack');
  assert.deepStrictEqual(proven.wallets, [0, 1]);
  assert.deepStrictEqual(pack.wallets, [2, 3]);
});
