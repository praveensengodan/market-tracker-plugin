import { getNseHolidayName, initializeHolidaysCache, ensureHolidaysCacheLoaded } from './holidaysManager.js';

const INDEX_CONFIG = {
  nifty: { symbol: '^NSEI', name: 'Nifty 50', market: 'india' },
  bankNifty: { symbol: '^NSEBANK', name: 'Bank Nifty', market: 'india' },
  sensex: { symbol: '^BSESN', name: 'Sensex', market: 'india' },
  giftNifty: {
    name: 'Gift Nifty',
    market: 'india',
    source: 'tradingview',
    optional: true,
    tradingviewSymbols: ['NSEIX:GIFNIFTY', 'NSEIX:GIFTNIFTY', 'SGX:GIFNIFTY', 'NSEIX:NIFTY1!', 'SGX:IN1!']
  },
  sp500: { symbol: '^GSPC', name: 'S&P 500', market: 'global' },
  dowJones: { symbol: '^DJI', name: 'Dow Jones', market: 'global' },
  nasdaq: { symbol: '^NDX', name: 'Nasdaq 100', market: 'global' },
  ftse100: { symbol: '^FTSE', name: 'FTSE 100', market: 'global' },
  nikkei225: { symbol: '^N225', name: 'Nikkei 225', market: 'global' }
};

const DEFAULT_PRICE_ALERTS = [
  // Example:
  // { id: 'infy-below-1500', key: 'infy', symbol: 'INFY.NS', name: 'INFY', threshold: 1500 }
];
const PRICE_ALERTS_API_URL = 'https://script.google.com/macros/s/AKfycbxx68RCG2r99m4tpmZyvfddvD5B2_HhWVhxnEoArjmC6tDSQdhZzCcEFtY28M3jxgqA/exec';
const DEFAULT_TRACKED_STOCKS = [
  { key: 'ashokley', symbol: 'ASHOKLEY.NS', name: 'ASHOKLEY' },
  { key: 'brigade', symbol: 'BRIGADE.NS', name: 'BRIGADE' },
  { key: 'cipla', symbol: 'CIPLA.NS', name: 'CIPLA' },
  { key: 'drreddy', symbol: 'DRREDDY.NS', name: 'DRREDDY' },
  { key: 'hdbfs', symbol: 'HDBFS.NS', name: 'HDBFS' },
  { key: 'hdfcbank', symbol: 'HDFCBANK.NS', name: 'HDFCBANK' },
  { key: 'iciciamc', symbol: 'ICICIAMC.NS', name: 'ICICIAMC' },
  { key: 'idfcfirstb', symbol: 'IDFCFIRSTB.NS', name: 'IDFCFIRSTB' },
  { key: 'indusindbk', symbol: 'INDUSINDBK.NS', name: 'INDUSINDBK' },
  { key: 'infy', symbol: 'INFY.NS', name: 'INFY' },
  { key: 'itc', symbol: 'ITC.NS', name: 'ITC' },
  { key: 'ktkbank', symbol: 'KTKBANK.NS', name: 'KTKBANK' },
  { key: 'lgeindia', symbol: 'LGEINDIA.NS', name: 'LGEINDIA' },
  { key: 'lici', symbol: 'LICI.NS', name: 'LICI' },
  { key: 'natcopharm', symbol: 'NATCOPHARM.NS', name: 'NATCOPHARM' },
  { key: 'rainbow', symbol: 'RAINBOW.NS', name: 'RAINBOW' },
  { key: 'scodatubes', symbol: 'SCODATUBES.NS', name: 'SCODATUBES' },
  { key: 'southbank', symbol: 'SOUTHBANK.NS', name: 'SOUTHBANK' },
  { key: 'tatacap', symbol: 'TATACAP.NS', name: 'TATACAP' },
  { key: 'tatachem', symbol: 'TATACHEM.NS', name: 'TATACHEM' },
  { key: 'tatapower', symbol: 'TATAPOWER.NS', name: 'TATAPOWER' },
  { key: 'tatasteel', symbol: 'TATASTEEL.NS', name: 'TATASTEEL' },
  { key: 'techm', symbol: 'TECHM.NS', name: 'TECHM' },
  { key: 'tmb', symbol: 'TMB.NS', name: 'TMB' },
  { key: 'tmcv', symbol: 'TMCV.NS', name: 'TMCV' },
  { key: 'tmpv', symbol: 'TMPV.NS', name: 'TMPV' },
  { key: 'zyduslife', symbol: 'ZYDUSLIFE.NS', name: 'ZYDUSLIFE' }
];

const REFRESH_MINUTES = 1;
const ALERT_CHECK_MINUTES = 1;
const INDEX_NOTIFY_SCHEDULER_MINUTES = 1;

const IST_OFFSET_MINUTES = 330;
const US_TIMEZONE = 'America/New_York';

const OPEN_COUNTDOWN_START_MINUTES = 9 * 60 + 10;
const ALERT_API_PRE_MARKET_SYNC_MINUTES = 9 * 60;
const OPEN_TIME_MINUTES = 9 * 60 + 15;
const CLOSE_COUNTDOWN_START_MINUTES = 14 * 60 + 55;
const CLOSE_TIME_MINUTES = 15 * 60 + 30;
const NIFTY_NOTIFY_CLOSE_MINUTES = 15 * 60 + 30;

const US_OPEN_MINUTES = 9 * 60 + 30;
const US_CLOSE_MINUTES = 16 * 60;

const INDIA_MARKET_INTERVAL_MINUTES = 10;
const INDIA_OFF_INTERVAL_MINUTES = 120;
const US_MARKET_INTERVAL_MINUTES = 15;
const US_OFF_INTERVAL_MINUTES = 120;
const STOCK_MOVER_INTERVAL_MINUTES = 10;
const STOCK_MOVER_THRESHOLD_PERCENT = 1;
const OFF_HOURS_REFRESH_MS = 2 * 60 * 60 * 1000;

const STORAGE_KEY = 'marketData';
const LAST_UPDATED_KEY = 'lastUpdatedAt';
const LAST_ALERT_KEY = 'lastAlertKey';
const LAST_INDEX_NOTIFY_KEY = 'lastIndexNotifyBuckets';
const NOTIFICATIONS_PAUSED_KEY = 'notificationsPaused';
const TRACKED_STOCKS_KEY = 'trackedStocks';
const PRICE_ALERTS_KEY = 'priceAlerts';
const PRICE_ALERT_STATES_KEY = 'priceAlertStates';
const PRICE_ALERT_API_SYNC_KEY = 'priceAlertApiSync';
const PRICE_ALERT_NEAR_PERCENT = 2;
const PRICE_ALERT_REPEAT_MS = 2 * 60 * 1000;

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
};

