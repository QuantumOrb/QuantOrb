"""
Telegram messages (HTML): the bot's own formatting.py (comments translated to English; the code is unchanged).

Rule: show only what the sources gave (the data layer is closed). No field, no line.
A token is a dict in pump.fun's older shape. What is computed rather than given:
  * price: price_usd (from the curve on the chain or DexScreener); without it, ≈ usd_market_cap / supply
  * curve progress = 1 - real_token_reserves / 793.1M tokens (program == "pump" only, not mayhem)
"""
import html
import math
import time
from datetime import datetime, timezone

QUOTES = {
    "11111111111111111111111111111111": "SOL",
    "So11111111111111111111111111111111111111112": "SOL",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "pumpCmXqMfrsAkQ5r49WcJnRayYRqmXz6ae8H7H9Dfn": "PUMP",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
    "USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB": "USD1",
}
PUMP_INITIAL_REAL_TOKENS = 793_100_000

# Market-cap milestones for /watch (an alert the first time one is crossed upward)
MILESTONES = [10e3, 25e3, 50e3, 100e3, 250e3, 500e3, 1e6, 2.5e6, 5e6, 10e6, 25e6, 50e6, 100e6]


def milestone_floor(mcap: float | None) -> float:
    """The highest milestone the MC has passed (0 if none)."""
    if mcap is None:
        return 0.0
    passed = [m for m in MILESTONES if mcap >= m]
    return passed[-1] if passed else 0.0


# ---------- small helpers ----------

def esc(text) -> str:
    return html.escape(str(text), quote=True)


def short(addr: str | None) -> str:
    if not addr:
        return "?"
    return f"{addr[:4]}…{addr[-4:]}" if len(addr) > 10 else addr


def _num(x) -> float | None:
    """A number from an API field (an int or a string). Otherwise None."""
    if isinstance(x, bool) or x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return v if math.isfinite(v) else None


def fmt_usd(x) -> str | None:
    v = _num(x)
    if v is None:
        return None
    a = abs(v)
    if a >= 1e9:
        return f"${v / 1e9:.2f}B"
    if a >= 1e6:
        return f"${v / 1e6:.2f}M"
    if a >= 1e3:
        return f"${v / 1e3:.1f}K"
    return f"${v:,.2f}"


def fmt_price(x) -> str | None:
    v = _num(x)
    if v is None or v <= 0:
        return None
    if v >= 1:
        return f"${v:,.4f}"
    decimals = min(-math.floor(math.log10(v)) + 3, 18)
    return f"${v:.{decimals}f}"


def fmt_ago(ts_ms) -> str | None:
    v = _num(ts_ms)
    if v is None:
        return None
    sec = max(0, int(time.time() - v / 1000))
    if sec < 60:
        return f"{sec}s ago"
    if sec < 3600:
        return f"{sec // 60}m ago"
    if sec < 86400:
        return f"{sec // 3600}h ago"
    return f"{sec // 86400}d ago"


