'use strict';
/* chain/: the server's reader of pump.fun and Solana accounts and transactions. The curve addresses are the same
   real vectors the bot's Python reader is tested on (bot/tests/curve_vectors.py), so both readers agree. */
const test = require('node:test');
const assert = require('node:assert');
const S = require('../chain/solana');
const U = require('../chain/util');
const V = require('./fixtures/curve-vectors.json');

test('the bonding curve of real pump.fun tokens', () => {
  assert.ok(V.vectors.length >= 30);
  for (const [mint, curve] of V.vectors) assert.strictEqual(S.bondingCurve(mint), curve, mint);
});

test('base58 round trip and address checks', () => {
  for (const a of [S.P.PUMP, S.WSOL, S.DEFAULT_PK, V.vectors[0][0]]) assert.strictEqual(U.b58encode(U.b58decode(a)), a);
  assert.ok(U.isAddress(S.P.PUMP));
  assert.ok(!U.isAddress('not-an-address'));
  assert.ok(!U.isAddress('0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl'));
});

test('a program-derived address is never on the ed25519 curve', () => {
  const pda = S.bondingCurve(V.vectors[1][0]);
  assert.ok(!U.onCurve(U.b58decode(pda)));
});

function curveAccount(o) {
  const b = Buffer.alloc(151);
  Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]).copy(b, 0);
  [o.vt, o.vq, o.rt, o.rq, o.supply].forEach((v, i) => b.writeBigUInt64LE(BigInt(v), 8 + i * 8));
  b[48] = o.complete ? 1 : 0;
  if (o.creator) U.b58decode(o.creator).copy(b, 49);
  b[81] = o.mayhem ? 1 : 0;
  if (o.quote) U.b58decode(o.quote).copy(b, 83);
  return b;
}

test('decodeCurve: a SOL curve', () => {
  const creator = V.vectors[2][0];
  const c = S.decodeCurve(curveAccount({ vt: 1000000000e6, vq: 32e9, rt: 700000000e6, rq: 2e9, supply: 1000000000e6, creator }));
  assert.strictEqual(c.vTokens, 1e9);
  assert.strictEqual(c.vSol, 32);
  assert.strictEqual(c.realTokens, 7e8);
  assert.strictEqual(c.creator, creator);
  assert.strictEqual(c.complete, false);
  assert.strictEqual(c.quoteMint, null);                              /* default key: the curve is quoted in SOL */
});

test('decodeCurve: a curve quoted in USDC uses 6 decimals for the quote', () => {
  const c = S.decodeCurve(curveAccount({ vt: 1e15, vq: 5000e6, rt: 1e14, rq: 100e6, supply: 1e15, quote: S.USDC, complete: true }));
  assert.strictEqual(c.quoteMint, S.USDC);
  assert.strictEqual(c.vSol, 5000);
  assert.strictEqual(c.complete, true);
  assert.strictEqual(S.decodeCurve(Buffer.alloc(20)), null);
});

test('parseMint: Token-2022 with a transfer fee and on-chain metadata', () => {
  const m = S.parseMint({ owner: S.P.TOKEN22, data: { parsed: { type: 'mint', info: { decimals: 6, supply: '1000000000000000', mintAuthority: null, freezeAuthority: null,
    extensions: [{ extension: 'transferFeeConfig', state: { newerTransferFee: { transferFeeBasisPoints: 150 }, transferFeeConfigAuthority: 'A' } },
      { extension: 'tokenMetadata', state: { name: 'Orb', symbol: 'ORB', uri: 'ipfs://x', updateAuthority: null } }] } } } });
  assert.strictEqual(m.program, 'Token-2022');
  assert.strictEqual(m.supply, 1e9);
  assert.strictEqual(m.transferFeeBps, 150);
  assert.strictEqual(m.md.symbol, 'ORB');
  assert.strictEqual(m.mintAuthority, null);
});

const MINT = V.vectors[3][0], BUYER = V.vectors[4][0], POOL = V.vectors[5][0];
function tx(o) {
  return { slot: 1, blockTime: 1700000000, version: 0, transaction: { signatures: ['sig1'], message: {
      accountKeys: [{ pubkey: BUYER, signer: true }, { pubkey: POOL, signer: false }, { pubkey: o.mintSigner ? MINT : S.P.SYSTEM, signer: !!o.mintSigner }],
      instructions: o.ix || [{ programId: S.P.PUMP, accounts: [MINT, S.bondingCurve(MINT), BUYER] }] } },
    meta: { err: null, preBalances: [5e9, 10e9, 0], postBalances: [4e9, 11e9, 0], innerInstructions: [], logMessages: [],
      preTokenBalances: [{ mint: MINT, owner: POOL, uiTokenAmount: { amount: '900000000000', decimals: 6 } }],
      postTokenBalances: [{ mint: MINT, owner: POOL, uiTokenAmount: { amount: '850000000000', decimals: 6 } }, { mint: MINT, owner: BUYER, uiTokenAmount: { amount: '50000000000', decimals: 6 } }] } };
}

test('readTx: who got how many tokens and how much SOL moved', () => {
  const r = S.readTx(tx({}), MINT);
  assert.strictEqual(r.delta[BUYER], 50000);
  assert.strictEqual(r.delta[POOL], -50000);
  assert.strictEqual(r.sol[BUYER], -1);
  assert.strictEqual(r.swap, true);
  assert.strictEqual(r.feePayer, BUYER);
  assert.strictEqual(S.readTx(Object.assign(tx({}), { meta: Object.assign(tx({}).meta, { err: { x: 1 } }) }), MINT), null);
});

test('createSigner: the dev is the signer of pump.fun\'s create, never the mint itself', () => {
  assert.strictEqual(S.createSigner(tx({ mintSigner: true }), MINT, S.bondingCurve(MINT)), BUYER);
  assert.strictEqual(S.createSigner(tx({ ix: [{ programId: S.P.SYSTEM, accounts: [] }] }), MINT, S.bondingCurve(MINT)), null);
});

test('infrastructure is never a holder: the curve, pools, lockers and the burn address', () => {
  assert.strictEqual(S.INFRA_PROGRAMS[S.P.PUMP], 'bonding curve');
  assert.strictEqual(S.INFRA_ADDR[S.BURN], 'burn address');
  assert.ok(S.LOCKERS[S.P.STREAMFLOW]);
});