const US_HOLIDAYS = {
  // 2025 US Stock Market Holidays
  '2025-01-01': "New Year's Day",
  '2025-01-20': 'Martin Luther King Jr. Day',
  '2025-02-17': "Presidents' Day / Washington's Birthday",
  '2025-04-18': 'Good Friday',
  '2025-05-26': 'Memorial Day',
  '2025-06-19': 'Juneteenth',
  '2025-07-04': 'Independence Day',
  '2025-09-01': 'Labor Day',
  '2025-11-27': 'Thanksgiving Day',
  '2025-12-25': 'Christmas Day',

  // 2026 US Stock Market Holidays
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King Jr. Day',
  '2026-02-16': "Presidents' Day / Washington's Birthday",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth',
  '2026-07-03': 'Independence Day (Observed)',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-12-25': 'Christmas Day'
};

function isUsHoliday(dateKey) {
  return Boolean(US_HOLIDAYS[dateKey]);
}

function cloneDefaultTrackedStocks() {
  return DEFAULT_TRACKED_STOCKS.map((stock) => ({ ...stock }));
}

function normalizeStockSymbol(symbol) {
  const base = String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/\.NS$/i, '');

  return base ? `${base}.NS` : '';
}

function normalizeStockKey(symbol) {
  return String(symbol || '')
    .trim()
    .toLowerCase()
    .replace(/\.ns$/i, '')
    .replace(/[^a-z0-9]+/g, '');
}

function sanitizeTrackedStock(stock) {
  const symbol = normalizeStockSymbol(stock?.symbol || stock?.displaySymbol || stock?.name);
  if (!symbol) {
    return null;
  }

  const baseSymbol = symbol.replace(/\.NS$/i, '');
  const key = normalizeStockKey(stock?.key || baseSymbol);
  if (!key) {
    return null;
  }

  const rawName = String(stock?.name || baseSymbol).trim();
  const name = rawName || baseSymbol;

  return {
    key,
    symbol,
    name
  };
}

async function getTrackedStocks() {
  const storage = await chrome.storage.local.get([TRACKED_STOCKS_KEY]);

  if (!Object.prototype.hasOwnProperty.call(storage, TRACKED_STOCKS_KEY)) {
    const defaults = cloneDefaultTrackedStocks();
    await chrome.storage.local.set({ [TRACKED_STOCKS_KEY]: defaults });
    return defaults;
  }

  const storedStocks = Array.isArray(storage[TRACKED_STOCKS_KEY]) ? storage[TRACKED_STOCKS_KEY] : [];
  const seen = new Set();
  const sanitized = storedStocks
    .map(sanitizeTrackedStock)
    .filter((stock) => {
      if (!stock || seen.has(stock.key)) {
        return false;
      }

      seen.add(stock.key);
      return true;
    });

  if (sanitized.length !== storedStocks.length) {
    await chrome.storage.local.set({ [TRACKED_STOCKS_KEY]: sanitized });
  }

  return sanitized;
}


function cloneDefaultPriceAlerts() {
  return DEFAULT_PRICE_ALERTS.map((alert) => ({ ...alert }));
}

function sanitizePriceAlert(alert) {
  const stock = sanitizeTrackedStock(alert);
  const threshold = Number(alert?.threshold ?? alert?.Price ?? alert?.price);
  if (!stock || !Number.isFinite(threshold) || threshold <= 0) {
    return null;
  }

  const rawType = String(alert?.type || alert?.Type || alert?.action || alert?.Action || alert?.direction || alert?.Direction || 'buy').trim().toLowerCase();
  const normalizedType = (rawType === 'sell' || rawType === 'above' || rawType === 'up') ? 'sell' : 'buy';

  return {
    id: String(alert?.id || ('price-alert-' + stock.key + '-' + String(threshold).replace('.', '_'))),
    key: stock.key,
    symbol: stock.symbol,
    name: stock.name,
    threshold,
    source: String(alert?.source || 'manual'),
    type: normalizedType
  };
}

function getAlertSourceRank(source) {
  if (source === 'api' || source === 'manual+api') {
    return 2;
  }

  return 1;
}

function alertsChanged(previousAlerts, nextAlerts) {
  return JSON.stringify(previousAlerts) !== JSON.stringify(nextAlerts);
}

async function getPriceAlerts() {
  const storage = await chrome.storage.local.get([PRICE_ALERTS_KEY]);

  if (!Object.prototype.hasOwnProperty.call(storage, PRICE_ALERTS_KEY)) {
    const defaults = cloneDefaultPriceAlerts();
    await chrome.storage.local.set({ [PRICE_ALERTS_KEY]: defaults });
    return defaults;
  }

  const storedAlerts = Array.isArray(storage[PRICE_ALERTS_KEY]) ? storage[PRICE_ALERTS_KEY] : [];
  const byKey = new Map();
  const sanitizedInput = storedAlerts.map(sanitizePriceAlert).filter(Boolean);
  for (const alert of sanitizedInput) {
    const existing = byKey.get(alert.key);
    if (!existing || getAlertSourceRank(alert.source) >= getAlertSourceRank(existing.source)) {
      byKey.set(alert.key, alert);
    }
  }

  const sanitized = Array.from(byKey.values());

  if (alertsChanged(storedAlerts, sanitized)) {
    await chrome.storage.local.set({ [PRICE_ALERTS_KEY]: sanitized });
  }

  return sanitized;
}

async function upsertPriceAlert(alert) {
  const entry = sanitizePriceAlert(alert);
  if (!entry) {
    throw new Error('Invalid price alert');
  }

  const alerts = await getPriceAlerts();
  const nextAlerts = [...alerts];
  const existingIndex = nextAlerts.findIndex((item) => item.key === entry.key);

  if (existingIndex >= 0) {
    nextAlerts[existingIndex] = {
      ...nextAlerts[existingIndex],
      ...entry
    };
  } else {
    nextAlerts.push(entry);
  }

  const stateStorage = await chrome.storage.local.get([PRICE_ALERT_STATES_KEY]);
  const states = stateStorage[PRICE_ALERT_STATES_KEY] || {};
  delete states[entry.id];
  const existing = existingIndex >= 0 ? alerts[existingIndex] : null;
  if (existing?.id && existing.id !== entry.id) {
    delete states[existing.id];
  }

  await chrome.storage.local.set({
    [PRICE_ALERTS_KEY]: nextAlerts,
    [PRICE_ALERT_STATES_KEY]: states
  });
  return nextAlerts;
}

