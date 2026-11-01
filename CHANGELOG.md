# Changelog

## 1 November 2026 · the repository follows the new site and bot

- [`rules/`](rules): Guard's creator history now uses the chain record and the Shield rule (10+ launches,
  under 10% graduated); Shield's rule is open in [`rules/shield.js`](rules/shield.js); wallets are read in
  full down to 0.2% of float; with no market cap known, the FDV decides TOO ESTABLISHED.
- Examples re-made by the new server, three of them new: an all-fresh red flag, a clean token held by
  long-history traders, and a serial creator's new launch. They now also carry Guard's creator history in
  the words of the token page.
- New screens of the site and the bot, a new banner with the new logo, and the docs rewritten for
  Shield, Guard and the free data the Radar runs on.

## 22–27 October 2026 · the site

- **Free data for everything live.** The Radar, the 1,000-launch grid and the home page run on a public
  launch stream, the chain itself and public market data. No pump.fun API, no paid calls; paid chain reads
  are only for scans and token pages.
- **Shield on every launch.** The Telegram bot's rule on the Radar, the grid and the home page: a serial
  creator (10+ launches, under 10% graduated, read from the chain) or a dev who bought 15%+ at launch is
  held. **Guard** stays on token pages and in scans, and its creator history is read from the chain too.
  A check that could not be read shows *not read* and **GUARD · PARTIAL**, never a pass.
- **Five checks.** Buy and sell pressure is gone from the site: the tab, the rail, the card, the alerts.
- **Radar.** Filters run over all of the last 1,000 launches, with *Show more*. Defaults: any market cap,
  any curve, held launches shown. A click on a row copies the contract; *Scan →* opens the scan.
- **Token page.** Market figures from pools checked to belong to this token; N/A instead of $0 when no
  source knows a figure; market cap and FDV kept apart; the header refreshes every minute. The holder count
  is read from the chain. The dev wallet is the one that signed the launch, and the page names the new fee
  recipient after a community takeover.
- **Scan.** Wallets read in full down to 0.2% of float; long histories read from their first transaction;
  the History column goes up to 100+ tokens; all of the first 20 buyers, even behind a bundle trading
  with itself. A budget of 250 reads and 40 seconds per scan.
- **Limits.** Five new scans a day per person. Reloading during a scan rejoins it; reloading after one
  opens the same report. Neither counts.
- A new logo and browser icon, and a disclaimer at the top of *How it works*.

## 24–25 October 2026 · the bot

- New launches arrive the moment they happen (a WebSocket stream instead of polling).
- Curves, creators, names and tickers come straight from the chain; Shield reads every pump.fun launch of
  the creator on the chain.
- The token card shows buys and sells and price change from 5 minutes to 24 hours. ATH and the list of
  latest trades are gone: no free source has them.
- Wallets you follow are read from the chain; new positions in tokens with no market (usually spam
  airdrops) are not alerted.

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
