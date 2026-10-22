# Changelog

## 22 October 2026 · the repository starts over

- This repository is now the public page of the new QuantumOrb: the holder scanner, the Radar, Guard and
  the Telegram bot (coming soon).
- **The rules are open.** [`rules/`](rules) holds the code that turns a scan into a verdict: the score,
  operators, red flags, caps, the sell scenario and Guard's three checks, with tests and example tokens.
  The examples carry the results the server itself produced, and `npm test` checks the open code against
  them.
- [`docs/`](docs): how it fits together, the score rule by rule, and Guard.

## 21 October 2026 · the site on live data

- A wallet that could not be read in time is marked **unread** and never counted as evidence. With three
  or more unread, the scan says **PARTIAL** and the verdict is capped at RISKY.
- First buyers are read from the chain without gaps: the list stops before the first transaction that
  could not be read, rather than guessing the order after it.
- A creator unknown to pump.fun's API and to our own record shows *new to us*, never a made-up history.
- A token page opened again within 10 minutes loads from the cache.
- Buy and sell pressure is tracked for pump.fun and PumpSwap tokens; other tokens say so.
- The Radar's *Graduated · 1h* counter, the bot alerts feed and the ticker run on live data.
