"""
Shield, the bot's creator check: a serial creator launched SERIAL_MIN_LAUNCHES or more tokens on pump.fun and
under SERIAL_MAX_GRAD_PCT % of them graduated from the bonding curve.

evaluate() is the bot's own Guard.evaluate from guard.py, unchanged. Reading a creator's launches from the chain
(one getProgramAccounts on the pump.fun program, filtered by the curve's creator field), the cache and the retries
are the closed part. The site's Radar uses the same rule: rules/shield.js.
"""
from types import SimpleNamespace

# the bot's defaults (SERIAL_MIN_LAUNCHES, SERIAL_MAX_GRAD_PCT in its settings)
config = SimpleNamespace(SERIAL_MIN_LAUNCHES=10, SERIAL_MAX_GRAD_PCT=10.0)


def evaluate(launches: int, graduated: int) -> dict:
    serial = (launches >= config.SERIAL_MIN_LAUNCHES
              and graduated * 100 < config.SERIAL_MAX_GRAD_PCT * launches)
    return {"launches": launches, "graduated": graduated, "serial": serial, "capped": False, "top": []}
