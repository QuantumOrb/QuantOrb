'use strict';
/* Market numbers of a token page (update 9), without the network: the pool logic of market/pools.js (the server's sources/markets.js) on the
   answers DexScreener and GeckoTerminal give for $ANT (4Wdn6GGJ…bpump, PumpSwap, quoted in another pump coin).
   DexScreener has one pair, ANT / ANTHROPIC, with price, liquidity and caps empty; GeckoTerminal's first page has 20
   pools, among them ANT / ANTHRP (FDV $392,596.19, liquidity $61,086.74, price $0.0004043150322, market cap null),
   a pool where ANT is the quote, a pool of another token also called ANT, a dust pool and the finished pump.fun curve.
     1 · DexScreener's empty pair is read as unknown (null), never 0, and calls for GeckoTerminal
     2 · GeckoTerminal pools are taken by mint only: the right side's price, no FDV from the other token
     3 · one row per pool: GeckoTerminal fills DexScreener's gaps
     4 · the price comes from the deep, traded pool (PumpSwap here), not from dust, stale or foreign pools
     5 · 24 h volume, liquidity of all pools, age from the oldest pool (the pump.fun curve = the launch)
     6 · market cap and FDV kept apart
     7 · a pool without a USD price: its price in the quote × the quote's price
   The server's own test of these functions; here it runs on market/pools.js. Usage: node test/market.test.js */
const M = require('../market/pools');
const F = require('./fixtures/ant-pumpswap.json');

let passes = 0, fails = 0;
function ok(cond, name, detail) { if (cond) passes++; else fails++; console.log('  ' + (cond ? 'PASS' : 'FAIL') + '  ' + name + (detail != null ? ' · ' + detail : '')); }
const near = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= Math.abs(b) * (tol || 1e-9);
const MINT = F.mint, P = F.pools;

console.log('\n1 · DexScreener: the ANT / ANTHROPIC pair with empty price, liquidity and caps');
const dl = F.dexscreener.map(p => M.dexPool(p, MINT)).filter(Boolean);
{
  const d = dl[0];
  ok(dl.length === 1 && d.pool === P.ps && d.side === 'base' && d.dex === 'pumpswap', 'the pair is kept (this mint is its base)', d && d.pool);
  ok(d.priceUsd === null && d.liqUsd === null && d.mcap === null && d.fdv === null, 'price, liquidity, market cap, FDV: unknown (null), not 0',
    JSON.stringify({ priceUsd: d.priceUsd, liqUsd: d.liqUsd, mcap: d.mcap, fdv: d.fdv }));
  ok(d.vol24 === null, 'DexScreener\'s "volume 0" of an unpriced pair is not taken as a real $0', 'vol24 ' + d.vol24);
  ok(d.priceNative > 0 && d.quote === F.quoteMint && d.tx24 === 1452, 'what it does know is kept: price in the quote, the quote mint, 24 h trades', d.priceNative + ' · ' + d.tx24 + ' trades');
  ok(M.needsGecko(M.pickPool(dl, {}), 'pumpswap'), 'the price pool has no USD price → GeckoTerminal is read');
  /* a normal pair is complete: no GeckoTerminal request */
  const good = M.dexPool({ chainId: 'solana', dexId: 'pumpswap', pairAddress: 'X', baseToken: { address: MINT }, quoteToken: { address: 'So11111111111111111111111111111111111111112' },
    priceUsd: '0.0004', priceNative: '0.0000022', liquidity: { usd: 50000, base: 1, quote: 1 }, volume: { h24: 1200 }, fdv: 388000, marketCap: 388000 }, MINT);
  ok(!M.needsGecko(good, 'pumpswap'), 'a pair with price, liquidity and volume: DexScreener alone is enough');
  ok(!M.needsGecko(Object.assign({}, good, { liqUsd: null }), 'curve') && M.needsGecko(Object.assign({}, good, { liqUsd: null }), 'pumpswap'),
    'on the curve its liquidity comes from the curve account; after it, a pool without liquidity calls for GeckoTerminal');
  ok(M.needsGecko(Object.assign({}, good, { dex: 'pumpfun' }), 'pumpswap'), 'a graduated coin priced only from its finished pump.fun curve: GeckoTerminal is read');
  /* liquidity 0 next to a price: not a real number either */
  const zero = M.dexPool({ chainId: 'solana', dexId: 'raydium', pairAddress: 'Y', baseToken: { address: MINT }, quoteToken: { address: 'Q' }, priceUsd: '0.0004', liquidity: { usd: 0 }, volume: { h24: 10 } }, MINT);
  ok(zero.liqUsd === null && zero.vol24 === 10, 'liquidity $0 → unknown; volume of a priced pair is kept', 'liq ' + zero.liqUsd);
  ok(M.dexPool(Object.assign({}, F.dexscreener[0], { baseToken: { address: F.fakeMint, symbol: 'ANT' } }), MINT) === null, 'a pair of another mint with the same ticker is dropped');
}

