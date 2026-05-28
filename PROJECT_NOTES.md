# Market Tracker Notes

## Project Shape

- Chrome MV3 extension for tracking Indian and global market prices.
- `background.worker.js` owns data refresh, Yahoo/TradingView fetches, alarms, notifications, tracked stocks, and price alert state.
- `popup.js`, `popup.html`, and `popup.css` own the extension popup UI for indices, stock tracker, and alert management.
- `holidaysManager.js` handles NSE holiday caching used by market timers and notification scheduling.

## Current Alert Requirement

- A saved alert target such as `100` should start warning when the live price nears the target.
- Near-target means within 2% above the target, so a `100` alert starts warning around `102`.
- Once price reaches or goes below the target, notification should repeat every 2 minutes.
- Alert state resets when price moves back outside the near-target band or when the user clicks Reset in the popup.

## Implementation Notes

- Existing one-shot `below` state in `priceAlertStates` is being replaced with a repeat-aware state.
- The background alarm still checks alerts every minute, but target notifications are throttled to one every 2 minutes per alert.
- Popup alert rows show current price, status, target price, update/remove controls, and a reset button.
- Updating an alert also clears the stored state so the new threshold starts fresh.
- Reset clears only that alert's saved notification state; it does not remove the alert.
- Price-target notifications use a separate sender from market/index/mover alerts.
- Price-target checks run on their own `priceAlertScheduler` alarm (1-minute cadence) and fetch only alert symbols, so repeats are reliable even when `refreshMarketData` throttles off-hours.
- Price-target notifications only run during India market hours (IST) on trading days (no weekends / NSE holidays).
- Background alert schedulers wait for the NSE holiday cache before sending; `holidaysManager.js` also includes 2026 CM holiday fallbacks, including May 28, 2026 (Bakri Id).
- The popup's pause button applies to market alerts only; price-target alerts are not suppressed by that general pause path.

## Alert Timings (IST)

All India-trading alerts skip Saturdays/Sundays and NSE holidays via `holidaysManager.js`.

1. Market Open Countdown (minute-by-minute)
   - 9:10 AM to 9:15 AM (inclusive): notification every minute.
   - 9:15 AM: "Market opens now".

2. Market Close Countdown (minute-by-minute)
   - 2:55 PM to 3:30 PM (inclusive): notification every minute.
   - 3:30 PM: "Market closes now".

3. Price Alerts (per configured stock target)
   - Checked every 1 minute during market hours (9:15 AM to 3:30 PM).
   - Near-target (<= 2% above target): one notification when entering the near zone.
   - Target reached (<= target): repeats every 2 minutes while price remains at/below target.
   - Resets when price exits the near zone, when threshold is updated, or when Reset is clicked in the popup.

4. Stock Movers (Positive / Negative)
   - Only during market hours (9:15 AM to 3:30 PM).
   - Every 10 minutes: sends Top Positive (>1%) and/or Top Negative (>1%) lists if any exist.

5. India Indices Summary ("Market Tracker - India")
   - During India market hours or Gift Nifty working hours: every 10 minutes.
   - Outside those hours: every 120 minutes.

## Alert Timings (US / New York Time)

6. US Indices Summary ("Market Tracker - US Indices")
   - During US market hours (9:30 AM to 4:00 PM ET), weekdays: every 15 minutes.
   - Outside US market hours: every 120 minutes.

## Files Changed

- `background.worker.js`: recursive target alert logic, near-target notifications, separate high-priority price alert sender, reset handler, state reset on alert update.
- `popup.js`: near/target status labels, market-alert pause copy, and reset button behavior.
- `popup.html`: alert input copy changed from below-price to target-price.
- `popup.css`: reset button and near-target status styling.
