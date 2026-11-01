# Shield and Guard

Two checks on who made a token. **Shield** is light and free, and runs on every new launch: on the Radar,
the 1,000-launch grid, the home page and in the Telegram bot. **Guard** goes deeper and runs on every token
page and in every scan.

Both hold a launch back only on evidence. A check that has not been read yet, or could not be read, shows
as pending and never holds a launch, and it is never shown as a pass either.

## Shield · every launch

Code: [`rules/shield.js`](../rules/shield.js).

| Check | Read | Held when |
|---|---|---|
| **Creator history** | from the chain, once the launch reaches 10% of its curve or 20 buyers (right away for a wallet already seen launching many times) | the dev wallet launched 10 or more tokens and under 10% of them graduated |
| **Dev at launch** | from the launch itself | the dev bought 15% or more of supply in the create transaction |

The creator's record is every pump.fun bonding curve that names the wallet as its creator, each with its
"graduated" flag. Launches from before pump.fun began storing the creator on the curve (early 2025) are
not in it. Zero launches for the creator of a pump.fun token is an incomplete answer, so it reads as
*creator check unavailable*, not as a clean record.

A held launch stays on the Radar in grey, with its reason, when you switch the Shield filter to show all.

```js
const { shield } = require('./rules');
shield({ creator: { launched: 2500, graduated: 4 }, devAtLaunch: 1e6 });
// { pass: false, reason: 'serial creator: 2500 launches, 4 graduated', checks: [ … ] }
```

The Telegram bot uses the same rule, on the same data, before every alert.

## Guard · token pages and scans

Code: [`rules/guard.js`](../rules/guard.js). The **Who made it** card shows the dev wallet (the one that
signed the launch, even if creator fees were later moved to another wallet), its launches, and each check.

| Check | Held when |
|---|---|
| **Creator history** | the dev wallet launched 10 or more tokens and under 10% of them graduated (the Shield rule, read from the chain) |
| **First-slot buyers** | 30% or more of supply was bought in the launch slot |
| **Dev holdings** | the dev wallet still holds 15% or more of supply now |

If the creator's record cannot be read from the chain, the launches the server recorded itself are
used, but only as evidence against a creator: they can show a serial creator, never clear one. Anything
less is *not read*, and the card says **GUARD · PARTIAL** instead of PASS.

```js
const { guard } = require('./rules');
guard({ history: { launched: 68, graduated: 0, chain: true }, slot0Share: 0.02, devShare: 0.009, traded: true });
// { pass: false, reason: 'serial creator: 68 launches, 0 graduated', checks: [ … ] }
```
