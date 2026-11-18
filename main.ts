// Dip-bounce scalper v2 for cbBTC on 1-minute bars, long only.
// Rebuilt fresh in the session opened by Henhen's "Ikuti BTC Race Ronde 5"
// prompt, as entry dir v2 (same validated logic, new authorship chain).
//
// Idea: BTC on this pool moves in small ranges (a 1-minute bar rarely moves
// more than ~30 bps). The bot buys a sharp dip and sells the snap-back, and
// otherwise sits in cash. That keeps it active on the handful of real swings
// in a day instead of churning on every wiggle.
//
//   - Entry: the close is at least DIP_BPS below the highest close of the
//     last LOOKBACK bars. Buy with all cash (one position, full size, so each
//     winning trade clears the ~26 bps round-trip cost with room to spare).
//   - Exit: sell the whole position when its value at the close is TP_BPS
//     above its cost, or SL_BPS below it. Cost comes from the replay's own
//     account record, so fees already paid are in the comparison.
//   - No trade is held into the end on purpose: whatever is still held is
//     flattened by the replay at the last close.
//
// All comparisons are exact bigint cross-multiplications, so two runs on the
// same bars produce identical orders. No randomness, no clock, no network.

import { BPS, runBars, type BarsState, type BuyInput, type OrderInput, type SellInput } from './vendor/makefun-bars.ts';

/** How far back the rolling high looks (bars). */
const LOOKBACK = 60;
/** Entry: close this far below the rolling high, in bps.
 *  Tuned 105 -> 120: a deeper dip skips the false entries that bleed in a
 *  waterfall market (best three-window total of the dip grid; dip 130 already
 *  loses on round 4's window). */
const DIP_BPS = 120n;
/** Exit: take profit this far above cost, in bps.
 *  Tuned 150 -> 210: dip recoveries on this pool usually run past 2% before
 *  fading. TP 205–215 is a flat, stable region (+$5.91 on this round's dev
 *  window, +$13.25 on round 4's); TP 220 already collapses round 4 to 1 trade. */
const TP_BPS = 210n;
/** Exit: stop loss this far below cost, in bps.
 *  Tuned 55 -> 70: with the wider TP, the wider stop keeps winners alive;
 *  SL 60 re-enters the churn (7 trades, gate window turns negative). */
const SL_BPS = 70n;
/** Orders are refused if the fill would land further than this past the close. */
const MAX_SLIPPAGE_BPS = 100;
/** Bars of history before the first entry is allowed. */
const MIN_HISTORY = 20;

const SYMBOL = 'CBBTC';

/** Recent closes, oldest first, at most LOOKBACK long. */
const closes: bigint[] = [];

function rollingHigh(): bigint {
  let hi = closes[0]!;
  for (const c of closes) if (c > hi) hi = c;
  return hi;
}

await runBars({
  onBatch(state: BarsState, batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) {
      closes.push(BigInt(bar.c));
      if (closes.length > LOOKBACK) closes.shift();
    }
    if (state.warmingUp || bar === undefined) return [];

    const close = BigInt(bar.c);
    const held = state.positions.get(SYMBOL);
    const orders: OrderInput[] = [];

    if (held !== undefined) {
      // Exit on take-profit or stop-loss, measured against the real cost.
      const value = state.value(SYMBOL, held.qty);
      const takeProfit = value * BPS >= held.cost * (BPS + TP_BPS);
      const stopLoss = value * BPS <= held.cost * (BPS - SL_BPS);
      if (takeProfit || stopLoss) {
        const sell: SellInput = { side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS };
        orders.push(sell);
      }
      return orders;
    }

    if (closes.length < MIN_HISTORY) return [];
    const high = rollingHigh();
    // close <= high * (1 - DIP_BPS / 10000), cross-multiplied, exact.
    const dipped = close * BPS <= high * (BPS - DIP_BPS);
    if (!dipped) return [];

    const slice = state.cash < state.weightRoom(SYMBOL) ? state.cash : state.weightRoom(SYMBOL);
    if (slice === 0n || slice < BigInt(state.hello.fees.min_notional_quote_units)) return [];
    const buy: BuyInput = { side: 'buy', symbol: SYMBOL, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS };
    orders.push(buy);
    return orders;
  },
});
