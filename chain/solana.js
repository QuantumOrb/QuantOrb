'use strict';
/* Solana program ids, addresses derived from them, account layouts and a transaction reader. */
const { findPda, u64, pk, b58decode } = require('./util');

const P = {
  SYSTEM: '11111111111111111111111111111111',
  TOKEN: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN22: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  ATA: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  METAPLEX: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  PUMP: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  PUMP_AMM: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
  RAY_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAY_CPMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  RAY_CLMM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  RAY_LAUNCHLAB: 'LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj',
  MET_DLMM: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  MET_DAMM1: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  MET_DAMM2: 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEEm1VG',
  MET_DBC: 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
  ORCA: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUP6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  STREAMFLOW: 'strmRqUCoQUgGUan5YhzUZa6KqdzwX5L6FpUxfmKg5m',
  JUP_LOCK: 'LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn',
  RAY_LOCK: 'LockrWmn6K5twhz3y9w1dQERbmgSaRkfnTeTKbpofwE',
  MAYHEM: 'MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e'
};
const WSOL = 'So11111111111111111111111111111111111111112';
const BURN = '1nc1nerator11111111111111111111111111111111';
const RAY_V4_AUTH = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
const RAY_CPMM_AUTH = 'GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL';
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', USDT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const DEFAULT_PK = '11111111111111111111111111111111';
/* mayhem-mode coins: the mayhem agent keeps its tokens in an account owned by this PDA */
const MAYHEM_VAULT = findPda(['sol-vault'], 'MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e');

/* programs that only hold tokens for a pool, a curve or a lock: their accounts are never "holders" */
const INFRA_PROGRAMS = {
  [P.PUMP]: 'bonding curve', [P.PUMP_AMM]: 'PumpSwap pool', [P.RAY_V4]: 'Raydium pool', [P.RAY_CPMM]: 'Raydium CPMM vault', [P.RAY_CLMM]: 'Raydium CLMM pool',
  [P.RAY_LAUNCHLAB]: 'LaunchLab curve', [P.MET_DLMM]: 'Meteora pool', [P.MET_DAMM1]: 'Meteora pool', [P.MET_DAMM2]: 'Meteora pool', [P.MET_DBC]: 'Meteora curve',
  [P.ORCA]: 'Orca pool', [P.STREAMFLOW]: 'locker', [P.JUP_LOCK]: 'locker', [P.RAY_LOCK]: 'LP locker'
};
const INFRA_ADDR = { [RAY_V4_AUTH]: 'Raydium pool', [RAY_CPMM_AUTH]: 'Raydium CPMM vault', [BURN]: 'burn address', [MAYHEM_VAULT]: 'mayhem agent' };
const LOCKERS = { [P.STREAMFLOW]: 'Streamflow', [P.JUP_LOCK]: 'Jupiter Lock', [P.RAY_LOCK]: 'Raydium LP lock' };
/* programs whose presence in a transaction means "a swap happened" */
const SWAP_PROGRAMS = new Set([P.PUMP, P.PUMP_AMM, P.RAY_V4, P.RAY_CPMM, P.RAY_CLMM, P.RAY_LAUNCHLAB, P.MET_DLMM, P.MET_DAMM1, P.MET_DAMM2, P.MET_DBC, P.ORCA, P.JUP6]);

/* ---------- derived addresses ---------- */
const ata = (owner, mint, tokenProgram) => findPda([owner, tokenProgram || P.TOKEN, mint], P.ATA);
const bondingCurve = mint => findPda(['bonding-curve', mint], P.PUMP);
const metadataPda = mint => findPda(['metadata', b58decode(P.METAPLEX), mint], P.METAPLEX);
/* PumpSwap pool of a migrated pump.fun coin: seeds [pool, 0u16, pool-authority PDA, mint, quote] (quote = wSOL for SOL pairs) */
function pumpSwapPool(mint, quote) {
  const auth = findPda(['pool-authority', mint], P.PUMP);
  const idx = Buffer.alloc(2); idx.writeUInt16LE(0);
  return findPda(['pool', idx, auth, mint, quote || WSOL], P.PUMP_AMM);
}

