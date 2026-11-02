# Market Tracker Notes

**Current Version:** `1.2.0`

## Versioning Policy (SemVer: MAJOR.MINOR.PATCH)
- **Patch (`1.0.x`):** Small tweaks, bug fixes, or minor formatting adjustments.
- **Minor (`1.x.0`):** New features or notable enhancements (e.g. alert systems, API integrations, tab additions).
- **Major (`x.0.0`):** Complete revamps, major redesigns, or breaking architecture shifts.
- Version is maintained in `manifest.json` and tracked in `project_context.md`.

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
- Pausing notifications immediately clears all active/queued notifications (including price alerts) from the system tray and suppresses future ones.

## Alert Timings (IST)

All India-trading alerts skip Saturdays/Sundays and NSE holidays via `holidaysManager.js`.

1. Market Open Countdown (minute-by-minute)
   - 9:10 AM to 9:15 AM (inclusive): notification every minute.
   - 9:15 AM: "Market opens now".

2. Market Close Countdown (minute-by-minute)
   - 3:00 PM to 3:15 PM (inclusive): notification every minute.
   - 3:15 PM: "Market closes now. Closing session starts (3:15 PM - 3:20 PM IST)".
   - 3:20 PM to 3:25 PM (inclusive): post-market minute-by-minute alerts.
   - 3:25 PM: "Post-market session closes now".

3. Price Alerts (per configured stock target)
   - Checked every 1 minute during market hours (9:15 AM to 3:30 PM).
   - Price alerts are explicitly disabled during closing gaps: 3:15 PM - 3:20 PM and 3:25 PM - 3:30 PM.
   - Price alerts do not trigger when the market is closed (before 9:15 AM and after 3:30 PM).
   - Supports both BUY (downward) and SELL (upward) target price directions.
   - Near-target (within 2% above buy target or 2% below sell target): one notification when entering the zone.
   - Target reached (at/below buy target or at/above sell target): repeats every 2 minutes while target condition is met.
   - Resets when price exits the near zone, when threshold is updated, or when Reset is clicked in the popup.

4. API Price Alert Sync
   - 9:00 AM: pulls API alert list before market open.
   - 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM: pulls API alert list during market hours.
   - Skips weekends and NSE holidays.
   - Manual Sync API button can force a pull from the popup.

5. India Stock Movers (Positive / Negative)
   - Only during Indian market hours (9:15 AM to 3:25 PM IST).
   - Filtered strictly for Indian tracked stocks (`trackedStocks`).
   - Every 10 minutes: sends Top Positive (>1%) and/or Top Negative (>1%) lists if any exist.

6. India Indices Summary ("Market Tracker - India")
   - Only sent on India trading days (skips Saturdays, Sundays, and NSE holidays).
   - During India market hours or Gift Nifty working hours: every 10 minutes.
     *(Note: The early morning session from 12:00 AM to 2:45 AM IST is only active if the previous calendar day was a trading day)*
   - Outside those hours: Silent (no notifications are sent during off-hours).

## Alert Timings (US / New York Time)

7. US Market Open Countdown (minute-by-minute)
   - 9:25 AM to 9:30 AM ET (inclusive): notification every minute.
   - 9:30 AM ET: "US Market opens now (9:30 AM ET / <IST Time> IST)".
   - Shows both ET and current converted IST time dynamically.

8. US Market Close Countdown (minute-by-minute)
   - 3:45 PM to 4:00 PM ET (inclusive): notification every minute.
   - 4:00 PM ET: "US Market closes now (4:00 PM ET / <IST Time> IST)".
   - Shows both ET and current converted IST time dynamically.

9. US Indices Summary ("Market Tracker - US Indices")
   - Only sent on US trading days (skips Saturdays, Sundays, and US stock market holidays).
   - During US market hours (9:30 AM to 4:00 PM ET): every 15 minutes.
   - Outside US market hours: every 120 minutes.

10. US Stocks Price Alerts (per configured US stock target)
    - Checked every 1 minute during US market hours (9:30 AM to 4:00 PM Eastern Time / `America/New_York`).
    - Runs on dedicated `usPriceAlertScheduler` alarm to guarantee 1-minute checking without being affected by off-hours throttling.
    - Suppressed on US weekends (Saturday/Sunday) and US stock market holidays (e.g., New Year's Day, MLK Day, Presidents' Day, Good Friday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Christmas).
    - Supports both BUY (downward) and SELL (upward) target price directions in USD (`$`).
    - Near-target (within 2% above buy target or 2% below sell target): one notification when entering the zone.
    - Target reached (at/below buy target or at/above sell target): repeats every 2 minutes while target condition is met.
    - Adding or updating a US stock alert automatically adds the stock to `trackedUsStocks`.
    - Alert state resets when price exits the near zone, when threshold is updated, or when Reset is clicked in the popup.

