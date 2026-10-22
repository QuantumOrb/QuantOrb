# test/

`npm test` runs everything here with Node's built-in test runner. No dependencies.

| File | What it checks |
|---|---|
| [`examples.test.js`](examples.test.js) | Every file in [`examples/`](../examples) gets the verdict it carries, the same as the server gave |
| [`score.test.js`](score.test.js) | Each part of the score at its marks, the bands, every red flag and cap, unread wallets, the sell scenario, no-score states |
| [`operators.test.js`](operators.test.js) | Proven links merge wallets, packs count at 60%, no wallet is counted twice |
| [`guard.test.js`](guard.test.js) | Guard's three checks at their thresholds, and that a check not read yet never holds a launch |
