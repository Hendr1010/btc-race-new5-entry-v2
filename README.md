# Dip-bounce scalper v2 — BTC race round 5

[![make.fun](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=makefun)
[![Rank](https://make.fun/badge/btc-race-24h-20261118-1444/Hendr1010/btc-race-new5-entry-v2/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=makefun)
[![Reward](https://make.fun/badge/btc-race-24h-20261118-1444/Hendr1010/btc-race-new5-entry-v2/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=makefun)

A long-only dip-bounce scalper for cbBTC on 1-minute Orca bars. It buys a sharp
dip (close ≥120 bps below the 60-bar rolling high) with all cash and sells the
snap-back at +210 bps take-profit or −70 bps stop-loss, then sits in cash until
the next real swing. No randomness, no clock, no network — two runs on the same
bars produce identical orders.

## Tuning

Validated on three published dev windows with the replay's exact fill model
(next-minute-open fills, 4 bps fee + 2 bps slippage + constant-product price
impact against the fill bar's pool depth):

| setting | round-5 window | round-4 window | 20261113 window |
| --- | --- | --- | --- |
| TP 150 / SL 55, dip 105 (round 4) | −$5.61 | +$13.73 | −$79.00 |
| TP 180 / SL 55, dip 105 | −$3.03 | +$19.35 | −$76.12 |
| **TP 210 / SL 70, dip 120 (this bot)** | **+$5.91** | **+$13.25** | −$43.19 |

The round-4 settings lose money on this round's dev window — they were
discarded, not carried over. Rejected by the same tests: a shallower second
entry trigger (lost money on every window), scale-ins (never triggered), trend
filters (blocked the winning trades along with the losers), and trailing exits
(worse on the gate window). TP 205–215 is a flat, stable region, not a spike:
TP 220 already collapses round 4's window to a single trade.

Dev grade on this round's window (grade-local, exact replay): PnL +$5.91,
5 trades, max drawdown 1.65%.
