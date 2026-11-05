# chain/

How the QuantumOrb server reads pump.fun and Solana: program ids, derived addresses, account layouts and a
transaction reader. The server's own `chain/solana.js` and `lib/util.js`, unchanged apart from one
`require()` line.

| | |
|---|---|
| [`solana.js`](solana.js) | Program ids (pump.fun, PumpSwap, Raydium, Meteora, Orca, lockers), which accounts are infrastructure and never a holder, the bonding-curve and PumpSwap pool addresses, decoders for the pump.fun curve (2026 layout, SOL and non-SOL quotes, mayhem mode), PumpSwap, Raydium CPMM and Metaplex accounts, a parsed-mint reader (Token-2022 fees and metadata), a per-mint transaction reader, and who signed a launch |
| [`util.js`](util.js) | base58, the ed25519 on-curve test, program-derived addresses, little-endian readers, a small TTL cache |

```js
const S = require('./chain/solana');
S.bondingCurve('BDuiaWdW5AdyGu2gnukrhtnQ5F6LH6xLAvhCRyDHpump');   // '5DoVjYwXArLfa1QZxM5DG2ieVwAy63zYorP6dw1uhpMR'
```

The Telegram bot reads the same curve in Python: [`bot/solana_util.py`](../bot/solana_util.py). Both are
tested on the same real addresses ([`test/chain.test.js`](../test/chain.test.js),
[`bot/tests/test_open.py`](../bot/tests/test_open.py)).

What is not here: which accounts and transactions the scanner asks for, in what order and under what
budget, and what it concludes from them (entries, fresh wallets, links). That is the closed part.