function sanitizeApiPriceAlert(item) {
  const symbol = normalizeStockSymbol(item?.Symbol || item?.symbol);
  const threshold = Number(item?.Price ?? item?.price);
  if (!symbol || !Number.isFinite(threshold) || threshold <= 0) {
    return null;
  }

  const key = normalizeStockKey(symbol);
  const name = symbol.replace(/\.NS$/i, '');
  const rawType = String(item?.type || item?.Type || item?.action || item?.Action || item?.direction || item?.Direction || 'buy').trim().toLowerCase();
  const normalizedType = (rawType === 'sell' || rawType === 'above' || rawType === 'up') ? 'sell' : 'buy';

  return {
    id: `price-alert-${key}`,
    key,
    symbol,
    name,
    threshold,
    source: 'api',
    type: normalizedType
  };
}

async function fetchApiPriceAlerts() {
  const response = await fetch(PRICE_ALERTS_API_URL, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Price alert API error: ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Price alert API returned invalid data');
  }

  return payload.map(sanitizeApiPriceAlert).filter(Boolean);
}

async function syncPriceAlertsFromApi({ force = false } = {}) {
  await ensureHolidaysCacheLoaded();
  const ist = getIstDateParts();
  const isIndiaHoliday = Boolean(getNseHolidayName(ist.dateKey));
  const isIndiaWeekend = isWeekend(ist.weekday);
  const isMarketHours = isIndiaMarketHours(ist.minutesSinceMidnight);
  if (!force && (isIndiaHoliday || isIndiaWeekend || (!isMarketHours && ist.minutesSinceMidnight !== ALERT_API_PRE_MARKET_SYNC_MINUTES))) {
    return { ok: true, skipped: 'non-trading-time' };
  }

  const apiAlerts = await fetchApiPriceAlerts();
  const alerts = await getPriceAlerts();
  const byKey = new Map(alerts.map((alert) => [alert.key, alert]));
  const stateStorage = await chrome.storage.local.get([PRICE_ALERT_STATES_KEY]);
  const states = stateStorage[PRICE_ALERT_STATES_KEY] || {};

  for (const apiAlert of apiAlerts) {
    const existing = byKey.get(apiAlert.key);
    if (existing) {
      const thresholdChanged = Number(existing.threshold) !== Number(apiAlert.threshold) || existing.type !== apiAlert.type;
      if (thresholdChanged) {
        delete states[existing.id];
        delete states[apiAlert.id];
      }

      byKey.set(apiAlert.key, {
        ...existing,
        id: apiAlert.id,
        symbol: apiAlert.symbol,
        name: apiAlert.name,
        threshold: apiAlert.threshold,
        source: 'api',
        type: apiAlert.type
      });
    } else {
      byKey.set(apiAlert.key, apiAlert);
    }
  }

  const nextAlerts = Array.from(byKey.values()).sort((a, b) => a.name.localeCompare(b.name));
  const activeIds = new Set(nextAlerts.map((alert) => alert.id));
  for (const stateId of Object.keys(states)) {
    if (!activeIds.has(stateId)) {
      delete states[stateId];
    }
  }

  await chrome.storage.local.set({
    [PRICE_ALERTS_KEY]: nextAlerts,
    [PRICE_ALERT_STATES_KEY]: states,
    [PRICE_ALERT_API_SYNC_KEY]: {
      lastSyncedAt: Date.now(),
      count: apiAlerts.length
    }
  });

  return { ok: true, count: apiAlerts.length };
}

async function runPriceAlertApiSyncScheduler() {
  await ensureHolidaysCacheLoaded();
  const ist = getIstDateParts();
  const isIndiaHoliday = Boolean(getNseHolidayName(ist.dateKey));
  const isIndiaWeekend = isWeekend(ist.weekday);
  if (isIndiaHoliday || isIndiaWeekend) {
    return;
  }

  let bucket = null;
  if (ist.minutesSinceMidnight === ALERT_API_PRE_MARKET_SYNC_MINUTES) {
    bucket = `${ist.dateKey}-preopen-0900`;
  } else if (isIndiaMarketHours(ist.minutesSinceMidnight) && ist.minutesSinceMidnight % 60 === 0) {
    bucket = `${ist.dateKey}-market-${Math.floor(ist.minutesSinceMidnight / 60)}`;
  }

  if (!bucket) {
    return;
  }

  const storage = await chrome.storage.local.get([PRICE_ALERT_API_SYNC_KEY]);
  const syncState = storage[PRICE_ALERT_API_SYNC_KEY] || {};
  if (syncState.lastSchedulerBucket === bucket) {
    return;
  }

  try {
    const result = await syncPriceAlertsFromApi({ force: true });
    await chrome.storage.local.set({
      [PRICE_ALERT_API_SYNC_KEY]: {
        ...syncState,
        lastSchedulerBucket: bucket,
        lastSyncedAt: Date.now(),
        count: result.count || 0,
        lastError: null
      }
    });
  } catch (error) {
    await chrome.storage.local.set({
      [PRICE_ALERT_API_SYNC_KEY]: {
        ...syncState,
        lastError: error?.message || 'Failed to sync price alerts'
      }
    });
  }
}

async function removePriceAlert(id) {
  const alerts = await getPriceAlerts();
  const nextAlerts = alerts.filter((alert) => alert.id !== String(id));
  const stateStorage = await chrome.storage.local.get([PRICE_ALERT_STATES_KEY]);
  const states = stateStorage[PRICE_ALERT_STATES_KEY] || {};
  delete states[String(id)];

  await chrome.storage.local.set({
    [PRICE_ALERTS_KEY]: nextAlerts,
    [PRICE_ALERT_STATES_KEY]: states
  });

  return nextAlerts;
}

async function resetPriceAlert(id) {
  const stateStorage = await chrome.storage.local.get([PRICE_ALERT_STATES_KEY]);
  const states = stateStorage[PRICE_ALERT_STATES_KEY] || {};
  delete states[String(id)];
  await chrome.storage.local.set({ [PRICE_ALERT_STATES_KEY]: states });
}

function buildStockConfig(trackedStocks) {
  return Object.fromEntries(
    trackedStocks.map((stock) => [
      stock.key,
      {
        symbol: stock.symbol,
        name: stock.name
      }
    ])
  );
}

