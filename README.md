# Market Tracker Chrome Extension

Tracks key Indian and global market indices in a Chrome popup.

## Current coverage
### India
- Nifty 50 (`^NSEI`)
- Bank Nifty (`^NSEBANK`)
- Gift Nifty (`^SGXNIFTY` fallbacks applied)
- Sensex (`^BSESN`)

### Global
- S&P 500 (`^GSPC`)
- Dow Jones (`^DJI`)
- Nasdaq (`^IXIC`)
- FTSE 100 (`^FTSE`)
- Nikkei 225 (`^N225`)

Data source: Yahoo Finance chart API.

## Load locally in Chrome
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder:
   - `C:\\Users\\prave\\Documents\\Projects\\Market Timer`

## Behavior
- Two popup tabs:
  - India (timer + Indian indices)
  - Global (global indices)
- Market timer in IST (shows only next relevant countdown):
  - After close: countdown to next pre-open (9:00 AM)
  - During pre-open: countdown to market open (9:15 AM)
  - During market: countdown to close (3:00 PM)
- Popup auto-refresh every 10 seconds (while popup is open)
- Background refresh every 5 minutes (fallback sync)
- Notifications in IST (weekdays):
  - 9:10 to 9:14 AM: every minute "market opens in X minutes"
  - 9:15 AM: "market opens now"
  - 2:55 to 2:59 PM: every minute "market closes in X minutes"
  - 3:00 PM: "market closes now"
- Manual refresh button in popup
- Badge shows Nifty direction:
  - `UP` up
  - `DN` down
  - `FL` flat