console.log('\n2 · GeckoTerminal: 20 pools, taken by mint only');
const gl = F.geckoterminal.data.map(p => M.geckoPool(p, MINT)).filter(Boolean);
{
  const by = a => gl.find(p => p.pool === a);
  ok(F.geckoterminal.data.length === 20 && gl.length === 19 && !by(P.fake), '19 of 20 are this mint\'s; the other "ANT / SOL" (another mint) is left out', gl.length + ' kept');
  const ps = by(P.ps);
  ok(ps && ps.side === 'base' && ps.priceUsd === F.ownerCheck.price && ps.liqUsd === F.ownerCheck.liquidity && ps.fdv === F.ownerCheck.fdv && ps.mcap === null,
    'ANT / ANTHRP: price, liquidity, FDV as GeckoTerminal gives them; market cap stays null', ps && [ps.priceUsd, ps.liqUsd, ps.fdv, ps.mcap].join(' · '));
  const q = by(P.quote);
  ok(q && q.side === 'quote' && q.priceUsd === 0.0004041 && q.fdv === null && q.mcap === null && q.symbol === 'ANT' && q.quote === F.quoteMint,
    'ANTHRP / ANT (ANT is the quote): the quote side\'s price, not the base\'s $0.0523; no FDV or market cap of ANTHRP', q && q.priceUsd + ' · fdv ' + q.fdv);
  ok(by(P.dust).symbol === 'ANT' && by(P.dust).quoteSymbol === 'SOL', 'pool names split by side, fee suffix dropped ("ANT / SOL 0.25%")');
  ok(M.isCurvePool(by(P.curve)) && by(P.curve).liqUsd === null, 'the pump.fun curve pool is recognised; its $0 reserve is unknown, not a liquidity');
}

console.log('\n3 · one row per pool');
const pools = M.mergePools(dl, gl);
{
  const ps = pools.find(p => p.pool === P.ps);
  ok(pools.length === 19 && pools.filter(p => p.pool === P.ps).length === 1, 'the DexScreener pair and the GeckoTerminal pool with the same address are one row', pools.length + ' rows');
  ok(ps.src === 'dexscreener+geckoterminal' && ps.priceUsd === F.ownerCheck.price && ps.liqUsd === F.ownerCheck.liquidity && ps.vol24 === 84211.55 && ps.quoteSymbol === 'ANTHROPIC' && ps.priceNative === 0.00773069,
    'GeckoTerminal fills price, liquidity and volume; DexScreener\'s own fields stay', ps.src);
  ok(pools[0].pool === P.ps, 'deepest first', pools.slice(0, 3).map(p => p.dex + ' $' + Math.round(p.liqUsd || 0)).join(', '));
  /* a pool known to both with opposite sides is never mixed */
  const mixed = M.mergePools([Object.assign({}, dl[0])], [Object.assign({}, gl.find(p => p.pool === P.quote), { pool: P.ps })]);
  ok(mixed.length === 1 && mixed[0].priceUsd === null, 'two sides of one address are never mixed');
}

console.log('\n4 · the pool the price is read from');
{
  const own = [p => p.pool === P.ps, p => p.side === 'base' && /pumpswap/.test(p.dex)];
  const pick = M.pickPool(pools, { prefer: own, minLiq: 1000 });
  ok(pick && pick.pool === P.ps && pick.priceUsd === F.ownerCheck.price, 'PumpSwap ANT / ANTHRP: deep and traded', pick && pick.dex + ' $' + pick.priceUsd);
  const any = M.pickPool(pools, { minLiq: 1000 });
  ok(any.pool === P.ps, 'without a preference: still the deepest live pool');
  /* the stage's own pool when it is dust: not used */
  const dustOwn = M.pickPool(pools, { prefer: [p => p.pool === P.dust], minLiq: 1000 });
  ok(dustOwn.pool !== P.dust && dustOwn.priceUsd < 0.0005, 'a preferred pool with $310 of liquidity never sets the price ($0.0011 there)', dustOwn.dex);
  /* deep but not traded in 24 h (stale $0.00061): skipped while a traded deep pool exists */
  const noPs = pools.filter(p => p.pool !== P.ps);
  const p2 = M.pickPool(noPs, { minLiq: 1000 });
  ok(p2.pool === P.ray, 'without PumpSwap: Raydium ANT / SOL ($8.4K, traded), not the deeper but idle Orca pool', p2.dex + ' $' + p2.priceUsd);
  /* only dust left: the deepest of it (the price is real, the pool is thin) */
  const dustOnly = pools.filter(p => (p.liqUsd || 0) < 1000);
  const p3 = M.pickPool(dustOnly, { minLiq: 1000 });
  ok(p3 && p3.liqUsd === Math.max(...dustOnly.map(p => p.liqUsd || 0)), 'only thin pools: the deepest of them', p3 && '$' + p3.liqUsd);
  ok(M.pickPool([dl[0]], { prefer: own }).pool === P.ps && M.pickPool([], {}) === null, 'nothing priced: the stage\'s own pool (for its price in the quote), or none');
}