11. US API Price Alert Sync
    - 9:00 AM ET: pulls US API alert list before market open.
    - 10:00 AM, 11:00 AM, 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM ET: pulls US API alert list during US market hours.
    - Skips US weekends and US stock market holidays.
    - Manual Sync API button in US Stock Tracker header can force a pull from the popup.

12. US Stock Movers (Positive / Negative)
    - Only during US market hours (9:30 AM to 4:00 PM ET).
    - Filtered strictly for US tracked stocks (`trackedUsStocks`).
    - Every 10 minutes: sends Top Positive (>1%) and/or Top Negative (>1%) lists if any exist.

## Merged Stocks & Alerts Architecture

- **Unified Stock List:** The standalone "Alerts" tab is merged into both **India Stocks** and **US Stocks** trackers.
- **Auto-Addition:** Setting an alert locally or syncing alerts from API automatically ensures the stock is appended to `trackedStocks` or `trackedUsStocks` so it is visible with live price tracking.
- **Inline Alert Row:** Each stock row displays live price, daily change %, and its alert status badge (`BUY 🎯 $...` or `₹...`, `SELL 🎯 $...` or `₹...`, `Near Target`, or `Target Reached`). Clicking the badge expands an inline editor for setting/updating target price, resetting repeat state, or clearing the alert.
- **Sync API Buttons:** Embedded directly at the top header of both India and US Stock Trackers.
- **Storage Keys:**
  - India: `trackedStocks`, `priceAlerts`, `priceAlertStates`, `priceAlertApiSync`
  - US: `trackedUsStocks`, `usPriceAlerts`, `usPriceAlertStates`, `usPriceAlertApiSync`

## Files Changed

- `background.worker.js`: recursive target alert logic, near-target notifications, separate high-priority price alert sender, reset handler, state reset on alert update, index notification suppression on holidays/weekends, buy/sell target support, Gift Nifty early morning session previous-day validation, US stock storage helpers, US stock search (`searchUsStocks`), US stock quote fetching, auto-adding alert stocks to `trackedStocks`/`trackedUsStocks` during manual upsert and API sync, US price alert scheduler (`usPriceAlertScheduler`), US price alert evaluation & notifications with explicit Eastern Time (`ET`) timestamps for US alerts and `IST` for India alerts (`runUsPriceAlertChecks`, `runUsPriceAlertScheduler`), US price alert API sync scheduler & fetcher (`syncUsPriceAlertsFromApi`, `runUsPriceAlertApiSyncScheduler`), US market open and close countdown notifications (`buildUsAlertForMinute`, `checkUsMarketAlerts`, `LAST_US_ALERT_KEY`), US stock key filtering (`isKnownUsStockKey`) in `sanitizeTrackedStock` and `sanitizePriceAlert` to prevent US stocks like CoreWeave from leaking into Indian stock storage, `reset-storage` message handler to snapshot your currently tracked stocks, wipe storage, and cleanly restore Indian and US stock lists into their respective isolated stores, and runtime message listeners for US alert CRUD and API sync operations.
- `popup.js`: near/target status labels, market-alert pause copy, reset button behavior, buy/sell target inputs/dropdown extraction, status type chip rendering, US stock tracking state, search, sort, render, TradingView URL resolution for US vs Indian tickers, unified stock + inline alert badge/editor interactions for both India and US stocks, USD formatting for US alert editors/badges, US Sync API button trigger (`syncUsApiPriceAlerts`), US market timers (`updateUsMarketTimers`), US stock key exclusion filter (`isKnownUsStockKey`) in `dedupePriceAlerts` and `loadTrackedStocks`, Reset Storage button trigger (`resetStorageBtn`) to wipe corrupted legacy storage and reload preserved clean stocks into their respective trackers, and tab-aware status timestamps displaying ET when viewing US stocks or Global indices and IST when viewing Indian stocks/indices.
- `popup.html`: 2-column inner tabs layout (India Stocks, US Stocks), removed standalone alerts panel, embedded Sync API button into both India and US Stocks headers, added US Market Timers card to Global tab, and added "Reset Storage" button in footer.
- `popup.css`: fixed popup container dimensions (`380px` width x `560px` height) with flexbox column layout and independent scrollable panels/lists (`#stocksList`, `#usStocksList`, `.tab-panel`), preventing any popup jumping or resizing when clicking buttons, toggling alert editors, or switching tabs; footer styling with Reset Storage button, 2-column inner tab styling, stock row layout with expandable alert badges/editor, and clean status chip styling.
- `manifest.json`: allows the Google Script API host used for alert sync.
