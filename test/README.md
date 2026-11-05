# test/

`npm test` runs everything here with Node's built-in test runner. No dependencies.

| File | What it checks |
|---|---|
| [`examples.test.js`](examples.test.js) | Every file in [`examples/`](../examples) gets the verdict it carries, the same as the server gave |
| [`score.test.js`](score.test.js) | Each part of the score at its marks, the bands, every red flag and cap, unread wallets, unknown liquidity, the sell scenario, no-score states |
| [`operators.test.js`](operators.test.js) | Proven links merge wallets, packs count at 60%, no wallet is counted twice |
| [`guard.test.js`](guard.test.js) | Guard's three checks at their thresholds, in the token page's words, and that a check not read is never a pass |
| [`shield.test.js`](shield.test.js) | Shield's serial-creator rule and dev-at-launch check, and that an incomplete answer is never a pass |
| [`chain.test.js`](chain.test.js) | The pump.fun reader on 34 real mints and their bonding-curve accounts, base58, derived addresses, the curve decoder with SOL and non-SOL quotes, Token-2022 metadata, a transaction and who signed a launch |
| [`market.test.js`](market.test.js) | The token page's market figures on the answers two public market-data services gave for a real PumpSwap token ([`fixtures/ant-pumpswap.json`](fixtures/ant-pumpswap.json)): unknown stays N/A, pools taken by mint only, market cap kept apart from FDV |

The bot's tests are in Python: [`bot/tests/`](../bot/tests), `npm run test:bot` or
`python -m unittest discover -s bot/tests`. The 34 mints in [`fixtures/curve-vectors.json`](fixtures/curve-vectors.json)
are the same ones the bot checks, so both readers are held to one answer.
