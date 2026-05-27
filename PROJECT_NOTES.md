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
- The popup's pause button applies to market alerts only; price-target alerts are not suppressed by that general pause path.

## Files Changed

- `background.worker.js`: recursive target alert logic, near-target notifications, separate high-priority price alert sender, reset handler, state reset on alert update.
- `popup.js`: near/target status labels, market-alert pause copy, and reset button behavior.
- `popup.html`: alert input copy changed from below-price to target-price.
- `popup.css`: reset button and near-target status styling.
