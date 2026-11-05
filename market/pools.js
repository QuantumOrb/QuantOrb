'use strict';
/* Market figures of a token page, without the network: which pools belong to the token, which one sets the price,
   24 h volume and liquidity, the market cap kept apart from the FDV, and N/A (null) where no source knows a number.
   These are the server's own functions from sources/markets.js (and three helpers from sources/free.js), unchanged.
   Fetching the pairs and pools (with its rate limits and caches) is the closed part. */
const cfg = { market: { minLiqUsd: 1000 } };                /* MARKET_MIN_LIQ_USD: a pool under this never sets the price */

/* ---------- from sources/free.js ---------- */
const num = v => v == null || v === '' || typeof v === 'boolean' ? null : isFinite(+v) ? +v : null;
function socialsOf(p) {
  const s = { x: false, tg: false, web: false }, info = p && p.info; if (!info) return s;
  (info.socials || []).forEach(x => { const t = String(x.type || x.platform || '').toLowerCase(), u = x.url || x.handle || ''; if (t === 'twitter' || t === 'x' || /x\.com|twitter\.com/.test(u)) s.x = true; if (t === 'telegram' || /t\.me\//.test(u)) s.tg = true; });
  if ((info.websites || []).some(w => w && w.url)) s.web = true;
  return s;
}
/* the 5-minute window of a pair: trades, buys, sells, volume (no wallet counts: DexScreener does not give them) */
function m5Of(p) {
  if (!p) return null; const t = (p.txns && p.txns.m5) || {}, b = num(t.buys), s = num(t.sells);
  if (b == null && s == null) return null;
  return { txs: (b || 0) + (s || 0), buys: b || 0, sells: s || 0, buyers: null, sellers: null, volUsd: num(p.volume && p.volume.m5) || 0, change: num(p.priceChange && p.priceChange.m5) };
}
const free = { num, socialsOf, m5Of };

/* ---------- from sources/markets.js ---------- */
/* ======================================================================
   Token pages: every pool of one token, each checked by the token's mint (update 9)
   DexScreener first: its pairs with this mint as the base token. DexScreener leaves price, liquidity, volume and
   market cap empty (null) for a pair whose quote it cannot price — a PumpSwap pair quoted in another pump coin, like
   ANT / ANTHROPIC. Then GeckoTerminal's pools of the token are read too (one request, kept a minute) and fill the gaps
   pool by pool, and its other pools are added.
   GeckoTerminal lists pools where the token is the base OR the quote. A pool counts only when one of its two sides is
   this very mint (never by name or ticker), and the price is that side's price: quote_token_price_usd when the mint is
   the quote. A pool's FDV and market cap describe its base token, so they are kept only when the mint is the base.
   Unknown stays null (the page shows N/A), never 0.
   ====================================================================== */
const gid = s => typeof s === 'string' ? s.replace(/^solana_/, '') : '';
const pos = v => { const n = free.num(v); return n != null && n > 0 ? n : null; };      /* a price, a liquidity: > 0 or unknown */
const nn = v => { const n = free.num(v); return n != null && n >= 0 ? n : null; };      /* a volume, a count: ≥ 0 or unknown */
/* one side of a GeckoTerminal pool name ("ANT / ANTHRP", "ANT / SOL 0.25%") */
function sideName(name, i) { const s = (String(name || '').split(' / ')[i] || '').replace(/\s+\d+(\.\d+)?%$/, '').trim(); return s || null; }
const txCount = t => t && (nn(t.buys) != null || nn(t.sells) != null) ? (nn(t.buys) || 0) + (nn(t.sells) || 0) : null;

/* a DexScreener pair → a pool of this mint (base side only: that is how dexPairs keeps them) */
function dexPool(p, mint) {
  if (!p || !p.baseToken || p.baseToken.address !== mint || !p.pairAddress) return null;
  const liq = p.liquidity || {}, priced = pos(p.priceUsd) != null;
  /* without a USD price, DexScreener's USD fields of the pair (liquidity, volume, caps) are not real numbers either */
  return { pool: p.pairAddress, dex: p.dexId || '', labels: p.labels || [], side: 'base', quote: (p.quoteToken && p.quoteToken.address) || null, quoteSymbol: (p.quoteToken && p.quoteToken.symbol) || null,
    priceUsd: pos(p.priceUsd), priceNative: pos(p.priceNative), liqUsd: priced ? pos(liq.usd) : null, liqBase: nn(liq.base), liqQuote: nn(liq.quote),
    vol24: priced ? nn(p.volume && p.volume.h24) : null, tx24: txCount(p.txns && p.txns.h24),
    mcap: priced ? pos(p.marketCap) : null, fdv: priced ? pos(p.fdv) : null, createdAt: pos(p.pairCreatedAt),
    symbol: p.baseToken.symbol || null, name: p.baseToken.name || null, socials: free.socialsOf(p), m5: free.m5Of(p), src: 'dexscreener' };
}
/* a GeckoTerminal pool → a pool of this mint, or null when neither side is this mint */
function geckoPool(p, mint) {
  const a = (p && p.attributes) || {}, r = (p && p.relationships) || {};
  const base = gid(r.base_token && r.base_token.data && r.base_token.data.id), quote = gid(r.quote_token && r.quote_token.data && r.quote_token.data.id);
  const side = base === mint ? 'base' : quote === mint ? 'quote' : null;
  if (!side || !a.address) return null;
  const b = side === 'base';
  return { pool: a.address, dex: (r.dex && r.dex.data && r.dex.data.id) || '', labels: [], side, quote: b ? quote || null : base || null, quoteSymbol: sideName(a.name, b ? 1 : 0),
    priceUsd: pos(b ? a.base_token_price_usd : a.quote_token_price_usd), priceNative: pos(b ? a.base_token_price_quote_token : a.quote_token_price_base_token),
    liqUsd: pos(a.reserve_in_usd), liqBase: null, liqQuote: null, vol24: nn(a.volume_usd && a.volume_usd.h24), tx24: txCount(a.transactions && a.transactions.h24),
    mcap: b ? pos(a.market_cap_usd) : null, fdv: b ? pos(a.fdv_usd) : null, createdAt: pos(Date.parse(a.pool_created_at)),
    symbol: sideName(a.name, b ? 0 : 1), name: null, socials: null, m5: null, src: 'geckoterminal' };
}
/* the page needs GeckoTerminal when the pool the price would come from has no USD price, no 24 h volume, or (after the
   curve) no liquidity, or is the finished pump.fun curve of a graduated coin. On the curve the liquidity comes from the
   curve account itself. */
function needsGecko(pick, stage) {
  if (!pick || !pick.priceUsd || pick.vol24 == null) return true;
  if (stage === 'curve') return false;
  return !pick.liqUsd || isCurvePool(pick);
}
/* one list, one row per pool address: DexScreener's numbers first, GeckoTerminal's where DexScreener has none */
const FILL = ['priceUsd', 'priceNative', 'liqUsd', 'liqBase', 'liqQuote', 'vol24', 'tx24', 'mcap', 'fdv', 'createdAt', 'quote', 'quoteSymbol', 'symbol', 'name'];
function mergePools(dl, gl) {
  const by = new Map();
  (dl || []).forEach(p => { if (p && !by.has(p.pool)) by.set(p.pool, Object.assign({}, p)); });
  (gl || []).forEach(g => {
    if (!g) return; const d = by.get(g.pool);
    if (!d) { by.set(g.pool, Object.assign({}, g)); return; }
    if (d.side !== g.side) return;                    /* never mix the two sides of one pool */
    let used = false; FILL.forEach(k => { if (d[k] == null && g[k] != null) { d[k] = g[k]; used = true; } });
    if (!d.dex && g.dex) d.dex = g.dex;
    if (used) d.src = 'dexscreener+geckoterminal';
  });
  return [...by.values()].sort((a, b) => (b.liqUsd || 0) - (a.liqUsd || 0));
}
const isCurvePool = p => /^pump[-_.]?fun$/i.test(p.dex || '');     /* DexScreener "pumpfun", GeckoTerminal "pump-fun" */
/* the pool the price is read from: priced; deep enough (at least MARKET_MIN_LIQ_USD and a tenth of the deepest
   pool, so a dust pool never sets the price); traded in the last 24 h when that is known; the stage's own pool
   (opt.prefer: one test, or several in order) if it is among them, else the deepest. Without liquidity anywhere: the
   stage's own priced pool, else the most traded priced one. */
function pickPool(list, opt) {
  opt = opt || {}; list = list || [];
  const minLiq = opt.minLiq != null ? opt.minLiq : cfg.market.minLiqUsd;
  const prefs = [].concat(opt.prefer || []);
  const own = set => { for (const f of prefs) { const hit = set.find(f); if (hit) return hit; } return null; };
  const priced = list.filter(p => p.priceUsd > 0);
  if (!priced.length) return own(list) || list[0] || null;
  const maxLiq = Math.max(0, ...priced.map(p => p.liqUsd || 0));
  const deep = maxLiq > 0 ? priced.filter(p => (p.liqUsd || 0) >= Math.max(minLiq, maxLiq * 0.1)) : [];
  const live = deep.filter(p => p.tx24 == null || p.tx24 > 0 || (p.vol24 || 0) > 0);
  /* nothing reaches MARKET_MIN_LIQ_USD: the pools with any liquidity at all */
  const set = live.length ? live : deep.length ? deep : priced.filter(p => p.liqUsd > 0);
  if (set.length) return own(set) || set.slice().sort((a, b) => (b.liqUsd || 0) - (a.liqUsd || 0))[0];
  return own(priced) || priced.slice().sort((a, b) => (b.vol24 || 0) - (a.vol24 || 0))[0];
}
/* token-wide numbers: 24 h volume of the pools that count (the picked one and every pool with at least
   MARKET_MIN_LIQ_USD: dust pools with made-up volume are left out), liquidity of every pool, the oldest pool */
function aggregate(list, pick, opt) {
  opt = opt || {}; list = list || [];
  const minLiq = opt.minLiq != null ? opt.minLiq : cfg.market.minLiqUsd;
  const counted = list.filter(p => p === pick || (p.liqUsd || 0) >= minLiq).filter(p => p.vol24 != null);
  const liq = list.filter(p => p.liqUsd > 0);
  const first = list.filter(p => p.createdAt).sort((a, b) => a.createdAt - b.createdAt)[0] || null;
  return { vol24: counted.length ? counted.reduce((s, p) => s + p.vol24, 0) : null, volPools: counted.length,
    liqTotal: liq.length ? liq.reduce((s, p) => s + p.liqUsd, 0) : null, liqPools: liq.length,
    firstAt: first ? first.createdAt : null, firstIsLaunch: !!(first && isCurvePool(first)) };
}
/* market cap and FDV, kept apart. FDV = price × total supply (the mint account's supply: burned tokens are already out
   of it). The market cap is the same number only when the supply is fixed (mint authority revoked, as on every pump.fun
   coin): nothing can be minted to dilute it and no allocation is locked away, so every token there is in circulation.
   Otherwise only a market cap a source reports for this mint (DexScreener's marketCap, GeckoTerminal's market_cap_usd;
   a pool's figures count only where the mint is its base), else none: N/A, never the FDV passed off as market cap. */
function caps(price, supply, fixed, reported) {
  const fdv = price > 0 && supply > 0 ? price * supply : null;
  if (fixed && fdv) return { mcap: fdv, fdv, basis: 'fixed_supply' };
  if (reported > 0) return { mcap: reported, fdv, basis: 'reported' };
  return { mcap: null, fdv, basis: null };
}
/* a pool with no USD price on either source: its price in the quote × the quote's own USD price (qp); its liquidity
   from both sides' amounts when DexScreener gives them. Nothing without a quote price. */
function fromQuote(p, qp) {
  if (!p || !(p.priceNative > 0) || !(qp > 0)) return { price: null, liq: null };
  const price = p.priceNative * qp;
  return { price, liq: p.liqBase != null && p.liqQuote != null && (p.liqBase > 0 || p.liqQuote > 0) ? p.liqBase * price + p.liqQuote * qp : null };
}
module.exports = { dexPool, geckoPool, mergePools, pickPool, aggregate, needsGecko, isCurvePool, caps, fromQuote, num, socialsOf, m5Of };