async function addTrackedStock(stock) {
  const entry = sanitizeTrackedStock(stock);
  if (!entry) {
    throw new Error('Invalid stock');
  }

  const trackedStocks = await getTrackedStocks();
  const nextStocks = [...trackedStocks];
  const existingIndex = nextStocks.findIndex((item) => item.key === entry.key);

  if (existingIndex >= 0) {
    nextStocks[existingIndex] = entry;
  } else {
    nextStocks.push(entry);
  }

  await chrome.storage.local.set({ [TRACKED_STOCKS_KEY]: nextStocks });
  return nextStocks;
}

async function removeTrackedStock(key) {
  const normalizedKey = normalizeStockKey(key);
  const trackedStocks = await getTrackedStocks();
  const nextStocks = trackedStocks.filter((stock) => stock.key !== normalizedKey);
  await chrome.storage.local.set({ [TRACKED_STOCKS_KEY]: nextStocks });
  return nextStocks;
}

async function fetchIndexFromYahoo(symbol, name) {
  const encodedSymbol = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1m&range=1d&includePrePost=true`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${symbol}: ${response.status}`);
  }

  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const meta = result?.meta;
  const closeSeries = result?.indicators?.quote?.[0]?.close || [];

  if (!meta) {
    throw new Error(`Unexpected response shape for ${symbol}`);
  }

  const numericCloses = closeSeries.filter((value) => typeof value === 'number');
  const latestClose = numericCloses.at(-1);
  const previousSeriesClose = numericCloses.at(-2);

  const current = meta.regularMarketPrice ?? latestClose;
  if (typeof current !== 'number') {
    throw new Error(`Missing market values for ${symbol}`);
  }

  const previousClose =
    meta.chartPreviousClose ??
    meta.previousClose ??
    meta.regularMarketPreviousClose ??
    previousSeriesClose;

  if (typeof previousClose !== 'number') {
    throw new Error(`Missing market values for ${symbol}`);
  }

  const change = current - previousClose;
  const changePercent = previousClose === 0 ? 0 : (change / previousClose) * 100;

  return {
    symbol,
    name,
    price: current,
    previousClose,
    change,
    changePercent,
    currency: meta.currency || '',
    exchangeName: meta.exchangeName || ''
  };
}

