# market/

The market figures of a token page, without the network: which pools belong to the token, which one sets the
price, the 24 h volume and liquidity, the market cap kept apart from the FDV, and N/A where no source knows a
number. The server's own functions from `sources/markets.js` and three helpers from `sources/free.js`,
unchanged ([`pools.js`](pools.js)).

| Rule | Function |
|---|---|
| A pool counts only when one of its two sides is this very mint, never by name or ticker. When the mint is the quote, the price is the quote side's price, and that pool's FDV and market cap (which describe the other token) are not used | `dexPool`, `geckoPool` |
| One row per pool: the first source's numbers, the second only where the first has none, never mixing the two sides of one pool | `mergePools` |
| The price comes from a priced pool with at least $1,000 of liquidity and a tenth of the deepest pool, traded in the last 24 h, preferring the stage's own pool (the curve before graduation, the canonical PumpSwap pool after). A dust pool never sets the price | `pickPool` |
| 24 h volume of the price pool and every pool with $1,000+, liquidity of all pools, age from the oldest pool (a pump.fun curve is the launch itself) | `aggregate` |
| FDV = price × supply. The market cap equals it only when the supply is fixed (mint authority revoked); otherwise only a reported market cap, else N/A, never the FDV passed off as market cap | `caps` |
| No USD price anywhere: the price in the quote × the quote's own USD price | `fromQuote` |
| Unknown stays `null` (N/A on the page), never 0 | everywhere |

[`test/market.test.js`](../test/market.test.js) is the server's own test of these functions, on the
answers two public market-data services gave for a PumpSwap token quoted in another pump coin
([`test/fixtures/ant-pumpswap.json`](../test/fixtures/ant-pumpswap.json)).

What is not here: fetching pairs and pools, the rate limits, caches and fallbacks around them.