/* ---------- layouts ---------- */
/* pump.fun bonding curve (IDL 2026): 8 disc, virtual token, virtual quote, real token, real quote, total supply, complete,
   creator, is_mayhem_mode, is_cashback_coin, quote_mint (default key = SOL), … Older accounts are shorter.
   Quote amounts are in the quote's own units: SOL 9 decimals, USDC/USDT and pump coins 6. */
function decodeCurve(b) {
  if (!b || b.length < 49) return null;
  const quoteMint = b.length >= 115 ? pk(b, 83) : null, q = quoteMint && quoteMint !== DEFAULT_PK && quoteMint !== WSOL ? quoteMint : null;
  const qd = q ? 1e6 : 1e9;
  return { vTokens: u64(b, 8) / 1e6, vSol: u64(b, 16) / qd, realTokens: u64(b, 24) / 1e6, realSol: u64(b, 32) / qd, supply: u64(b, 40) / 1e6,
    complete: b[48] === 1, creator: b.length >= 81 ? pk(b, 49) : null, mayhem: b.length >= 82 ? b[81] === 1 : false, quoteMint: q };
}
/* PumpSwap pool: 8 disc, bump u8, index u16, creator, base, quote, lp mint, base vault, quote vault, lp supply, coin creator */
function decodePumpSwap(b) {
  if (!b || b.length < 211) return null;
  return { creator: pk(b, 11), baseMint: pk(b, 43), quoteMint: pk(b, 75), lpMint: pk(b, 107), baseVault: pk(b, 139), quoteVault: pk(b, 171), lpSupply: u64(b, 203) };
}
/* Raydium CPMM pool state: 8 disc, 10 pubkeys, 5 × u8, lp supply */
function decodeCpmm(b) {
  if (!b || b.length < 341) return null;
  return { config: pk(b, 8), creator: pk(b, 40), vault0: pk(b, 72), vault1: pk(b, 104), lpMint: pk(b, 136), mint0: pk(b, 168), mint1: pk(b, 200),
    lpDecimals: b[330], lpSupply: u64(b, 333) };
}
/* Metaplex metadata: key, update authority, mint, name, symbol, uri, fee, creators?, primary sale, mutable */
function decodeMetaplex(b) {
  try {
    let o = 1; const upd = pk(b, o); o += 32; const mint = pk(b, o); o += 32;
    const str = () => { const n = b.readUInt32LE(o); o += 4; const s = b.subarray(o, o + n).toString('utf8').replace(/\0+$/, ''); o += n; return s; };
    const name = str(), symbol = str(), uri = str(); o += 2;
    if (b[o++] === 1) { const n = b.readUInt32LE(o); o += 4 + n * 34; }
    o += 1; const mutable = b[o] === 1;
    return { updateAuthority: upd, mint, name, symbol, uri, mutable };
  } catch (e) { return null; }
}

/* parsed mint account (jsonParsed) → what Control needs */
function parseMint(v) {
  if (!v || !v.data || !v.data.parsed || v.data.parsed.type !== 'mint') return null;
  const i = v.data.parsed.info, ext = i.extensions || [];
  const fee = ext.find(e => e.extension === 'transferFeeConfig'), md = ext.find(e => e.extension === 'tokenMetadata');
  let feeBps = null;
  if (fee && fee.state) { const t = fee.state.newerTransferFee || fee.state.olderTransferFee; feeBps = t ? +t.transferFeeBasisPoints : 0; }
  return { program: v.owner === P.TOKEN22 ? 'Token-2022' : 'SPL Token', programId: v.owner, decimals: i.decimals, supplyRaw: i.supply, supply: +i.supply / Math.pow(10, i.decimals),
    mintAuthority: i.mintAuthority || null, freezeAuthority: i.freezeAuthority || null,
    transferFeeBps: fee ? feeBps : null, transferFeeAuthority: fee && fee.state ? fee.state.transferFeeConfigAuthority || null : null,
    md: md && md.state ? { name: md.state.name, symbol: md.state.symbol, uri: md.state.uri, updateAuthority: md.state.updateAuthority || null } : null };
}

/* ---------- reading one transaction (jsonParsed) for one mint ----------
   Returns the change of the mint's balance per owner, SOL change per account and the programs involved. */
