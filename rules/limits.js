'use strict';
/* Every threshold the open rules use. These are the values the QuantumOrb server runs with, and the same
   numbers the site lists on its "How it works" page. */
module.exports = {
  scan: {
    minHolders: 10,            /* fewer holders outside the curve and pools: TOO EARLY, no score */
    deepMinShare: 0.002,       /* holders under 0.2% of float are not read deeply; unread ones under it never cap a verdict */
    lowLiquidityUsd: 1000,     /* under this the verdict is capped at RISKY */
    establishedDays: 30,       /* TOO ESTABLISHED: older than this … */
    establishedLiq: 500000,    /* … with more liquidity than this … */
    establishedMcap: 10000000  /* … and a market cap (or FDV, when no market cap is known) above this */
  },
  guard: {
    historyMinLaunched: 10,    /* creator history: HELD if the creator launched 10 or more tokens … */
    historyMaxAliveRate: 0.2,  /* … and fewer than 1 in 5 are still alive (only when the history is not from the chain) */
    slot0Max: 0.30,            /* HELD if 30% or more of supply was bought in the launch slot */
    devMax: 0.15               /* HELD if the dev wallet still holds 15% or more of supply */
  },
  curve: {
    totalSupply: 1e9           /* every pump.fun token */
  },
  shield: {
    minLaunches: 10,           /* a serial creator launched 10 or more tokens … */
    maxGradPct: 10,            /* … and under 10% of them graduated (read from the chain; Guard's creator history uses it too) */
    devMax: 0.15               /* HELD if the dev bought 15% or more of supply at launch */
  }
};
