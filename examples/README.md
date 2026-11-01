# examples/

Scan inputs for [`rules/`](../rules), each with the verdict it must get (`expect`). `npm test` checks
every one of them.

| File | Where it comes from | Verdict |
|---|---|---|
| [`site-example.json`](site-example.json) | The example token on the QuantumOrb home page | DANGER · 12 |
| [`bundle-and-pack.json`](bundle-and-pack.json) | A scan the server made on the simulated chain | DANGER · 18 |
| [`received-not-bought.json`](received-not-bought.json) | A scan the server made on the simulated chain | DANGER · 35 |
| [`all-fresh-wallets.json`](all-fresh-wallets.json) | A scan the server made on the simulated chain | DANGER · 65 (red flag) |
| [`graduated-ok.json`](graduated-ok.json) | A scan the server made on the simulated chain | OK · 76 |
| [`experienced-holders-clean.json`](experienced-holders-clean.json) | A scan the server made on the simulated chain | CLEAN · 87 |
| [`too-early.json`](too-early.json) | A scan the server made on the simulated chain | EARLY · no score |
| [`serial-creator-too-early.json`](serial-creator-too-early.json) | A scan the server made on the simulated chain: a serial creator's new launch | EARLY · Guard HELD |
| [`too-established.json`](too-established.json) | A scan the server made on the simulated chain | ESTABLISHED · no score |
| [`clean.json`](clean.json) | Made up for one rule: a clean distribution | CLEAN · 93 |
| [`one-whale.json`](one-whale.json) | Made up for one rule: one honest whale is a risk, not a rug | RISKY · 58 |
| [`partial.json`](partial.json) | Made up for one rule: three wallets could not be read in time | RISKY · 59 |

The first nine carry the result the closed server produced, and the ones with a `creator` also carry
the words its token page used for Guard's creator history. They show that the open rules give the same
answer as the site. Every token, wallet and figure in them is made up: the simulated chain is a
test double the server is developed against.

## The format

```jsonc
{
  "floatTokens": 1000000000,      // supply outside the curve, pools, lockers and burn addresses
  "reserveTokens": 559657792,     // tokens in the pool a sale would go into
  "liquidityUsd": 16156.8,
  "holders": [                    // the top 20 by share of float, biggest first
    { "share": 0.1267, "kind": "buy", "virgin": true },
    { "share": 0.0711, "kind": "transfer", "virgin": true, "sniper": true }
  ],
  "links": [                      // between holders, by position in the list
    { "a": 0, "b": 1, "kind": "distributor", "level": "proven" },
    { "a": 6, "b": 7, "kind": "pack", "level": "pack" }
  ],
  "creator": { "launched": 68, "graduated": 0, "chain": true },     // Guard, optional
  "slot0Share": 0.02, "devShare": 0.009, "traded": true
}
```

Holder flags: `virgin` (no trading history before this token), `sniper` (bought in the first 30
seconds), `bundle` (bought in the launch slot), `sold`, `dev`, `unread` (could not be read in time).
Only the ratio of `reserveTokens` to `floatTokens` matters.

Try your own: copy a file, change it, and run `node rules/cli.js your-file.json`.
