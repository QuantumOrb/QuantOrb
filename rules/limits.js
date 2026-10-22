'use strict';
/* Every threshold the open rules use. These are the values quantumorb.app runs with, and the same
   numbers the site lists on its "How it works" page. */
module.exports = {
  scan: {
    minHolders: 10,            /* fewer holders outside the curve and pools: TOO EARLY, no score */
    deepMinShare: 0.005,       /* holders under 0.5% of float are not read; unread ones under it never cap a verdict */
    lowLiquidityUsd: 1000,     /* under this the verdict is capped at RISKY */
    establishedDays: 30,       /* TOO ESTABLISHED: older than this … */
    establishedLiq: 500000,    /* … with more liquidity than this … */
    establishedMcap: 10000000  /* … and a market cap above this */
  },
  guard: {
    historyMinLaunched: 10,    /* HELD if the creator launched 10 or more tokens … */
    historyMaxAliveRate: 0.2,  /* … and fewer than 1 in 5 are still alive */
    slot0Max: 0.30,            /* HELD if 30% or more of supply was bought in the launch slot */
    devMax: 0.15               /* HELD if the dev wallet still holds 15% or more of supply */
  }
};