async function fetchTradingViewSymbolSearch(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://symbol-search.tradingview.com/symbol_search/?text=${encoded}&hl=1&lang=en&type=&domain=production`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`TradingView symbol search failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

async function fetchYahooSymbolSearch(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encoded}&lang=en-IN&region=IN&quotesCount=15&newsCount=0`;

  const response = await fetch(url, {
    method: 'GET',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Yahoo symbol search failed: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.quotes) ? payload.quotes : [];
}

function mapSearchRowsToStocks(rows, mapper) {
  const seen = new Set();

  return rows
    .map(mapper)
    .filter((item) => {
      if (!item || seen.has(item.key)) {
        return false;
      }

      seen.add(item.key);
      return true;
    })
    .slice(0, 8);
}

async function searchNseStocks(query) {
  const text = String(query || '').trim();
  if (text.length < 2) {
    return [];
  }

  try {
    const rows = await fetchTradingViewSymbolSearch(text);
    const results = mapSearchRowsToStocks(
      rows.filter((row) => String(row?.exchange || '').toUpperCase() === 'NSE'),
      (row) => {
        const displaySymbol = String(row?.symbol || '').trim().toUpperCase();
        if (!displaySymbol) {
          return null;
        }

        const item = sanitizeTrackedStock({
          symbol: `${displaySymbol}.NS`,
          name: String(row?.description || displaySymbol).trim() || displaySymbol
        });

        if (!item) {
          return null;
        }

        return {
          key: item.key,
          symbol: item.symbol,
          name: item.name,
          displaySymbol
        };
      }
    );

    if (results.length > 0) {
      return results;
    }
  } catch (_error) {
    // Fall through to Yahoo search when TradingView rejects the request.
  }

  const yahooRows = await fetchYahooSymbolSearch(text);
  return mapSearchRowsToStocks(
    yahooRows.filter((row) => String(row?.exchange || '').toUpperCase().includes('NSI')),
    (row) => {
      const rawSymbol = String(row?.symbol || '').trim().toUpperCase();
      if (!rawSymbol.endsWith('.NS')) {
        return null;
      }

      const displaySymbol = rawSymbol.replace(/\.NS$/i, '');
      const item = sanitizeTrackedStock({
        symbol: rawSymbol,
        name: String(row?.shortname || row?.longname || displaySymbol).trim() || displaySymbol
      });

      if (!item) {
        return null;
      }

      return {
        key: item.key,
        symbol: item.symbol,
        name: item.name,
        displaySymbol
      };
    }
  );
}

function buildTradingViewCandidates(config, searchRows) {
  const base = Array.isArray(config.tradingviewSymbols) ? [...config.tradingviewSymbols] : [];

  for (const row of searchRows) {
    const exchange = row?.exchange;
    const symbol = row?.symbol;
    const fullName = row?.full_name;

    if (typeof fullName === 'string' && fullName.includes(':')) {
      base.push(fullName.toUpperCase());
    }

    if (typeof exchange === 'string' && typeof symbol === 'string') {
      base.push(`${exchange.toUpperCase()}:${symbol.toUpperCase()}`);
    }
  }

  return [...new Set(base)];
}

function isGiftNiftyTicker(ticker) {
  const value = String(ticker || '').toUpperCase();
  return value.includes('GIFT') || value.includes('GIFNIFTY');
}

function isGiftNiftyFallbackTicker(ticker) {
  const value = String(ticker || '').toUpperCase();
  return value.includes('NIFTY1!') || value.includes('IN1!');
}

async function scanTradingViewTicker(scanEndpoint, ticker) {
  const response = await fetch(scanEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      symbols: {
        tickers: [ticker],
        query: { types: [] }
      },
      columns: ['close', 'change', 'change_abs']
    })
  });

  if (!response.ok) {
    throw new Error(`${scanEndpoint} ${ticker}: ${response.status}`);
  }

  const payload = await response.json();
  const row = payload?.data?.[0];
  const values = row?.d;

  const close = values?.[0];
  const changePercent = values?.[1];
  const changeAbs = values?.[2];

  if (
    typeof close !== 'number' ||
    typeof changeAbs !== 'number' ||
    typeof changePercent !== 'number'
  ) {
    throw new Error(`TradingView missing values for ${ticker}`);
  }

  return {
    price: close,
    change: changeAbs,
    changePercent
  };
}

async function fetchGiftNiftyFromTradingView(config) {
  const queries = ['gift nifty', 'giftnifty'];
  const searchRows = [];

  for (const query of queries) {
    try {
      const rows = await fetchTradingViewSymbolSearch(query);
      searchRows.push(...rows);
    } catch (_error) {
      // Ignore individual search failures and continue with static candidates.
    }
  }

  const allCandidates = buildTradingViewCandidates(config, searchRows);
  const primaryCandidates = allCandidates.filter(isGiftNiftyTicker);
  const fallbackCandidates = allCandidates.filter(
    (ticker) => !isGiftNiftyTicker(ticker) && isGiftNiftyFallbackTicker(ticker)
  );
  const candidates = [...primaryCandidates, ...fallbackCandidates];
  const scanEndpoints = [
    'https://scanner.tradingview.com/india/scan',
    'https://scanner.tradingview.com/global/scan'
  ];

  let lastError = null;

  for (const ticker of candidates) {
    for (const endpoint of scanEndpoints) {
      try {
        const scanned = await scanTradingViewTicker(endpoint, ticker);
        const previousClose = scanned.price - scanned.change;

        return {
          symbol: ticker,
          name: config.name,
          price: scanned.price,
          previousClose,
          change: scanned.change,
          changePercent: scanned.changePercent,
          currency: '',
          exchangeName: 'TradingView'
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw new Error(lastError?.message || 'Failed to fetch Gift Nifty from TradingView');
}

async function fetchIndexByConfig(config) {
  if (config.source === 'tradingview') {
    return fetchGiftNiftyFromTradingView(config);
  }

  return fetchIndexFromYahoo(config.symbol, config.name);
}

async function shouldThrottleRefresh(force = false) {
  if (force) {
    return false;
  }

  const storage = await chrome.storage.local.get([LAST_UPDATED_KEY]);
  const lastUpdated = Number(storage[LAST_UPDATED_KEY] || 0);
  if (!lastUpdated) {
    return false;
  }

  const ist = getIstDateParts();
  const us = getZonedDateParts(US_TIMEZONE);
  const isIndiaHoliday = Boolean(getNseHolidayName(ist.dateKey));
  const isIndiaWeekend = isWeekend(ist.weekday);

  const indiaActive = !isIndiaHoliday && !isIndiaWeekend && isIndiaMarketHours(ist.minutesSinceMidnight);
  const stocksActive = indiaActive;
  const globalActive = !isWeekend(us.weekday) && isUsMarketHours(us.minutesSinceMidnight);
  const giftActive = isGiftNiftyWorkingHours(ist);

  const anyActiveMarket = indiaActive || stocksActive || globalActive || giftActive;
  if (anyActiveMarket) {
    return false;
  }

  const ageMs = Date.now() - lastUpdated;
  return ageMs < OFF_HOURS_REFRESH_MS;
}

async function refreshMarketData(options = {}) {
  const force = Boolean(options.force);
  if (await shouldThrottleRefresh(force)) {
    return;
  }

  const trackedStocks = await getTrackedStocks();
  const priceAlerts = await getPriceAlerts();
  const stockUniverse = [
    ...trackedStocks,
    ...priceAlerts.map((alert) => ({ key: alert.key, symbol: alert.symbol, name: alert.name }))
  ];
  const indexEntries = Object.entries(INDEX_CONFIG);
  const stockEntries = Object.entries(buildStockConfig(stockUniverse));

  const [indexResults, stockResults] = await Promise.all([
    Promise.all(
      indexEntries.map(async ([key, config]) => {
        try {
          const data = await fetchIndexByConfig(config);
          return { ok: true, key, market: config.market, data, optional: Boolean(config.optional) };
        } catch (error) {
          return {
            ok: false,
            key,
            market: config.market,
            error: error?.message || 'Unknown fetch error',
            optional: Boolean(config.optional)
          };
        }
      })
    ),
    Promise.all(
      stockEntries.map(async ([key, config]) => {
        try {
          const data = await fetchIndexFromYahoo(config.symbol, config.name);
          return { ok: true, key, data };
        } catch (error) {
          return { ok: false, key, error: error?.message || 'Unknown fetch error' };
        }
      })
    )
  ]);

  const marketData = {
    india: {},
    global: {},
    stocks: {}
  };

  const nonOptionalErrors = [];
  for (const result of indexResults) {
    if (result.ok) {
      marketData[result.market][result.key] = result.data;
    } else if (!result.optional) {
      nonOptionalErrors.push(result.error);
    }
  }

  for (const stockResult of stockResults) {
    if (stockResult.ok) {
      marketData.stocks[stockResult.key] = stockResult.data;
    }
  }

  const hasAnyData =
    Object.keys(marketData.india).length > 0 ||
    Object.keys(marketData.global).length > 0 ||
    Object.keys(marketData.stocks).length > 0;

  if (!hasAnyData) {
    await chrome.storage.local.set({
      lastError: nonOptionalErrors[0] || 'Failed to refresh market data'
    });
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Market Tracker - data error' });
    return;
  }

  const now = Date.now();
  await chrome.storage.local.set({
    [STORAGE_KEY]: marketData,
    [LAST_UPDATED_KEY]: now,
    lastError: nonOptionalErrors.length > 0 ? `Partial update: ${nonOptionalErrors[0]}` : null
  });

  updateBadge(marketData);
  // Price alerts are checked on their own alarm to avoid being throttled by off-hours refresh logic.
}

async function refreshPriceAlertPrices() {
  const alerts = await getPriceAlerts();
  if (alerts.length === 0) {
    return null;
  }

  const uniqueStocks = new Map();
  for (const alert of alerts) {
    uniqueStocks.set(alert.key, { key: alert.key, symbol: alert.symbol, name: alert.name });
  }

  const entries = Array.from(uniqueStocks.values());
  const results = await Promise.all(
    entries.map(async (entry) => {
      try {
        const data = await fetchIndexFromYahoo(entry.symbol, entry.name);
        return { ok: true, key: entry.key, data };
      } catch (error) {
        return { ok: false, key: entry.key, error: error?.message || 'Unknown fetch error' };
      }
    })
  );

  const storage = await chrome.storage.local.get([STORAGE_KEY]);
  const marketData = storage[STORAGE_KEY] || { india: {}, global: {}, stocks: {} };
  const nextStocks = { ...(marketData.stocks || {}) };

  let updated = false;
  for (const result of results) {
    if (result.ok) {
      nextStocks[result.key] = result.data;
      updated = true;
    }
  }

  if (!updated) {
    return null;
  }

  const nextMarketData = { ...marketData, stocks: nextStocks };
  await chrome.storage.local.set({
    [STORAGE_KEY]: nextMarketData,
    [LAST_UPDATED_KEY]: Date.now()
  });

  return nextMarketData;
}

async function runPriceAlertScheduler() {
  await ensureHolidaysCacheLoaded();
  const ist = getIstDateParts();
  const isIndiaHoliday = Boolean(getNseHolidayName(ist.dateKey));
  const isIndiaWeekend = isWeekend(ist.weekday);
  const isTradingHours = !isIndiaHoliday && !isIndiaWeekend && isIndiaMarketHours(ist.minutesSinceMidnight);
  if (!isTradingHours) {
    return;
  }

  const marketData = await refreshPriceAlertPrices();
  if (!marketData) {
    return;
  }

  await runPriceAlertChecks(marketData);
}


async function runPriceAlertChecks(marketData) {
  const alerts = await getPriceAlerts();
  if (alerts.length === 0) {
    return;
  }

  const storage = await chrome.storage.local.get([PRICE_ALERT_STATES_KEY]);
  const states = storage[PRICE_ALERT_STATES_KEY] || {};
  let changed = false;
  const now = Date.now();

  for (const alert of alerts) {
    const stockData = marketData?.stocks?.[alert.key];
    if (!stockData || typeof stockData.price !== 'number') {
      continue;
    }

    const state = states[alert.id] || {};
    const isBuy = alert.type === 'buy';

    let isNear = false;
    let isTargetMet = false;

    if (isBuy) {
      const nearUpperBound = alert.threshold * (1 + PRICE_ALERT_NEAR_PERCENT / 100);
      isNear = stockData.price <= nearUpperBound;
      isTargetMet = stockData.price <= alert.threshold;
    } else {
      const nearLowerBound = alert.threshold * (1 - PRICE_ALERT_NEAR_PERCENT / 100);
      isNear = stockData.price >= nearLowerBound;
      isTargetMet = stockData.price >= alert.threshold;
    }

    const wasNear = Boolean(state.near);
    const lastTargetNotifiedAt = Number(state.lastTargetNotifiedAt || 0);
    const shouldRepeatTarget =
      isTargetMet && (!lastTargetNotifiedAt || now - lastTargetNotifiedAt >= PRICE_ALERT_REPEAT_MS);

    if (isTargetMet && shouldRepeatTarget) {
      await sendPriceAlert({
        id: `price-alert-${alert.id}-${Date.now()}`,
        title: 'Market Tracker - Price Alert',
        message: `${alert.name}: ${formatPrice(stockData.price)} reached target ${formatPrice(alert.threshold)} (${alert.type.toUpperCase()})`
      });
    } else if (isNear && !wasNear) {
      await sendPriceAlert({
        id: `price-alert-near-${alert.id}-${Date.now()}`,
        title: 'Market Tracker - Near Price Alert',
        message: `${alert.name}: ${formatPrice(stockData.price)} is near target ${formatPrice(alert.threshold)} (${alert.type.toUpperCase()})`
      });
    }

    if (isNear || state.near || state.targetMet) {
      states[alert.id] = {
        near: isNear,
        targetMet: isTargetMet,
        lastPrice: stockData.price,
        lastNearNotifiedAt: isNear && !wasNear ? now : state.lastNearNotifiedAt || null,
        lastTargetNotifiedAt: shouldRepeatTarget ? now : state.lastTargetNotifiedAt || null
      };
      changed = true;
    }
  }

  if (changed) {
    await chrome.storage.local.set({ [PRICE_ALERT_STATES_KEY]: states });
  }
}
function updateBadge(marketData) {
  const nifty = marketData?.india?.nifty;
  if (!nifty) {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'Market Tracker' });
    return;
  }

  chrome.action.setBadgeText({ text: '' });

  const direction = nifty.change > 0 ? 'up' : nifty.change < 0 ? 'down' : 'flat';
  chrome.action.setTitle({ title: `Market Tracker - Nifty ${direction}` });
}

function getIstDateParts(now = new Date()) {
  const offsetMs = IST_OFFSET_MINUTES * 60 * 1000;
  const ist = new Date(now.getTime() + offsetMs);

  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');

  return {
    dateKey: `${year}-${month}-${day}`,
    weekday: ist.getUTCDay(),
    minutesSinceMidnight: ist.getUTCHours() * 60 + ist.getUTCMinutes()
  };
}

function getZonedDateParts(timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(new Date());
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const weekday = WEEKDAY_MAP[map.weekday] ?? 0;
  const hour = Number(map.hour || 0);
  const minute = Number(map.minute || 0);
  const dateKey = `${map.year}-${map.month}-${map.day}`;

  return {
    weekday,
    minutesSinceMidnight: hour * 60 + minute,
    dateKey
  };
}

function isWeekend(weekday) {
  return weekday === 0 || weekday === 6;
}

function isIndiaMarketHours(minutesSinceMidnight) {
  return minutesSinceMidnight >= OPEN_TIME_MINUTES && minutesSinceMidnight < NIFTY_NOTIFY_CLOSE_MINUTES;
}

function isGiftNiftyWorkingHours(ist) {
  const minutesSinceMidnight = ist.minutesSinceMidnight;
  const session1 = minutesSinceMidnight >= (6 * 60 + 30) && minutesSinceMidnight < (15 * 60 + 40);
  const session2Part1 = minutesSinceMidnight >= (16 * 60 + 35);
  const session2Part2 = minutesSinceMidnight < (2 * 60 + 45);

  if (session1 || session2Part1) {
    const isIndiaHoliday = Boolean(getNseHolidayName(ist.dateKey));
    return !isWeekend(ist.weekday) && !isIndiaHoliday;
  }

  if (session2Part2) {
    const [year, month, day] = ist.dateKey.split('-').map(Number);
    const currentDate = new Date(Date.UTC(year, month - 1, day));
    const previousDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);

    const prevYear = previousDate.getUTCFullYear();
    const prevMonth = String(previousDate.getUTCMonth() + 1).padStart(2, '0');
    const prevDay = String(previousDate.getUTCDate()).padStart(2, '0');
    const prevDateKey = `${prevYear}-${prevMonth}-${prevDay}`;
    const prevWeekday = previousDate.getUTCDay();

    const isPrevWeekend = isWeekend(prevWeekday);
    const isPrevHoliday = Boolean(getNseHolidayName(prevDateKey));

    return !isPrevWeekend && !isPrevHoliday;
  }

  return false;
}

function isUsMarketHours(minutesSinceMidnight) {
  return minutesSinceMidnight >= US_OPEN_MINUTES && minutesSinceMidnight < US_CLOSE_MINUTES;
}

async function sendAlert({ id, title, message }) {
  const settings = await chrome.storage.local.get([NOTIFICATIONS_PAUSED_KEY]);
  if (settings[NOTIFICATIONS_PAUSED_KEY]) {
    return { ok: true, skipped: 'paused' };
  }

  try {
    const createdId = await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      priority: 2,
      requireInteraction: false,
      silent: false
    });

    const notificationId = createdId || id;

    return { ok: true, id: notificationId };
  } catch (error) {
    return { ok: false, error: error?.message || 'Unknown notification error' };
  }
}

async function sendPriceAlert({ id, title, message }) {
  try {
    const createdId = await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title,
      message,
      // Keep separate from market/index alerts, but avoid drowning out other notifications.
      priority: 1,
      requireInteraction: false,
      silent: false
    });

    const notificationId = createdId || id;

    return { ok: true, id: notificationId };
  } catch (error) {
    return { ok: false, error: error?.message || 'Unknown price notification error' };
  }
}

function formatPrice(value) {
  return Number(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatSigned(value) {
  const num = Number(value ?? 0);
  const abs = Math.abs(num).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (num > 0) {
    return `+${abs}`;
  }

  if (num < 0) {
    return `-${abs}`;
  }

  return abs;
}

function formatPercent(value) {
  const num = Number(value ?? 0);
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}${Math.abs(num).toFixed(2)}%`;
}

