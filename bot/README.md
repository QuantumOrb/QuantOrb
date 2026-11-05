# bot/

The open parts of the QuantumOrb Telegram bot, [@QuantumORB_bot](https://t.me/QuantumORB_bot). Python 3.11+,
standard library only. The code is the bot's own, unchanged; the comments are translated to English.

| | |
|---|---|
| [`formatting.py`](formatting.py) | Every message the bot sends about a token: the token card, the early-launch alert, the /watch alert, a dev's launch, a wallet's new positions and exits, the Shield line. Only what the sources gave is shown: no field, no line |
| [`shield.py`](shield.py) | Shield's rule: a serial creator launched 10+ tokens and under 10% of them graduated. The same rule as the site's [`rules/shield.js`](../rules/shield.js) |
| [`solana_util.py`](solana_util.py) | base58, program-derived addresses, the pump.fun bonding-curve account (official IDL layout), price and curve progress, Metaplex and Token-2022 metadata |
| [`tests/`](tests) | `python -m unittest discover -s bot/tests` |

```python
import solana_util as su
su.bonding_curve_address("BDuiaWdW5AdyGu2gnukrhtnQ5F6LH6xLAvhCRyDHpump")   # '5DoVjYwXArLfa1QZxM5DG2ieVwAy63zYorP6dw1uhpMR'
```

What is not here: the command handlers and keyboards, the alert loops, the launch stream, the data sources
and their fallbacks, the database. That is the closed part of the bot.
