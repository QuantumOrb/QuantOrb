# test/

`npm test` runs everything here with Node's built-in test runner. No dependencies.

| File | What it checks |
|---|---|
| [`examples.test.js`](examples.test.js) | Every file in [`examples/`](../examples) gets the verdict it carries, the same as the server gave |
| [`score.test.js`](score.test.js) | Each part of the score at its marks, the bands, every red flag and cap, unread wallets, unknown liquidity, the sell scenario, no-score states |
| [`operators.test.js`](operators.test.js) | Proven links merge wallets, packs count at 60%, no wallet is counted twice |
| [`guard.test.js`](guard.test.js) | Guard's three checks at their thresholds, in the token page's words, and that a check not read is never a pass |
| [`shield.test.js`](shield.test.js) | Shield's serial-creator rule and dev-at-launch check, and that an incomplete answer is never a pass |