function formatIndexLine(label, indexData) {
  if (!indexData) {
    return `${label}: NA`;
  }

  return `${label}: ${formatPrice(indexData.price)} ${formatSigned(indexData.change)}(${formatPercent(indexData.changePercent)})`;
}

function formatStockMoverLine(stock) {
  const pct = Number(stock.data.changePercent || 0);
  const sign = pct > 0 ? '+' : pct < 0 ? '-' : '';
  return `${stock.label} ${sign}${Math.abs(pct).toFixed(2)}%`;
}

function buildStockMoverMessages(stocks) {
  const movers = Object.entries(stocks || {})
    .map(([key, data]) => ({ key, data, label: data?.name || key.toUpperCase() }))
    .filter((item) => Number.isFinite(Number(item.data?.changePercent)));

  const negatives = movers
    .filter((item) => Number(item.data.changePercent) <= -STOCK_MOVER_THRESHOLD_PERCENT)
    .sort((a, b) => Number(a.data.changePercent) - Number(b.data.changePercent))
    .slice(0, 10)
    .map(formatStockMoverLine);

  const positives = movers
    .filter((item) => Number(item.data.changePercent) >= STOCK_MOVER_THRESHOLD_PERCENT)
    .sort((a, b) => Number(b.data.changePercent) - Number(a.data.changePercent))
    .slice(0, 10)
    .map(formatStockMoverLine);

  return {
    negatives: negatives.length > 0 ? negatives.join('\n') : null,
    positives: positives.length > 0 ? positives.join('\n') : null
  };
}