function readTx(t, mint) {
  if (!t || !t.meta || t.meta.err || !t.transaction || !t.transaction.message) return null;
  /* legacy, v0 and v1 share this shape in jsonParsed: v0 adds keys from lookup tables (source "lookupTable"),
     v1 has every key inline and its compute budget in message.transactionConfig, which is not needed here */
  const ak = t.transaction.message.accountKeys || [];
  const keys = ak.map(k => typeof k === 'string' ? k : k.pubkey);
  const signers = ak.filter(k => typeof k !== 'string' && k.signer).map(k => k.pubkey);
  const progs = new Set();
  (t.transaction.message.instructions || []).forEach(ix => ix.programId && progs.add(ix.programId));
  (t.meta.innerInstructions || []).forEach(g => (g.instructions || []).forEach(ix => ix.programId && progs.add(ix.programId)));
  const bal = {}; let dec = 6;
  function add(list, sign) { (list || []).forEach(b => { if (b.mint !== mint || !b.owner) return; dec = b.uiTokenAmount.decimals; bal[b.owner] = (bal[b.owner] || 0) + sign * +b.uiTokenAmount.amount; }); }
  add(t.meta.preTokenBalances, -1); add(t.meta.postTokenBalances, 1);
  const delta = {}; Object.keys(bal).forEach(o => { if (bal[o]) delta[o] = bal[o] / Math.pow(10, dec); });
  /* SOL moved per account: lamports plus wrapped SOL held by the same owner (PumpSwap and routers pay in wSOL) */
  const sol = {}; keys.forEach((k, i) => { const d = (t.meta.postBalances[i] - t.meta.preBalances[i]) / 1e9; if (d) sol[k] = d; });
  const w = {}; (t.meta.preTokenBalances || []).forEach(b => { if (b.mint === WSOL && b.owner) w[b.owner] = (w[b.owner] || 0) - +b.uiTokenAmount.amount; });
  (t.meta.postTokenBalances || []).forEach(b => { if (b.mint === WSOL && b.owner) w[b.owner] = (w[b.owner] || 0) + +b.uiTokenAmount.amount; });
  Object.keys(w).forEach(o => { if (w[o]) sol[o] = (sol[o] || 0) + w[o] / 1e9; });
  const swap = [...progs].some(p => SWAP_PROGRAMS.has(p));
  const logs = t.meta.logMessages || [];
  return { sig: t.transaction.signatures[0], slot: t.slot, time: (t.blockTime || 0) * 1000, version: t.version == null ? 'legacy' : t.version, feePayer: keys[0], signers, delta, sol, progs, swap,
    burn: logs.some(l => /Instruction: Burn/i.test(l)) };
}

/* the signer of the create: a signer (not the mint) among the accounts of pump.fun's instruction that has the mint and
   the curve; the fee payer if it is one of them */
function createSigner(raw, mint, bc) {
  if (!raw || !raw.meta || raw.meta.err || !raw.transaction || !raw.transaction.message) return null;
  const ak = raw.transaction.message.accountKeys || [];
  const keys = ak.map(k => typeof k === 'string' ? k : k.pubkey), signers = ak.filter(k => typeof k !== 'string' && k.signer).map(k => k.pubkey).filter(k => k !== mint);
  const ixs = (raw.transaction.message.instructions || []).concat(...(raw.meta.innerInstructions || []).map(g => g.instructions || []));
  const create = ixs.find(ix => ix.programId === P.PUMP && Array.isArray(ix.accounts) && ix.accounts.includes(mint) && ix.accounts.includes(bc));
  if (!create) return null;
  const inIx = signers.filter(s => create.accounts.includes(s));
  if (!inIx.length) return null;
  return inIx.includes(keys[0]) ? keys[0] : inIx[0];
}
module.exports = { P, WSOL, USDC, USDT, DEFAULT_PK, MAYHEM_VAULT, BURN, RAY_V4_AUTH, RAY_CPMM_AUTH, INFRA_PROGRAMS, INFRA_ADDR, LOCKERS, SWAP_PROGRAMS,
  ata, bondingCurve, metadataPda, pumpSwapPool, decodeCurve, decodePumpSwap, decodeCpmm, decodeMetaplex, parseMint, readTx, createSigner };
