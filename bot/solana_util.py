"""
The Telegram bot's own solana_util.py (comments translated to English; the code is unchanged).

Small Solana helpers with no outside libraries: base58, program-derived addresses and pump.fun's bonding-curve account.

The BondingCurve account layout, from pump.fun's official IDL
(github.com/pump-fun/pump-public-docs, idl/pump.json):

    8   discriminator [23, 183, 248, 55, 96, 216, 172, 96]
    u64 virtual_token_reserves     @8
    u64 virtual_quote_reserves     @16   (lamports for SOL curves)
    u64 real_token_reserves        @24
    u64 real_quote_reserves        @32
    u64 token_total_supply         @40
    bool complete                  @48
    pubkey creator                 @49
    bool is_mayhem_mode            @81
    bool is_cashback_coin          @82
    pubkey quote_mint              @83   (Pubkey::default() = a SOL curve)
    ... then fee fields the bot does not need.

Older accounts are shorter than the current layout: missing trailing fields read as their defaults.
The curve address is the pump program's PDA with seeds ["bonding-curve", mint].
"""
import hashlib
import struct

PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
METAPLEX_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
DEFAULT_PUBKEY = "11111111111111111111111111111111"  # Pubkey::default(): how pump.fun marks SOL
WSOL_MINT = "So11111111111111111111111111111111111111112"
SOL_QUOTES = {DEFAULT_PUBKEY, WSOL_MINT}

BONDING_CURVE_DISCRIMINATOR = bytes([23, 183, 248, 55, 96, 216, 172, 96])
CREATOR_OFFSET = 49   # the curve's creator field: RPC finds every launch of a creator by it
COMPLETE_OFFSET = 48
TOKEN_DECIMALS = 6               # every pump.fun token
SOL_DECIMALS = 9
INITIAL_REAL_TOKEN_RESERVES = 793_100_000 * 10 ** TOKEN_DECIMALS  # Global.initial_real_token_reserves

_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_INDEX = {c: i for i, c in enumerate(_B58)}


def b58encode(data: bytes) -> str:
    n = int.from_bytes(data, "big")
    out = []
    while n:
        n, r = divmod(n, 58)
        out.append(_B58[r])
    pad = len(data) - len(data.lstrip(b"\0"))
    return "1" * pad + "".join(reversed(out))


def b58decode(text: str) -> bytes:
    n = 0
    for c in text:
        if c not in _B58_INDEX:
            raise ValueError(f"not base58: {c!r}")
        n = n * 58 + _B58_INDEX[c]
    body = n.to_bytes((n.bit_length() + 7) // 8, "big") if n else b""
    pad = len(text) - len(text.lstrip("1"))
    return b"\0" * pad + body


def pubkey_bytes(address: str) -> bytes:
    raw = b58decode(address)
    if len(raw) != 32:
        raise ValueError(f"not a 32-byte address: {address}")
    return raw


# ---------- PDA: the point must not lie on the ed25519 curve ----------

_P = 2 ** 255 - 19
_D = (-121665 * pow(121666, _P - 2, _P)) % _P


def is_on_curve(point: bytes) -> bool:
    """The same test as CompressedEdwardsY::decompress in curve25519-dalek (which Solana uses)."""
    y = (int.from_bytes(point, "little") & ((1 << 255) - 1)) % _P
    y2 = y * y % _P
    u = (y2 - 1) % _P
    v = (_D * y2 + 1) % _P
    if v == 0:
        return u == 0
    x2 = u * pow(v, _P - 2, _P) % _P
    return x2 == 0 or pow(x2, (_P - 1) // 2, _P) == 1


def find_program_address(seeds: list[bytes], program_id: str) -> tuple[str, int]:
    program = pubkey_bytes(program_id)
    for bump in range(255, -1, -1):
        digest = hashlib.sha256(b"".join(seeds) + bytes([bump]) + program + b"ProgramDerivedAddress").digest()
        if not is_on_curve(digest):
            return b58encode(digest), bump
    raise ValueError("no viable bump")


def bonding_curve_address(mint: str) -> str:
    return find_program_address([b"bonding-curve", pubkey_bytes(mint)], PUMP_PROGRAM)[0]


def metaplex_metadata_address(mint: str) -> str:
    """The Metaplex metadata account (tokens on the older token program)."""
    meta = pubkey_bytes(METAPLEX_PROGRAM)
    return find_program_address([b"metadata", meta, pubkey_bytes(mint)], METAPLEX_PROGRAM)[0]


def parse_metaplex_metadata(data: bytes) -> dict | None:
    """name / symbol / uri from a Metaplex account: key u8, update_authority, mint, then three borsh strings."""
    out = {}
    off = 1 + 32 + 32
    try:
        for key in ("name", "symbol", "uri"):
            n = struct.unpack_from("<I", data, off)[0]
            if n > 1000:
                return None
            out[key] = data[off + 4: off + 4 + n].decode("utf-8", "ignore").replace("\0", "").strip()
            off += 4 + n
    except struct.error:
        return None
    return out if out.get("uri") or out.get("name") else None


def token2022_metadata(parsed_mint: dict) -> dict | None:
    """name / symbol / uri from the tokenMetadata extension (an RPC answer in jsonParsed). New pump.fun tokens keep them there."""
    try:
        exts = parsed_mint["parsed"]["info"].get("extensions") or []
    except (KeyError, TypeError, AttributeError):
        return None
    for e in exts:
        if isinstance(e, dict) and e.get("extension") == "tokenMetadata":
            st = e.get("state") or {}
            out = {k: str(st[k]).strip() for k in ("name", "symbol", "uri") if isinstance(st.get(k), str) and st[k].strip()}
            return out or None
    return None


# ---------- the curve account ----------

def parse_bonding_curve(data: bytes) -> dict | None:
    """The BondingCurve fields, or None if this is not a curve account."""
    if len(data) < 49 or data[:8] != BONDING_CURVE_DISCRIMINATOR:
        return None
    vtoken, vquote, rtoken, rquote, supply = struct.unpack_from("<5Q", data, 8)
    creator = b58encode(data[49:81]) if len(data) >= 81 else None
    if creator == DEFAULT_PUBKEY:
        creator = None
    quote = b58encode(data[83:115]) if len(data) >= 115 else DEFAULT_PUBKEY
    return {
        "virtual_token_reserves": vtoken,
        "virtual_quote_reserves": vquote,
        "real_token_reserves": rtoken,
        "real_quote_reserves": rquote,
        "token_total_supply": supply,
        "complete": data[48] == 1,
        "creator": creator,
        "is_mayhem_mode": len(data) >= 82 and data[81] == 1,
        "quote_mint": quote,
    }


def curve_price_in_quote(curve: dict, quote_decimals: int = SOL_DECIMALS) -> float | None:
    """The token's price in quote units (SOL for a SOL curve), from the virtual reserves."""
    vt, vq = curve.get("virtual_token_reserves"), curve.get("virtual_quote_reserves")
    if not vt or not vq:
        return None
    return (vq / 10 ** quote_decimals) / (vt / 10 ** TOKEN_DECIMALS)


def curve_progress(curve: dict) -> float | None:
    """Curve progress, %: how much of the 793.1M tokens is sold. Not computed for mayhem curves."""
    if curve.get("complete"):
        return 100.0
    if curve.get("is_mayhem_mode"):
        return None
    rt = curve.get("real_token_reserves")
    if rt is None or rt > INITIAL_REAL_TOKEN_RESERVES:
        return None
    return max(0.0, min(100.0, (1 - rt / INITIAL_REAL_TOKEN_RESERVES) * 100))