function getOpenAlertMessage(minutesNow) {
  if (minutesNow === OPEN_TIME_MINUTES) {
    return 'Market opens now (9:15 AM IST).';
  }

  const remaining = OPEN_TIME_MINUTES - minutesNow;
  const suffix = remaining === 1 ? '' : 's';
  return `Market opens in ${remaining} minute${suffix} (9:15 AM IST).`;
}

function getCloseAlertMessage(minutesNow) {
  if (minutesNow === CLOSE_TIME_MINUTES) {
    return 'Market closes now (3:30 PM IST).';
  }

  const remaining = CLOSE_TIME_MINUTES - minutesNow;
  const suffix = remaining === 1 ? '' : 's';
  return `Market closes in ${remaining} minute${suffix} (3:30 PM IST).`;
}

function buildAlertForMinute(nowParts) {
  const minutesNow = nowParts.minutesSinceMidnight;

  if (minutesNow >= OPEN_COUNTDOWN_START_MINUTES && minutesNow <= OPEN_TIME_MINUTES) {
    return {
      key: `open-${nowParts.dateKey}-${minutesNow}`,
      id: `open-alert-${nowParts.dateKey}-${minutesNow}`,
      title: 'Market Tracker',
      message: getOpenAlertMessage(minutesNow)
    };
  }

  if (minutesNow >= CLOSE_COUNTDOWN_START_MINUTES && minutesNow <= CLOSE_TIME_MINUTES) {
    return {
      key: `close-${nowParts.dateKey}-${minutesNow}`,
      id: `close-alert-${nowParts.dateKey}-${minutesNow}`,
      title: 'Market Tracker',
      message: getCloseAlertMessage(minutesNow)
    };
  }

  return null;
}

async function checkMarketAlerts() {
  await ensureHolidaysCacheLoaded();
  const nowParts = getIstDateParts();
  const holidayName = getNseHolidayName(nowParts.dateKey);
  if (isWeekend(nowParts.weekday) || holidayName) {
    return;
  }

  const alertPayload = buildAlertForMinute(nowParts);
  if (!alertPayload) {
    return;
  }

  const storage = await chrome.storage.local.get([LAST_ALERT_KEY]);
  if (storage[LAST_ALERT_KEY] === alertPayload.key) {
    return;
  }

  await sendAlert(alertPayload);
  await chrome.storage.local.set({
    [LAST_ALERT_KEY]: alertPayload.key
  });
}

