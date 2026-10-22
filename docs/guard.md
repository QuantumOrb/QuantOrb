# Guard

Guard screens every new pump.fun launch before anyone is told about it, on the Radar and in the bot.
The same checks appear on each token page, in the **Who made it** card. Code:
[`rules/guard.js`](../rules/guard.js).

A launch is held back only on evidence. A check that has not been read yet shows as pending and never
holds a launch.

| Check | Read | Held when |
|---|---|---|
| **Creator history** | once the launch reaches 10% of its curve or 20 buyers | the dev wallet launched 10 or more tokens and fewer than 1 in 5 are still alive |
| **First-slot buyers** | as soon as the launch trades | 30% or more of supply was bought in the launch slot |
| **Dev holdings** | as soon as the launch trades | the dev wallet still holds 15% or more of supply |

A token is **alive** if it traded in the last 24 hours or graduated to a pool.

If pump.fun's API does not answer, the creator's history falls back to the launches the server has seen
itself, and says so: *"N launches recorded by us"*, or *"new to us · no earlier launches recorded"*.

A held launch stays on the Radar in grey, with its reason, when you switch the Guard filter to show all.

```js
const { guard } = require('./rules');
guard({ history: { launched: 65, alive: 1 }, slot0Share: 0.56, devShare: 0.171, traded: true });
// { pass: false, reason: 'creator launched 65 tokens, 1 alive', checks: [ … ] }
```

The bot's creator check, **Shield**, follows the same idea with the data pump.fun gives the bot: a
creator with many launches and almost none that graduated is a serial creator, and its launches are
screened out of alerts.
