# rules/

The part of the QuantumOrb scanner that turns what it read into a verdict: the score, the operators and
Guard's three checks. These files are the server's own code, not a rewrite. The function bodies are
identical to what runs on [quantumorb.app](https://quantumorb.app); only the `require()` lines point
here instead.

| File | What it does |
|---|---|
| [`score.js`](score.js) | The score from 0 to 100: five parts, red flags, caps, the band and the sell scenario |
| [`operators.js`](operators.js) | Links between holders → operators. Proven links merge wallets; a pack counts at 60% |
| [`guard.js`](guard.js) | Guard's three checks on a launch: creator history, first-slot buyers, dev holdings |
| [`verdict.js`](verdict.js) | One scan from start to finish, in the scanner's order: too established → too early → operators → score |
| [`limits.js`](limits.js) | Every threshold, in one place |
| [`format.js`](format.js) | `pct`, `usd`, `sum` |
| [`cli.js`](cli.js) | Prints the verdict for a JSON input, the way the site reads it |
| [`index.js`](index.js) | Everything above, as one module |

## Run it

Node 18 or newer, no dependencies.

```bash
node rules/cli.js examples/site-example.json
node rules/cli.js examples/graduated-ok.json --json    # the full result
```

```js
const { scanVerdict } = require('./rules');
const r = scanVerdict(require('./examples/site-example.json'));
r.score;   // 12
r.band;    // 'DANGER'
r.gates;   // the red flags and caps, in the words the site uses
```

The input format is described at the top of [`verdict.js`](verdict.js) and shown in
[`examples/`](../examples).

## What is not here

Everything that fills the input: reading the top holders from the chain, how each wallet got in, which
ones are fresh or snipers, finding the links between them, the pool and its reserve, the trade stream,
the creator's history from pump.fun. That is the closed part of the scanner.