console.log('\n5 · volume, liquidity, age');
{
  const pick = M.pickPool(pools, { prefer: [p => p.pool === P.ps], minLiq: 1000 });
  const a = M.aggregate(pools, pick, { minLiq: 1000 });
  const want = 84211.55 + 21000.4 + 6100.0 + 0;   /* PumpSwap + Raydium + the quote-side pool + the idle Orca pool; no dust */
  ok(near(a.vol24, want, 1e-12) && a.volPools === 4, '24 h volume of the pools with $1,000+ of liquidity (dust with made-up volume left out)', '$' + a.vol24.toFixed(2) + ' from ' + a.volPools + ' pools');
  ok(a.liqPools === 18 && a.liqTotal > F.ownerCheck.liquidity, 'liquidity of every pool of this mint', '$' + Math.round(a.liqTotal) + ' in ' + a.liqPools + ' pools');
  ok(a.firstAt === Date.parse('2026-10-21T08:12:40Z') && a.firstIsLaunch, 'age: the oldest pool is the pump.fun curve, so it is the launch time');
  const noCurve = M.aggregate(pools.filter(p => p.pool !== P.curve), pick, { minLiq: 1000 });
  ok(noCurve.firstAt === Date.parse('2026-10-21T14:05:11Z') && !noCurve.firstIsLaunch, 'without the curve pool: "at least since its first pool", not called the launch');
  const none = M.aggregate([dl[0]], dl[0], { minLiq: 1000 });
  ok(none.vol24 === null && none.liqTotal === null, 'nothing known: volume and liquidity are null (N/A), not $0');
}

console.log('\n6 · market cap and FDV');
{
  const supply = F.ownerCheck.fdv / F.ownerCheck.price;      /* the mint account's supply (burned tokens already out) */
  const fixed = M.caps(F.ownerCheck.price, supply, true, null);
  ok(near(fixed.fdv, F.ownerCheck.fdv, 1e-9) && fixed.mcap === fixed.fdv && fixed.basis === 'fixed_supply', 'mint revoked (every pump.fun coin): market cap = FDV = price × supply, and it says why',
    '$' + fixed.mcap.toFixed(2) + ' · ' + fixed.basis);
  const live = M.caps(F.ownerCheck.price, supply, false, null);
  ok(live.mcap === null && near(live.fdv, F.ownerCheck.fdv, 1e-9) && live.basis === null, 'mint authority live, no reported cap: market cap N/A, FDV still shown — FDV is not passed off as market cap');
  const rep = M.caps(F.ownerCheck.price, supply, false, 250000);
  ok(rep.mcap === 250000 && rep.basis === 'reported', 'mint authority live, a source reports a cap: that cap');
  const no = M.caps(null, supply, true, null);
  ok(no.mcap === null && no.fdv === null, 'no price: neither (N/A)');
}

console.log('\n7 · a pool without a USD price on either source');
{
  const qp = 0.0523;     /* ANTHRP in USD, from its own pools */
  const r = M.fromQuote(dl[0], qp);
  ok(near(r.price, 0.00773069 * qp, 1e-12) && r.liq === null, 'price = price in the quote × the quote\'s price; liquidity unknown without both amounts', '$' + r.price.toPrecision(6));
  const r2 = M.fromQuote(Object.assign({}, dl[0], { liqBase: 75000000, liqQuote: 590000 }), qp);
  ok(near(r2.liq, 75000000 * r2.price + 590000 * qp, 1e-12), 'with both amounts: liquidity = base × price + quote × quote price', '$' + Math.round(r2.liq));
  ok(M.fromQuote(dl[0], null).price === null, 'no quote price: nothing guessed');
}

console.log('\n' + (fails ? fails + ' FAILED, ' : '') + passes + ' passed');
process.exit(fails ? 1 : 0);