def fmt_utc(ts_ms) -> str | None:
    v = _num(ts_ms)
    if v is None:
        return None
    return datetime.fromtimestamp(v / 1000, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def iso_to_ms(iso: str | None) -> float | None:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp() * 1000
    except ValueError:
        return None


def _url(u: str | None) -> str | None:
    if not u or not isinstance(u, str) or not u.strip():
        return None
    u = u.strip()
    return u if u.startswith(("http://", "https://")) else "https://" + u


def link(url: str, text: str) -> str:
    return f'<a href="{esc(url)}">{esc(text)}</a>'


# ---------- computed from the fields ----------

def price_usd(coin: dict) -> float | None:
    mc = _num(coin.get("usd_market_cap"))
    supply = _num(coin.get("total_supply"))
    dec = _num(coin.get("base_decimals"))
    if mc is None or not supply or dec is None:
        return None
    return mc / (supply / 10 ** dec)


def bonding_progress(coin: dict) -> float | None:
    if coin.get("program") != "pump" or coin.get("complete") or coin.get("mayhem"):
        return None
    rtr = _num(coin.get("real_token_reserves"))
    dec = _num(coin.get("base_decimals"))
    if rtr is None or dec is None:
        return None
    initial = PUMP_INITIAL_REAL_TOKENS * 10 ** dec
    if rtr > initial:  # a non-standard curve (mayhem mode, say): no guessing
        return None
    return max(0.0, min(100.0, (1 - rtr / initial) * 100))


def has_socials(coin: dict) -> bool:
    return any(_url(coin.get(k)) for k in ("twitter", "telegram", "website"))


def quote_name(coin: dict) -> str | None:
    q = coin.get("quote_mint")
    if not q:
        return None
    return QUOTES.get(q, short(q))


# ---------- message blocks ----------

def _status_line(coin: dict) -> str | None:
    if coin.get("complete") is True:
        return "🎓 Graduated" + (" (PumpSwap)" if coin.get("pump_swap_pool") else "")
    p = bonding_progress(coin)
    if p is not None:
        return f"📈 Bonding curve: ≈{p:.1f}%"
    if coin.get("complete") is False:
        return "📈 On bonding curve"
    return None


def _links_line(coin: dict) -> str:
    mint = coin.get("mint", "")
    return " · ".join([
        link(f"https://pump.fun/coin/{mint}", "pump.fun"),
        link(f"https://solscan.io/token/{mint}", "Solscan"),
        link(f"https://dexscreener.com/solana/{mint}", "DexScreener"),
    ])


def _socials_line(coin: dict) -> str | None:
    parts = []
    for key, title in (("twitter", "X"), ("telegram", "Telegram"), ("website", "Website")):
        u = _url(coin.get(key))
        if u:
            parts.append(link(u, title))
    return "🌐 " + " · ".join(parts) if parts else None


def coin_body(coin: dict, price_override: float | None = None) -> list[str]:
    """The shared part of a token card. Returns lines, no None."""
    lines = []
    name = esc(coin.get("name") or "?")
    symbol = esc(coin.get("symbol") or "?")
    lines.append(f"<b>{name}</b> (${symbol})")
    lines.append(f"<code>{esc(coin.get('mint', ''))}</code>")
    lines.append("")

    mc = fmt_usd(coin.get("usd_market_cap"))
    if price_override is None and _num(coin.get("price_usd")) is not None:
        price_override = _num(coin.get("price_usd"))
    if price_override is not None:
        price = fmt_price(price_override)
        price_txt = f"price {price}" if price else None
    else:
        price = fmt_price(price_usd(coin))
        price_txt = f"price ≈{price}" if price else None
    money = " · ".join(x for x in (f"MC {mc}" if mc else None, price_txt) if x)
    if money:
        lines.append(f"💰 {money}")

    ath = fmt_usd(coin.get("ath_market_cap"))
    if ath:
        lines.append(f"🏔 ATH MC: {ath}")

    status = _status_line(coin)
    q = quote_name(coin)
    if status or q:
        lines.append(" · ".join(x for x in (status, f"pair {esc(q)}" if q else None) if x))

    creator = coin.get("creator")
    if creator:
        dev = link(f"https://solscan.io/account/{creator}", short(creator))
        if coin.get("username"):
            dev += f" ({esc(coin['username'])})"
        lines.append(f"👤 Dev: {dev}")

    created = coin.get("created_timestamp")
    ago, utc = fmt_ago(created), fmt_utc(created)
    if ago:
        lines.append(f"🕒 Created {ago} ({utc})")

    soc = _socials_line(coin)
    if soc:
        lines.append(soc)
    lines.append(_links_line(coin))
    return lines


# ---------- Shield (guard in the code: the creator check) ----------

GUARD_NOTE = ("<i>Automated check of the creator's pump.fun launches on-chain. "
              "It can be wrong, and a pass doesn't make a token safe.</i>")


def guard_line(rec: dict | None) -> str:
    if rec is None:
        return "🛡 Shield: creator check unavailable right now"
    n, g = rec["launches"], rec["graduated"]
    if n == 0:
        return "🛡 Shield: no pump.fun launches found for this creator"
    launches = f"{n:,} launch{'es' if n != 1 else ''}"
    grads = f"{g}+" if rec.get("capped") else str(g)
    if rec["serial"]:
        return f"🛡 Shield: ⚠️ <b>serial creator</b> · {launches}, {grads} graduated"
    return f"🛡 Shield: creator passed · {launches}, {grads} graduated"


_NO_GUARD = object()


def new_token_msg(coin: dict, guard=_NO_GUARD) -> str:
    """guard: the Shield record; None means the check is unavailable (an "unavailable" line); not passed: no Shield line."""
    lines = ["🆕 <b>Early token · passed your filters</b>", ""] + coin_body(coin)
    if guard is not _NO_GUARD:
        at = next((i + 1 for i, line in enumerate(lines) if line.startswith("💰")), 5)
        lines.insert(at, guard_line(guard))  # right under the market-cap line
    return "\n".join(lines)


def dev_launch_msg(coin: dict, label: str | None) -> str:
    who = esc(label) if label else short(coin.get("creator"))
    return "\n".join([f"🚨 <b>Dev {who} just launched a token</b>", ""] + coin_body(coin))


def watch_alert_msg(coin: dict, headlines: list[str]) -> str:
    """A /watch alert: one or more reasons on top, the token card below."""
    return "\n".join(headlines + [""] + coin_body(coin))


def move_line(old: float, new: float) -> str:
    pct = (new - old) / old * 100
    arrow = "🚀" if pct > 0 else "🔻"
    return f"{arrow} <b>MC {pct:+.0f}%</b>: {fmt_usd(old)} → {fmt_usd(new)}"


def _activity_lines(activity: dict | None) -> list[str]:
    if not isinstance(activity, dict):
        return []
    rows = []
    for window in ("5m", "1h", "6h", "24h"):
        w = activity.get(window)
        if not isinstance(w, dict):
            continue
        parts = []
        vol = fmt_usd(w.get("volumeUSD"))
        if vol:
            parts.append(f"vol {vol}")
        txs = _num(w.get("numTxs"))
        if txs is not None:
            b, s = _num(w.get("numBuys")), _num(w.get("numSells"))
            bs = f" ({int(b)}🟢/{int(s)}🔴)" if b is not None and s is not None else ""
            parts.append(f"{int(txs)} tx{bs}")
        ch = _num(w.get("priceChangePercent"))
        if ch is not None:
            parts.append(f"{ch:+.1f}%")
        if parts:
            rows.append(f"  {window}: " + " · ".join(parts))
    if not rows:
        return ["📊 No trades in the last 24h"]
    return ["📊 <b>Activity</b>"] + rows


def _trades_lines(trades: list[dict], limit: int = 5) -> list[str]:
    rows = []
    for t in trades[:limit]:
        side = t.get("type")
        icon = "🟢" if side == "buy" else "🔴" if side == "sell" else "⚪️"
        parts = [f"{icon} {esc(str(side or '?').upper())}"]
        usd = fmt_usd(t.get("amountUsd"))
        if usd:
            parts.append(usd)
        sol = _num(t.get("amountSol"))
        if sol is not None:
            parts.append(f"{sol:.3f} SOL")
        if t.get("userAddress"):
            parts.append(link(f"https://solscan.io/account/{t['userAddress']}", short(t["userAddress"])))
        ago = fmt_ago(iso_to_ms(t.get("timestamp")))
        if ago:
            parts.append(ago)
        rows.append("  " + " · ".join(parts))
    return ["🧾 <b>Latest trades</b>"] + rows if rows else []


def token_card(coin: dict, activity: dict | None, trades: list[dict], guard=_NO_GUARD) -> str:
    last_price = _num(trades[0].get("priceUsd")) if trades else None
    lines = ["🔎 <b>Token</b>", ""] + coin_body(coin, price_override=last_price)
    desc = (coin.get("description") or "").strip()
    if desc:
        lines.insert(4, f"<i>{esc(desc[:200])}{'…' if len(desc) > 200 else ''}</i>")
    extra = _activity_lines(activity) + [""] + _trades_lines(trades)
    if guard is not _NO_GUARD:
        extra = [guard_line(guard), GUARD_NOTE, ""] + extra
    lines += [""] + [x for x in extra]
    return "\n".join(lines).strip()[:4000]


def new_list_msg(coins: list[dict]) -> str:
    rows = ["🆕 <b>Latest pump.fun launches</b>", ""]
    for i, c in enumerate(coins, 1):
        parts = [f"{i}. <b>{esc(c.get('name') or '?')}</b> (${esc(c.get('symbol') or '?')})"]
        mc = fmt_usd(c.get("usd_market_cap"))
        if mc:
            parts.append(f"MC {mc}")
        ago = fmt_ago(c.get("created_timestamp"))
        if ago:
            parts.append(ago)
        if has_socials(c):
            parts.append("🌐")
        rows.append(" · ".join(parts))
        rows.append(f"   <code>{esc(c.get('mint', ''))}</code>")
    rows.append("")
    rows.append("Full card: /token or just paste a contract address")
    return "\n".join(rows)


def dev_info_msg(wallet: str, label: str | None, rec: dict | None) -> str:
    head = f"👤 Watching dev <b>{esc(label) if label else short(wallet)}</b>"
    lines = [head, "You'll get an alert as soon as this wallet launches a token on pump.fun."]
    if rec is not None:
        lines.append("\n" + guard_line(rec))
        coins = rec.get("top") or []
        if coins:
            lines.append("Top launches by market cap:")
            for c in coins[:5]:
                mc = fmt_usd(c.get("usd_market_cap"))
                grad = " 🎓" if c.get("complete") else ""
                lines.append(
                    f"  • {esc(c.get('name') or '?')} (${esc(c.get('symbol') or '?')})"
                    f"{' · MC ' + mc if mc else ''}{grad}"
                )
    return "\n".join(lines)


def _token_row(t: dict) -> str:
    sym = esc(t.get("token_symbol") or "?")
    name = esc(t.get("token_name") or "")
    val = fmt_usd(t.get("value"))
    mint = esc(t.get("token_mint") or "")
    return f"  • ${sym}{' (' + name + ')' if name else ''}{' ≈ ' + val if val else ''}\n    <code>{mint}</code>"


def wallet_change_msg(wallet: str, label: str | None, added: list[dict], removed: list[dict]) -> str:
    who = esc(label) if label else short(wallet)
    lines = [f"👛 <b>Wallet {who}</b> ({link(f'https://solscan.io/account/{wallet}', short(wallet))})"]
    if added:
        lines.append("\n🟢 <b>New positions</b>")
        lines += [_token_row(t) for t in added[:10]]
    if removed:
        lines.append("\n🔴 <b>Fully exited</b>")
        lines += [_token_row(t) for t in removed[:10]]
    return "\n".join(lines)[:4000]
