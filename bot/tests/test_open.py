"""
Tests for the bot's open modules. Standard library only:  python -m unittest discover -s bot/tests
"""
import os
import struct
import sys
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

import formatting as fmt  # noqa: E402
import shield  # noqa: E402
import solana_util as su  # noqa: E402
from curve_vectors import CURVE_VECTORS  # noqa: E402

MINT = CURVE_VECTORS[0][0]          # a real pump.fun token from the vectors
CREATOR = "7xKpQ2mZ9vRtW4nHc8LbYe3aJfDs6uGq1oPkTn5V1111"


def curve_account(vtoken, vquote, rtoken, rquote, supply, complete=False, creator=None, mayhem=False):
    data = bytearray(su.BONDING_CURVE_DISCRIMINATOR)
    data += struct.pack("<5Q", vtoken, vquote, rtoken, rquote, supply)
    data += bytes([1 if complete else 0])
    data += su.pubkey_bytes(creator) if creator else bytes(32)
    data += bytes([1 if mayhem else 0, 0])
    data += bytes(32)                                   # quote_mint: Pubkey::default() = SOL
    return bytes(data)


class SolanaUtil(unittest.TestCase):
    def test_bonding_curve_addresses(self):
        """the curve PDA of real tokens, as pump.fun listed them"""
        for mint, curve in CURVE_VECTORS:
            self.assertEqual(su.bonding_curve_address(mint), curve, mint)

    def test_base58_round_trip(self):
        for addr in (MINT, su.PUMP_PROGRAM, su.DEFAULT_PUBKEY, su.WSOL_MINT):
            self.assertEqual(su.b58encode(su.b58decode(addr)), addr)
        with self.assertRaises(ValueError):
            su.b58decode("0OIl")

    def test_parse_bonding_curve(self):
        raw = curve_account(1_000_000_000 * 10**6, 32 * 10**9, 700_000_000 * 10**6, 2 * 10**9, 1_000_000_000 * 10**6, creator=CREATOR)
        c = su.parse_bonding_curve(raw)
        self.assertEqual(c["creator"], CREATOR)
        self.assertFalse(c["complete"])
        self.assertEqual(c["quote_mint"], su.DEFAULT_PUBKEY)
        self.assertAlmostEqual(su.curve_price_in_quote(c), 32 / 1_000_000_000)
        self.assertAlmostEqual(su.curve_progress(c), (1 - 700_000_000 / 793_100_000) * 100)

    def test_not_a_curve(self):
        self.assertIsNone(su.parse_bonding_curve(b"\0" * 120))
        self.assertIsNone(su.parse_bonding_curve(b"short"))

    def test_progress_edges(self):
        self.assertEqual(su.curve_progress({"complete": True}), 100.0)
        self.assertIsNone(su.curve_progress({"is_mayhem_mode": True, "real_token_reserves": 1}))
        self.assertIsNone(su.curve_progress({"real_token_reserves": su.INITIAL_REAL_TOKEN_RESERVES + 1}))

    def test_token2022_metadata(self):
        parsed = {"parsed": {"info": {"extensions": [{"extension": "tokenMetadata", "state": {"name": " Orb ", "symbol": "ORB", "uri": "ipfs://x"}}]}}}
        self.assertEqual(su.token2022_metadata(parsed), {"name": "Orb", "symbol": "ORB", "uri": "ipfs://x"})
        self.assertIsNone(su.token2022_metadata({}))


class Shield(unittest.TestCase):
    def test_serial_creator(self):
        self.assertTrue(shield.evaluate(10, 0)["serial"])
        self.assertFalse(shield.evaluate(10, 1)["serial"])          # exactly 10% graduated passes
        self.assertFalse(shield.evaluate(9, 0)["serial"])           # under 10 launches never holds
        self.assertTrue(shield.evaluate(279, 3)["serial"])

    def test_same_rule_as_the_site(self):
        """rules/shield.js: launched >= 10 and graduated * 100 < 10 * launched"""
        for n in range(0, 40):
            for g in range(0, n + 1):
                self.assertEqual(shield.evaluate(n, g)["serial"], n >= 10 and g * 100 < 10 * n)


class Formatting(unittest.TestCase):
    def coin(self, **kw):
        c = {"name": "Orb <Test>", "symbol": "ORB", "mint": MINT, "usd_market_cap": 41_200, "total_supply": 1_000_000_000 * 10**6,
             "base_decimals": 6, "program": "pump", "complete": False, "real_token_reserves": 520_000_000 * 10**6,
             "creator": CREATOR, "created_timestamp": time.time() * 1000 - 120_000, "twitter": "x.com/orb",
             "quote_mint": su.WSOL_MINT}
        c.update(kw)
        return c

    def test_new_token_alert(self):
        msg = fmt.new_token_msg(self.coin(), {"launches": 3, "graduated": 1, "serial": False})
        self.assertIn("Early token · passed your filters", msg)
        self.assertIn("Orb &lt;Test&gt;", msg)                    # names are escaped
        self.assertIn("MC $41.2K", msg)
        self.assertIn("Shield: creator passed · 3 launches, 1 graduated", msg)
        self.assertIn("Bonding curve: ≈", msg)
        self.assertIn("pair SOL", msg)
        self.assertNotIn("None", msg)

    def test_serial_creator_line(self):
        self.assertIn("serial creator", fmt.guard_line({"launches": 2500, "graduated": 4, "serial": True}))
        self.assertIn("unavailable", fmt.guard_line(None))

    def test_unknown_fields_have_no_line(self):
        msg = fmt.token_card(self.coin(usd_market_cap=None, twitter=None, creator=None), {}, [])
        self.assertNotIn("MC ", msg)
        self.assertNotIn("Dev:", msg)
        self.assertIn("No trades in the last 24h", msg)

    def test_numbers(self):
        self.assertEqual(fmt.fmt_usd(1_234_567), "$1.23M")
        self.assertEqual(fmt.fmt_usd(None), None)
        self.assertEqual(fmt.milestone_floor(60_000), 50e3)
        self.assertEqual(fmt.short(MINT), MINT[:4] + "…" + MINT[-4:])


if __name__ == "__main__":
    unittest.main()
