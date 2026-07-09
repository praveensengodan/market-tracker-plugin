# Market Tracker Notes

## Project Shape

- Chrome MV3 extension for tracking Indian and global market prices.
- `background.worker.js` owns data refresh, Yahoo/TradingView fetches, alarms, notifications, tracked stocks, and price alert state.
- `popup.js`, `popup.html`, and `popup.css` own the extension popup UI for indices, stock tracker, and alert management.
- `holidaysManager.js` handles NSE holiday caching used by market timers and notification scheduling.

## Current Alert Requirement

- A saved alert target supports both Buy and Sell directions.
- **Buy Targets:** Triggers when price reaches or falls below target. Near-target is within 2% above the target.
- **Sell Targets:** Triggers when price reaches or rises above target. Near-target is within 2% below the target.
- Once the target price condition is met, notifications repeat every 2 minutes.
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
- API price-alert targets are pulled from the Google Script endpoint and merged with local alerts. Existing local alerts remain; matching API symbols update the saved target price.
- API `Price` is authoritative for matching symbols; duplicate same-stock alerts are collapsed in both storage and popup rendering so the popup shows the API target.
- API sync uses the final Google Apps Script `/exec` URL and grants both `script.google.com` and `script.googleusercontent.com` host permissions.
- API alert sync runs at 9:00 AM IST before market open, then hourly during market hours on trading days. The popup also has a manual Sync API button.
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
   - Supports both BUY (downward) and SELL (upward) target price directions.
   - Near-target (within 2% above buy target or 2% below sell target): one notification when entering the zone.
   - Target reached (at/below buy target or at/above sell target): repeats every 2 minutes while target condition is met.
   - Resets when price exits the near zone, when threshold is updated, or when Reset is clicked in the popup.

4. API Price Alert Sync
   - 9:00 AM: pulls API alert list before market open.
   - 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM: pulls API alert list during market hours.
   - Skips weekends and NSE holidays.
   - Manual Sync API button can force a pull from the popup.

5. Stock Movers (Positive / Negative)
   - Only during market hours (9:15 AM to 3:30 PM).
   - Every 10 minutes: sends Top Positive (>1%) and/or Top Negative (>1%) lists if any exist.

6. India Indices Summary ("Market Tracker - India")
   - Only sent on India trading days (skips Saturdays, Sundays, and NSE holidays).
   - During India market hours or Gift Nifty working hours: every 10 minutes.
     *(Note: The early morning session from 12:00 AM to 2:45 AM IST is only active if the previous calendar day was a trading day)*
   - Outside those hours: Silent (no notifications are sent during off-hours).

## Alert Timings (US / New York Time)

7. US Indices Summary ("Market Tracker - US Indices")
   - Only sent on US trading days (skips Saturdays, Sundays, and US stock market holidays).
   - During US market hours (9:30 AM to 4:00 PM ET): every 15 minutes.
   - Outside US market hours: every 120 minutes.

## Files Changed

- `background.worker.js`: recursive target alert logic, near-target notifications, separate high-priority price alert sender, reset handler, state reset on alert update, index notification suppression on holidays/weekends, buy/sell target support, and Gift Nifty early morning session previous-day validation.
- `popup.js`: near/target status labels, market-alert pause copy, reset button behavior, buy/sell target inputs/dropdown extraction, and status type chip rendering.
- `popup.html`: alert input type selection dropdown added, alert-form-grid adjustments.
- `popup.css`: reset button and near-target status styling, alert type select and buy/sell type status chips styling.
- `manifest.json`: allows the Google Script API host used for alert sync.