async function runIndexNotificationScheduler() {
  await ensureHolidaysCacheLoaded();
  const now = Date.now();
  let storage = await chrome.storage.local.get([STORAGE_KEY, LAST_INDEX_NOTIFY_KEY]);
  let marketData = storage[STORAGE_KEY];

  if (!marketData) {
    await refreshMarketData();
    storage = await chrome.storage.local.get([STORAGE_KEY, LAST_INDEX_NOTIFY_KEY]);
    marketData = storage[STORAGE_KEY];
  }

  if (!marketData) {
    return;
  }

  const buckets = storage[LAST_INDEX_NOTIFY_KEY] || {};
  let bucketsUpdated = false;

  const maybeSendByInterval = async (channel, intervalMinutes, title, message, offsetMinutes = 0) => {
    const shiftedNow = now - offsetMinutes * 60 * 1000;
    const bucket = Math.floor(shiftedNow / (intervalMinutes * 60 * 1000));
    if (buckets[channel] === bucket) {
      return;
    }

    await sendAlert({
      id: `${channel}-${bucket}`,
      title,
      message
    });

    buckets[channel] = bucket;
    bucketsUpdated = true;
  };

  const ist = getIstDateParts();
  const isIndiaHoliday = Boolean(getNseHolidayName(ist.dateKey));
  const isIndiaWeekend = isWeekend(ist.weekday);
  const nifty = marketData?.india?.nifty;
  const giftNifty = marketData?.india?.giftNifty;

  const niftyMarketHours = !isIndiaHoliday && !isIndiaWeekend && isIndiaMarketHours(ist.minutesSinceMidnight);
  const giftWorkingHours = isGiftNiftyWorkingHours(ist);

  const isIndiaActive = niftyMarketHours || giftWorkingHours;

  if (isIndiaActive && !isIndiaHoliday && !isIndiaWeekend && (nifty || giftNifty)) {
    const giftLine = niftyMarketHours
      ? formatIndexLine('Sensex', marketData?.india?.sensex)
      : formatIndexLine('Gift Nifty', giftNifty);

    const indiaMessage = [
      formatIndexLine('Nifty 50', nifty),
      giftLine
    ].join('\n');

    await maybeSendByInterval(
      'india-combined',
      INDIA_MARKET_INTERVAL_MINUTES,
      'Market Tracker - India',
      indiaMessage,
      0
    );
  }

  const us = getZonedDateParts(US_TIMEZONE);
  const usInterval =
    !isWeekend(us.weekday) && isUsMarketHours(us.minutesSinceMidnight)
      ? US_MARKET_INTERVAL_MINUTES
      : US_OFF_INTERVAL_MINUTES;

  const dow = marketData?.global?.dowJones;
  const sp500 = marketData?.global?.sp500;
  const nasdaq100 = marketData?.global?.nasdaq;

  const isUsHolidayOrWeekend = isWeekend(us.weekday) || isUsHoliday(us.dateKey);

  if (!isUsHolidayOrWeekend && (dow || sp500 || nasdaq100)) {
    const usMessage = [
      formatIndexLine('Dow Jones', dow),
      formatIndexLine('S&P 500', sp500),
      formatIndexLine('Nasdaq 100', nasdaq100)
    ].join('\n');

    await maybeSendByInterval(
      'us-composite',
      usInterval,
      'Market Tracker - US Indices',
      usMessage,
      3
    );
  }

  if (niftyMarketHours) {
    const moverMessages = buildStockMoverMessages(marketData?.stocks || {});

    if (moverMessages.negatives) {
      await maybeSendByInterval(
        'india-stock-movers-neg',
        STOCK_MOVER_INTERVAL_MINUTES,
        'Market Tracker - Top Negative (>1%)',
        moverMessages.negatives,
        6
      );
    }

    if (moverMessages.positives) {
      await maybeSendByInterval(
        'india-stock-movers-pos',
        STOCK_MOVER_INTERVAL_MINUTES,
        'Market Tracker - Top Positive (>1%)',
        moverMessages.positives,
        7
      );
    }
  }

  if (bucketsUpdated) {
    await chrome.storage.local.set({
      [LAST_INDEX_NOTIFY_KEY]: buckets
    });
  }
}

function ensureAlarms() {
  chrome.alarms.create('refreshMarketData', {
    periodInMinutes: REFRESH_MINUTES
  });

  chrome.alarms.create('checkMarketAlerts', {
    periodInMinutes: ALERT_CHECK_MINUTES
  });

  chrome.alarms.create('indexNotifyScheduler', {
    periodInMinutes: INDEX_NOTIFY_SCHEDULER_MINUTES
  });

  chrome.alarms.create('priceAlertScheduler', {
    periodInMinutes: 1
  });

  chrome.alarms.create('priceAlertApiSyncScheduler', {
    periodInMinutes: 1
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  ensureAlarms();
  await initializeHolidaysCache();
  await getTrackedStocks();
  await getPriceAlerts();
  await refreshMarketData();
  await checkMarketAlerts();
  await runIndexNotificationScheduler();
});

chrome.runtime.onStartup.addListener(() => {
  ensureAlarms();
  initializeHolidaysCache();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshMarketData') {
    refreshMarketData({ force: false });
  }

  if (alarm.name === 'checkMarketAlerts') {
    checkMarketAlerts();
  }

  if (alarm.name === 'indexNotifyScheduler') {
    runIndexNotificationScheduler();
  }

  if (alarm.name === 'priceAlertScheduler') {
    runPriceAlertScheduler();
  }

  if (alarm.name === 'priceAlertApiSyncScheduler') {
    runPriceAlertApiSyncScheduler();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'refresh-now') {
    refreshMarketData({ force: true })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error?.message }));

    return true;
  }

  if (message?.type === 'search-stocks') {
    searchNseStocks(message.query)
      .then((results) => sendResponse({ ok: true, results }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Search failed' }));

    return true;
  }

  if (message?.type === 'add-stock') {
    addTrackedStock(message.stock)
      .then(() => refreshMarketData({ force: true }))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Failed to add stock' }));

    return true;
  }

  if (message?.type === 'remove-stock') {
    removeTrackedStock(message.key)
      .then(() => refreshMarketData({ force: true }))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Failed to remove stock' }));

    return true;
  }

  if (message?.type === 'upsert-price-alert') {
    upsertPriceAlert(message.alert)
      .then(() => refreshMarketData({ force: true }))
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Failed to save alert' }));

    return true;
  }

  if (message?.type === 'remove-price-alert') {
    removePriceAlert(message.id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Failed to remove alert' }));

    return true;
  }

  if (message?.type === 'reset-price-alert') {
    resetPriceAlert(message.id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Failed to reset alert' }));

    return true;
  }

  if (message?.type === 'sync-price-alerts-api') {
    syncPriceAlertsFromApi({ force: true })
      .then((result) => sendResponse({ ok: true, count: result.count || 0 }))
      .catch((error) => sendResponse({ ok: false, error: error?.message || 'Failed to sync price alerts' }));

    return true;
  }

  return false;
});










