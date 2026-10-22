# The score

A number from 0 to 100, where 100 is the cleanest distribution, and a band: **CLEAN** 80 and up,
**OK** 60–79, **RISKY** 40–59, **DANGER** under 40. Code: [`rules/score.js`](../rules/score.js).

## Five parts

Each part is measured on the top 20 holders against the real float. It gets full points at its first
mark, zero at its second, and scales in a straight line in between.

| Part | Points | Full at | Zero at | What it measures |
|---|---:|---|---|---|
| Biggest operator | 35 | ≤ 10% drop | ≥ 60% drop | How far the price falls if the largest operator sells everything into the pool |
| Fresh wallets | 25 | ≤ 10% | ≥ 80% | Share of read top wallets with no trading history before this token |
| Received, not bought | 20 | ≤ 1% | ≥ 10% | Share of float that arrived by transfer instead of a buy |
| Unsold snipers | 10 | ≤ 1% | ≥ 15% | Float still held by wallets that bought in the first 30 seconds |
| Top-20 share | 10 | ≤ 25% | ≥ 70% | How much of the float the top 20 hold together |

The dev wallet is left out of fresh wallets and snipers. The parts are rounded to 0.1, the total to a
whole number.

```js
part('virgin', 0.5)   // 25 × (0.80 − 0.50) / (0.80 − 0.10) = 10.7
```

## Price impact

The biggest operator part and the sell scenario use the same formula: a sale of `q` tokens into a
constant-product pool that holds `R` tokens moves the price by

```
drop = 1 − (R / (R + q))²
```

Selling as many tokens as the pool holds is a 75% drop.

## Operators

Code: [`rules/operators.js`](../rules/operators.js).

- **Proven links** merge wallets into one operator: the same buy transaction, tokens from the same
  ordinary wallet, direct transfers between holders. Links chain: if A is linked to B and B to C, all
  three are one operator.
- **Packs** are 3 or more fresh wallets that entered within a couple of slots with amounts within ±30%
  of each other. A pack is behaviour, not proof, so its share counts at **60%** when operators are
  ranked and when the biggest one is priced.
- A wallet already in a proven operator is not counted again in a pack.
- Everyone else stands alone.

## Red flags: DANGER whatever the score

| Rule | |
|---|---|
| An operator of two or more linked wallets could move the price down 50% or more by selling | `imp >= 0.5 && wallets > 1` |
| 80% or more of the read top wallets never traded anything before this token | `virgin >= 0.8` |
| 10% or more of the float was received by transfer instead of bought | `transfer >= 0.10` |

## Caps: at best RISKY (59)

| Rule | |
|---|---|
| A proven operator of 3 or more wallets, or a pack, holds part of the float | |
| One independent holder could move the price 50% or more. One honest whale is a risk, not a rug | |
| 3 or more of the top 20 wallets could not be read in time (the scan is **PARTIAL**) | |
| Liquidity is under $1,000 | |

Wallets under 0.5% of float are not read deeply, and an unread one of them never counts toward PARTIAL.
One or two unread wallets add a note, not a cap.

## The sell scenario

Only on a DANGER verdict, and only when it would drop the price 40% or more: what happens if the linked,
fresh and transferred wallets (and launch-slot buyers who have not sold) sold into today's liquidity. It
is a scenario, not a forecast, and it never changes the score.

## When there is no score

| | |
|---|---|
| **TOO EARLY** | Fewer than 10 wallets hold the token outside the curve and pools. One buy would change everything. |
| **TOO ESTABLISHED** | Older than 30 days, more than $500K of liquidity and a market cap above $10M. The top holders of such tokens are exchanges and big pools. |

Owner powers, liquidity and pressure still apply to both.

## Check it yourself

```bash
npm test                                         # every rule, and the examples the server produced
node rules/cli.js examples/site-example.json     # the example token on the home page
```
