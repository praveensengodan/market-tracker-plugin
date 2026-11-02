import { getNseHolidayName, ensureHolidaysCacheLoaded } from './holidaysManager.js';

const STORAGE_KEY = 'marketData';
const LAST_UPDATED_KEY = 'lastUpdatedAt';
const NOTIFICATIONS_PAUSED_KEY = 'notificationsPaused';
const TRACKED_STOCKS_KEY = 'trackedStocks';
const TRACKED_US_STOCKS_KEY = 'trackedUsStocks';
const PRICE_ALERTS_KEY = 'priceAlerts';
const US_PRICE_ALERTS_KEY = 'usPriceAlerts';
const POPUP_REFRESH_INTERVAL_MS = 10000;
const TIMER_REFRESH_INTERVAL_MS = 1000;

const IST_OFFSET_MINUTES = 330;
const US_TIMEZONE = 'America/New_York';
const PRE_OPEN_MINUTES = 9 * 60;
const MARKET_OPEN_MINUTES = 9 * 60 + 15;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const US_OPEN_MINUTES = 9 * 60 + 30;
const US_CLOSE_MINUTES = 16 * 60;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const US_HOLIDAYS = {
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

const DEFAULT_TRACKED_US_STOCKS = [
  { key: 'aapl', symbol: 'AAPL', name: 'Apple Inc.' },
  { key: 'msft', symbol: 'MSFT', name: 'Microsoft Corporation' },
  { key: 'nvda', symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { key: 'googl', symbol: 'GOOGL', name: 'Alphabet Inc. (Google)' },
  { key: 'amzn', symbol: 'AMZN', name: 'Amazon.com, Inc.' },
  { key: 'tsla', symbol: 'TSLA', name: 'Tesla, Inc.' },
  { key: 'meta', symbol: 'META', name: 'Meta Platforms, Inc.' }
];

const elements = {
  refreshBtn: document.getElementById('refreshBtn'),
  statusText: document.getElementById('statusText'),
  indiaMarketStatus: document.getElementById('indiaMarketStatus'),
  usMarketStatus: document.getElementById('usMarketStatus'),
  marketPhase: document.getElementById('marketPhase'),
  nextEventLabel: document.getElementById('nextEventLabel'),
  nextEventTimer: document.getElementById('nextEventTimer'),
  usMarketPhase: document.getElementById('usMarketPhase'),
  usNextEventLabel: document.getElementById('usNextEventLabel'),
  usNextEventTimer: document.getElementById('usNextEventTimer'),
  stocksList: document.getElementById('stocksList'),
  usStocksList: document.getElementById('usStocksList'),
  indiaStockCountBadge: document.getElementById('indiaStockCountBadge'),
  usStockCountBadge: document.getElementById('usStockCountBadge'),
  indiaStockFilters: document.getElementById('indiaStockFilters'),
  usStockFilters: document.getElementById('usStockFilters'),
  notifToggleSelect: document.getElementById('notifToggleSelect'),
  stockSort: document.getElementById('stockSort'),
  stockSearchInput: document.getElementById('stockSearchInput'),
  clearStockSearchBtn: document.getElementById('clearStockSearchBtn'),
  stockSearchResults: document.getElementById('stockSearchResults'),
  usStockSort: document.getElementById('usStockSort'),
  usStockSearchInput: document.getElementById('usStockSearchInput'),
  clearUsStockSearchBtn: document.getElementById('clearUsStockSearchBtn'),
  usStockSearchResults: document.getElementById('usStockSearchResults'),
  syncApiAlertsBtn: document.getElementById('syncApiAlertsBtn'),
  syncUsApiAlertsBtn: document.getElementById('syncUsApiAlertsBtn'),
  resetStorageBtn: document.getElementById('resetStorageBtn'),
  niftyPrice: document.getElementById('niftyPrice'),
  niftyDelta: document.getElementById('niftyDelta'),
  bankNiftyPrice: document.getElementById('bankNiftyPrice'),
  bankNiftyDelta: document.getElementById('bankNiftyDelta'),
  giftNiftyPrice: document.getElementById('giftNiftyPrice'),
  giftNiftyDelta: document.getElementById('giftNiftyDelta'),
  sensexPrice: document.getElementById('sensexPrice'),
  sensexDelta: document.getElementById('sensexDelta'),
  sp500Price: document.getElementById('sp500Price'),
  sp500Delta: document.getElementById('sp500Delta'),
  dowJonesPrice: document.getElementById('dowJonesPrice'),
  dowJonesDelta: document.getElementById('dowJonesDelta'),
  nasdaqPrice: document.getElementById('nasdaqPrice'),
  nasdaqDelta: document.getElementById('nasdaqDelta'),
  ftse100Price: document.getElementById('ftse100Price'),
  ftse100Delta: document.getElementById('ftse100Delta'),
  nikkei225Price: document.getElementById('nikkei225Price'),
  nikkei225Delta: document.getElementById('nikkei225Delta')
};

const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const innerTabButtons = Array.from(document.querySelectorAll('.inner-tab-btn'));
const tabPanels = {
  india: document.getElementById('tab-india'),
  global: document.getElementById('tab-global'),
  stocks: document.getElementById('tab-stocks')
};
const innerTabPanels = {
  tracker: document.getElementById('inner-tab-tracker'),
  'us-tracker': document.getElementById('inner-tab-us-tracker')
};

const lastRenderedPrices = {};
let currentActiveTab = 'india';
let currentInnerActiveTab = 'tracker';
let lastUpdatedTimestamp = null;
let lastErrorState = null;
let refreshInFlight = false;
let currentStockSort = 'changeAsc';
let currentUsStockSort = 'changeAsc';
let currentIndiaFilter = 'all';
let currentUsFilter = 'all';
let trackedStocks = cloneList(DEFAULT_TRACKED_STOCKS);
let trackedUsStocks = cloneList(DEFAULT_TRACKED_US_STOCKS);
let priceAlerts = [];
let usPriceAlerts = [];
let stockSearchResultsState = [];
let usStockSearchResultsState = [];
let searchRequestId = 0;
let searchDebounceTimer = null;
let usSearchRequestId = 0;
let usSearchDebounceTimer = null;
let latestMarketStocks = {};
let openAlertEditors = new Set();
let openUsAlertEditors = new Set();

function isKnownUsStockKey(key) {
  const normKey = String(key || '').trim().toLowerCase().replace(/\.ns$/i, '').replace(/[^a-z0-9]+/g, '');
  return ['coreweave', 'crwv', 'aapl', 'msft', 'nvda', 'googl', 'goog', 'amzn', 'tsla', 'meta', 'nflx', 'amd', 'pltr', 'intc', 'avgo', 'qcom', 'orcl', 'crm', 'adbe', 'pypl', 'coin', 'uber', 'arm', 'smci', 'baba'].includes(normKey);
}

function cloneList(items) {
  return items.map((item) => ({ ...item }));
}

function getAlertSourceRank(source) {
  return String(source || '').includes('api') ? 2 : 1;
}

function dedupePriceAlerts(alerts) {
  const byKey = new Map();
  for (const alert of alerts || []) {
    if (!alert?.key || isKnownUsStockKey(alert.key) || isKnownUsStockKey(alert.symbol) || isKnownUsStockKey(alert.name)) {
      continue;
    }

    const existing = byKey.get(alert.key);
    if (!existing || getAlertSourceRank(alert.source) >= getAlertSourceRank(existing.source)) {
      byKey.set(alert.key, alert);
    }
  }

  return Array.from(byKey.values());
}

function dedupeUsPriceAlerts(alerts) {
  const byKey = new Map();
  for (const alert of alerts || []) {
    if (!alert?.key) {
      continue;
    }

    const existing = byKey.get(alert.key);
    if (!existing || getAlertSourceRank(alert.source) >= getAlertSourceRank(existing.source)) {
      byKey.set(alert.key, alert);
    }
  }

  return Array.from(byKey.values());
}

function formatPrice(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
}

function formatDelta(change, changePercent) {
  const sign = change > 0 ? '+' : change < 0 ? '' : '';
  const pctSign = changePercent > 0 ? '+' : changePercent < 0 ? '' : '';
  return `${sign}${formatPrice(change)} (${pctSign}${changePercent.toFixed(2)}%)`;
}

function paintDelta(element, change) {
  element.classList.remove('up', 'down', 'flat');
  if (change > 0) {
    element.classList.add('up');
  } else if (change < 0) {
    element.classList.add('down');
  } else {
    element.classList.add('flat');
  }
}

function animateValueChange(priceEl, deltaEl, direction) {
  const classes = ['pulse-up', 'pulse-down', 'pulse-flat'];
  priceEl.classList.remove(...classes);
  deltaEl.classList.remove(...classes);
  void priceEl.offsetWidth;

  const cls = direction > 0 ? 'pulse-up' : direction < 0 ? 'pulse-down' : 'pulse-flat';
  priceEl.classList.add(cls);
  deltaEl.classList.add(cls);
}

function renderIndex(indexKey, priceEl, deltaEl, indexData) {
  if (!indexData || !priceEl || !deltaEl) {
    return;
  }

  const previous = lastRenderedPrices[indexKey];
  const current = indexData.price;

  if (typeof previous === 'number' && Math.abs(previous - current) > 0.0001) {
    animateValueChange(priceEl, deltaEl, current - previous);
  }

  lastRenderedPrices[indexKey] = current;
  priceEl.textContent = formatPrice(current);
  deltaEl.textContent = formatDelta(indexData.change, indexData.changePercent);
  paintDelta(deltaEl, indexData.change);
}

function getTradingViewStockUrl(symbol) {
  const sym = String(symbol || '').toUpperCase();
  if (sym.endsWith('.NS')) {
    const baseSymbol = sym.replace(/\.NS$/i, '');
    return `https://in.tradingview.com/symbols/NSE-${baseSymbol}/`;
  }
  return `https://www.tradingview.com/symbols/${encodeURIComponent(sym)}/`;
}

function getTrackedStockByKey(key) {
  return trackedStocks.find((stock) => stock.key === key) || null;
}

function getTrackedUsStockByKey(key) {
  return trackedUsStocks.find((stock) => stock.key === key) || null;
}

function getPriceAlertById(id) {
  return priceAlerts.find((alert) => alert.id === id) || null;
}

function filterStockEntries(entries, filterType, isUs = false) {
  if (filterType === 'alerts') {
    return entries.filter((s) => isUs ? getUsStockPriceAlert(s.key) : getStockPriceAlert(s.key));
  }
  if (filterType === 'near') {
    return entries.filter((s) => {
      const alert = isUs ? getUsStockPriceAlert(s.key) : getStockPriceAlert(s.key);
      if (!alert) return false;
      const livePrice = latestMarketStocks[s.key]?.price;
      const status = getAlertStatusMeta(livePrice, alert.threshold, alert.type || 'buy');
      return status.className === 'near' || status.className === 'met';
    });
  }
  if (filterType === 'gainers') {
    return entries.filter((s) => Number(latestMarketStocks[s.key]?.changePercent) > 0);
  }
  if (filterType === 'losers') {
    return entries.filter((s) => Number(latestMarketStocks[s.key]?.changePercent) < 0);
  }
  return entries;
}

function getSortedStockEntries(stocks) {
  let entries = filterStockEntries([...trackedStocks], currentIndiaFilter, false);

  if (currentStockSort === 'changeAsc') {
    entries.sort((a, b) => {
      const aPct = Number(stocks[a.key]?.changePercent);
      const bPct = Number(stocks[b.key]?.changePercent);
      const aVal = Number.isFinite(aPct) ? aPct : Number.POSITIVE_INFINITY;
      const bVal = Number.isFinite(bPct) ? bPct : Number.POSITIVE_INFINITY;
      return aVal - bVal;
    });
    return entries;
  }

  if (currentStockSort === 'changeDesc') {
    entries.sort((a, b) => {
      const aPct = Number(stocks[a.key]?.changePercent);
      const bPct = Number(stocks[b.key]?.changePercent);
      const aVal = Number.isFinite(aPct) ? aPct : Number.NEGATIVE_INFINITY;
      const bVal = Number.isFinite(bPct) ? bPct : Number.NEGATIVE_INFINITY;
      return bVal - aVal;
    });
    return entries;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

function getSortedUsStockEntries(stocks) {
  let entries = filterStockEntries([...trackedUsStocks], currentUsFilter, true);

  if (currentUsStockSort === 'changeAsc') {
    entries.sort((a, b) => {
      const aPct = Number(stocks[a.key]?.changePercent);
      const bPct = Number(stocks[b.key]?.changePercent);
      const aVal = Number.isFinite(aPct) ? aPct : Number.POSITIVE_INFINITY;
      const bVal = Number.isFinite(bPct) ? bPct : Number.POSITIVE_INFINITY;
      return aVal - bVal;
    });
    return entries;
  }

  if (currentUsStockSort === 'changeDesc') {
    entries.sort((a, b) => {
      const aPct = Number(stocks[a.key]?.changePercent);
      const bPct = Number(stocks[b.key]?.changePercent);
      const aVal = Number.isFinite(aPct) ? aPct : Number.NEGATIVE_INFINITY;
      const bVal = Number.isFinite(bPct) ? bPct : Number.NEGATIVE_INFINITY;
      return bVal - aVal;
    });
    return entries;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}

function getStockPriceAlert(stockKey) {
  return priceAlerts.find((alert) => alert.key === stockKey) || null;
}

function getAlertStatusMeta(currentPrice, threshold, type = 'buy') {
  if (typeof currentPrice !== 'number') {
    return { label: 'No live price', className: 'unknown' };
  }

  const isBuy = type === 'buy';
  if (isBuy) {
    if (currentPrice <= threshold) {
      return { label: 'Target reached', className: 'met' };
    }
    if (currentPrice <= threshold * 1.02) {
      return { label: 'Near target', className: 'near' };
    }
  } else {
    if (currentPrice >= threshold) {
      return { label: 'Target reached', className: 'met' };
    }
    if (currentPrice >= threshold * 0.98) {
      return { label: 'Near target', className: 'near' };
    }
  }

  return { label: 'Waiting', className: 'waiting' };
}

function upsertStockRow(stock) {
  let row = elements.stocksList.querySelector(`[data-stock="${stock.key}"]`);

  if (!row) {
    row = document.createElement('article');
    row.className = 'stock-row';
    row.dataset.stock = stock.key;
    row.innerHTML = `
      <div class="stock-row-top">
        <div class="stock-main">
          <a class="stock-link" target="_blank" rel="noreferrer noopener">
            <div class="stock-name-block">
              <span class="stock-name"></span>
              <span class="stock-symbol"></span>
            </div>
          </a>
        </div>
        <div class="stock-metrics">
          <div class="price">--</div>
          <div class="delta">--</div>
        </div>
        <button type="button" class="stock-remove-btn" aria-label="Remove stock" title="Remove stock">X</button>
      </div>
      <div class="stock-alert-section">
        <button type="button" class="stock-alert-badge-btn" data-key="${stock.key}" title="Click to edit alert">
          <span class="stock-alert-badge-label">+ Alert</span>
        </button>
      </div>
      <div class="stock-alert-editor hidden" data-key="${stock.key}">
        <select class="alert-type-select">
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input class="alert-threshold-input" type="number" min="0" step="0.01" placeholder="Target price" />
        <button type="button" class="alert-save-btn">Save</button>
        <button type="button" class="alert-reset-btn" title="Reset notification repeat state">Reset</button>
        <button type="button" class="alert-clear-btn" title="Clear alert">Clear</button>
      </div>
    `;
    elements.stocksList.appendChild(row);
  }

  row.querySelector('.stock-link').href = getTradingViewStockUrl(stock.symbol);
  row.querySelector('.stock-name').textContent = stock.name;
  row.querySelector('.stock-symbol').textContent = stock.symbol;
  row.querySelector('.stock-remove-btn').dataset.key = stock.key;

  // Update Alert badge & editor state
  const alert = getStockPriceAlert(stock.key);
  const badgeBtn = row.querySelector('.stock-alert-badge-btn');
  const badgeLabel = row.querySelector('.stock-alert-badge-label');
  const editor = row.querySelector('.stock-alert-editor');
  const livePrice = latestMarketStocks[stock.key]?.price;

  badgeBtn.className = 'stock-alert-badge-btn';
  if (alert) {
    const type = alert.type || 'buy';
    const status = getAlertStatusMeta(livePrice, alert.threshold, type);
    badgeBtn.classList.add('has-alert', status.className);
    badgeLabel.innerHTML = `
      <span class="alert-type-chip ${type}">${type.toUpperCase()}</span>
      <span>🎯 ₹${formatPrice(alert.threshold)}</span>
      <span class="alert-status-text">(${status.label})</span>
    `;
    row.querySelector('.alert-type-select').value = type;
    row.querySelector('.alert-threshold-input').value = Number(alert.threshold).toFixed(2);
    row.querySelector('.alert-reset-btn').hidden = false;
    row.querySelector('.alert-clear-btn').hidden = false;
  } else {
    badgeLabel.textContent = '+ Set Alert';
    row.querySelector('.alert-type-select').value = 'buy';
    if (!openAlertEditors.has(stock.key) && typeof livePrice === 'number') {
      row.querySelector('.alert-threshold-input').value = Number(livePrice).toFixed(2);
    }
    row.querySelector('.alert-reset-btn').hidden = true;
    row.querySelector('.alert-clear-btn').hidden = true;
  }

  if (openAlertEditors.has(stock.key)) {
    editor.classList.remove('hidden');
  } else {
    editor.classList.add('hidden');
  }

  return row;
}

function renderStocks(stocks) {
  if (elements.indiaStockCountBadge) {
    elements.indiaStockCountBadge.textContent = String(trackedStocks.length);
  }

  const ordered = getSortedStockEntries(stocks);
  const activeKeys = new Set(ordered.map((stock) => stock.key));

  for (const row of Array.from(elements.stocksList.querySelectorAll('.stock-row'))) {
    if (!activeKeys.has(row.dataset.stock)) {
      row.remove();
    }
  }

  for (const stock of ordered) {
    const row = upsertStockRow(stock);
    renderIndex(`stock-${stock.key}`, row.querySelector('.price'), row.querySelector('.delta'), stocks[stock.key]);
    elements.stocksList.appendChild(row);
  }

  let emptyState = elements.stocksList.querySelector('.stock-empty');
  if (trackedStocks.length === 0) {
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'stock-empty';
      emptyState.textContent = 'No tracked stocks yet. Search below to add one.';
      elements.stocksList.appendChild(emptyState);
    }
  } else if (emptyState) {
    emptyState.remove();
  }
}
function getUsStockPriceAlert(stockKey) {
  return usPriceAlerts.find((alert) => alert.key === stockKey) || null;
}

function upsertUsStockRow(stock) {
  let row = elements.usStocksList.querySelector(`[data-us-stock="${stock.key}"]`);

  if (!row) {
    row = document.createElement('article');
    row.className = 'stock-row';
    row.dataset.usStock = stock.key;
    row.innerHTML = `
      <div class="stock-row-top">
        <div class="stock-main">
          <a class="stock-link" target="_blank" rel="noreferrer noopener">
            <div class="stock-name-block">
              <span class="stock-name"></span>
              <span class="stock-symbol"></span>
            </div>
          </a>
        </div>
        <div class="stock-metrics">
          <div class="price">--</div>
          <div class="delta">--</div>
        </div>
        <button type="button" class="stock-remove-btn us-stock-remove-btn" aria-label="Remove US stock" title="Remove US stock">X</button>
      </div>
      <div class="stock-alert-section">
        <button type="button" class="stock-alert-badge-btn us-stock-alert-badge-btn" data-key="${stock.key}" title="Click to edit US alert">
          <span class="stock-alert-badge-label">+ Alert</span>
        </button>
      </div>
      <div class="stock-alert-editor us-stock-alert-editor hidden" data-key="${stock.key}">
        <select class="alert-type-select">
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <input class="alert-threshold-input" type="number" min="0" step="0.01" placeholder="Target USD" />
        <button type="button" class="alert-save-btn us-alert-save-btn">Save</button>
        <button type="button" class="alert-reset-btn us-alert-reset-btn" title="Reset notification repeat state">Reset</button>
        <button type="button" class="alert-clear-btn us-alert-clear-btn" title="Clear alert">Clear</button>
      </div>
    `;
    elements.usStocksList.appendChild(row);
  }

  row.querySelector('.stock-link').href = getTradingViewStockUrl(stock.symbol);
  row.querySelector('.stock-name').textContent = stock.name;
  row.querySelector('.stock-symbol').textContent = stock.symbol;
  row.querySelector('.us-stock-remove-btn').dataset.key = stock.key;

  // Update US Alert badge & editor state
  const alert = getUsStockPriceAlert(stock.key);
  const badgeBtn = row.querySelector('.us-stock-alert-badge-btn');
  const badgeLabel = row.querySelector('.stock-alert-badge-label');
  const editor = row.querySelector('.us-stock-alert-editor');
  const livePrice = latestMarketStocks[stock.key]?.price;

  badgeBtn.className = 'stock-alert-badge-btn us-stock-alert-badge-btn';
  if (alert) {
    const type = alert.type || 'buy';
    const status = getAlertStatusMeta(livePrice, alert.threshold, type);
    badgeBtn.classList.add('has-alert', status.className);
    badgeLabel.innerHTML = `
      <span class="alert-type-chip ${type}">${type.toUpperCase()}</span>
      <span>🎯 $${formatPrice(alert.threshold)}</span>
      <span class="alert-status-text">(${status.label})</span>
    `;
    row.querySelector('.alert-type-select').value = type;
    row.querySelector('.alert-threshold-input').value = Number(alert.threshold).toFixed(2);
    row.querySelector('.us-alert-reset-btn').hidden = false;
    row.querySelector('.us-alert-clear-btn').hidden = false;
  } else {
    badgeLabel.textContent = '+ Set Alert';
    row.querySelector('.alert-type-select').value = 'buy';
    if (!openUsAlertEditors.has(stock.key) && typeof livePrice === 'number') {
      row.querySelector('.alert-threshold-input').value = Number(livePrice).toFixed(2);
    }
    row.querySelector('.us-alert-reset-btn').hidden = true;
    row.querySelector('.us-alert-clear-btn').hidden = true;
  }

  if (openUsAlertEditors.has(stock.key)) {
    editor.classList.remove('hidden');
  } else {
    editor.classList.add('hidden');
  }

  return row;
}

function renderUsStocks(stocks) {
  if (elements.usStockCountBadge) {
    elements.usStockCountBadge.textContent = String(trackedUsStocks.length);
  }

  if (!elements.usStocksList) return;
  const ordered = getSortedUsStockEntries(stocks);
  const activeKeys = new Set(ordered.map((stock) => stock.key));

  for (const row of Array.from(elements.usStocksList.querySelectorAll('.stock-row'))) {
    if (!activeKeys.has(row.dataset.usStock)) {
      row.remove();
    }
  }

  for (const stock of ordered) {
    const row = upsertUsStockRow(stock);
    renderIndex(`us-stock-${stock.key}`, row.querySelector('.price'), row.querySelector('.delta'), stocks[stock.key]);
    elements.usStocksList.appendChild(row);
  }

  let emptyState = elements.usStocksList.querySelector('.stock-empty');
  if (trackedUsStocks.length === 0) {
    if (!emptyState) {
      emptyState = document.createElement('div');
      emptyState.className = 'stock-empty';
      emptyState.textContent = 'No tracked US stocks yet. Search below to add one.';
      elements.usStocksList.appendChild(emptyState);
    }
  } else if (emptyState) {
    emptyState.remove();
  }
}

function renderStatus(lastUpdatedAt, lastError) {
  if (lastUpdatedAt !== undefined) {
    lastUpdatedTimestamp = lastUpdatedAt;
  }
  if (lastError !== undefined) {
    lastErrorState = lastError;
  }

  if (lastErrorState) {
    elements.statusText.textContent = `Error: ${lastErrorState}`;
    return;
  }

  if (!lastUpdatedTimestamp) {
    elements.statusText.textContent = 'No data yet';
    return;
  }

  const time = new Date(lastUpdatedTimestamp);
  const formatted = time.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  elements.statusText.textContent = `Updated at ${formatted} IST`;
}

function getIstDateParts(now = new Date()) {
  const offsetMs = IST_OFFSET_MINUTES * 60 * 1000;
  const ist = new Date(now.getTime() + offsetMs);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();
  const monthText = String(month + 1).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');

  return {
    year,
    month,
    day,
    dateKey: `${year}-${monthText}-${dayText}`,
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
    year: Number(map.year),
    month: Number(map.month) - 1,
    day: Number(map.day),
    weekday,
    minutesSinceMidnight: hour * 60 + minute,
    dateKey
  };
}

function getIstDayStartUtcMs(parts) {
  return Date.UTC(parts.year, parts.month, parts.day, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
}

function getTargetUtcMs(parts, minutesSinceMidnight) {
  return getIstDayStartUtcMs(parts) + minutesSinceMidnight * 60 * 1000;
}

function isWeekend(weekday) {
  return weekday === 0 || weekday === 6;
}

function getNextTradingDayParts(parts) {
  let cursor = new Date(Date.UTC(parts.year, parts.month, parts.day, 0, 0, 0));

  for (let i = 0; i < 15; i += 1) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    const weekday = cursor.getUTCDay();
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cursor.getUTCDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;

    if (!isWeekend(weekday) && !getNseHolidayName(dateKey)) {
      return {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth(),
        day: cursor.getUTCDate(),
        dateKey,
        weekday,
        minutesSinceMidnight: 0
      };
    }
  }

  return parts;
}

function getNextUsTradingDayParts(parts) {
  let cursor = new Date(Date.UTC(parts.year, parts.month, parts.day, 12, 0, 0));

  for (let i = 0; i < 15; i += 1) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    const y = cursor.getUTCFullYear();
    const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const d = String(cursor.getUTCDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${d}`;
    const weekday = cursor.getUTCDay();

    if (!isWeekend(weekday) && !isUsHoliday(dateKey)) {
      return {
        year: cursor.getUTCFullYear(),
        month: cursor.getUTCMonth(),
        day: cursor.getUTCDate(),
        dateKey,
        weekday,
        minutesSinceMidnight: 0
      };
    }
  }

  return parts;
}

function formatDuration(ms) {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(clamped / 86400);
  const hours = Math.floor((clamped % 86400) / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}`;
}

function setNextEvent(label, timer) {
  if (elements.nextEventLabel && elements.nextEventTimer) {
    elements.nextEventLabel.textContent = label;
    elements.nextEventTimer.textContent = timer;
  }
}

function setUsNextEvent(label, timer) {
  if (elements.usNextEventLabel && elements.usNextEventTimer) {
    elements.usNextEventLabel.textContent = label;
    elements.usNextEventTimer.textContent = timer;
  }
}

function formatNextOpenLabel(nextTradingDay, currentParts) {
  if (nextTradingDay.dateKey === currentParts.dateKey) {
    return 'Next Open (9:15 AM)';
  }

  const dayName = WEEKDAY_SHORT[nextTradingDay.weekday] || 'Next';
  const day = String(nextTradingDay.day).padStart(2, '0');
  const month = String(nextTradingDay.month + 1).padStart(2, '0');
  return `Next Open (${dayName}, ${day}/${month} 9:15 AM)`;
}

function formatNextUsOpenLabel(nextTradingDay, currentParts) {
  if (nextTradingDay.dateKey === currentParts.dateKey) {
    return 'Next Open (9:30 AM ET)';
  }

  const dayName = WEEKDAY_SHORT[nextTradingDay.weekday] || 'Next';
  const day = String(nextTradingDay.day).padStart(2, '0');
  const month = String(nextTradingDay.month + 1).padStart(2, '0');
  return `Next Open (${dayName}, ${month}/${day} 9:30 AM ET)`;
}

function updateHeaderMarketStatus() {
  const istParts = getIstDateParts();
  const isIndiaHoliday = Boolean(getNseHolidayName(istParts.dateKey));
  const isIndiaWknd = isWeekend(istParts.weekday);
  const isIndiaOpen = !isIndiaHoliday && !isIndiaWknd && istParts.minutesSinceMidnight >= MARKET_OPEN_MINUTES && istParts.minutesSinceMidnight < MARKET_CLOSE_MINUTES;

  if (elements.indiaMarketStatus) {
    elements.indiaMarketStatus.className = `market-pill ${isIndiaOpen ? 'open' : 'closed'}`;
    elements.indiaMarketStatus.textContent = isIndiaOpen ? 'India Open' : 'India Closed';
  }

  const us = getZonedDateParts(US_TIMEZONE);
  const isUsHoli = isUsHoliday(us.dateKey);
  const usWknd = isWeekend(us.weekday);
  const isUsOpen = !isUsHoli && !usWknd && us.minutesSinceMidnight >= US_OPEN_MINUTES && us.minutesSinceMidnight < US_CLOSE_MINUTES;

  if (elements.usMarketStatus) {
    elements.usMarketStatus.className = `market-pill ${isUsOpen ? 'open' : 'closed'}`;
    elements.usMarketStatus.textContent = isUsOpen ? 'US Open' : 'US Closed';
  }
}

function updateUsMarketTimers() {
  if (!elements.usMarketPhase) return;
  const us = getZonedDateParts(US_TIMEZONE);
  const holidayName = US_HOLIDAYS[us.dateKey];

  // Calculate remaining ms until a given target minute in ET
  const getUsTargetMs = (targetParts, targetMinutes) => {
    // Current time in ET vs target time in ET today or target day
    const msSinceMidnight = (us.minutesSinceMidnight * 60 + (new Date().getSeconds())) * 1000;
    if (targetParts.dateKey === us.dateKey) {
      return targetMinutes * 60 * 1000 - msSinceMidnight;
    }
    // Days diff
    const [y1, m1, d1] = us.dateKey.split('-').map(Number);
    const [y2, m2, d2] = targetParts.dateKey.split('-').map(Number);
    const dt1 = Date.UTC(y1, m1 - 1, d1);
    const dt2 = Date.UTC(y2, m2 - 1, d2);
    const diffDays = Math.max(1, Math.round((dt2 - dt1) / (24 * 60 * 60 * 1000)));
    return diffDays * 24 * 60 * 60 * 1000 + (targetMinutes * 60 * 1000) - msSinceMidnight;
  };

  if (holidayName) {
    const nextTradingDay = getNextUsTradingDayParts(us);
    setUsNextEvent(formatNextUsOpenLabel(nextTradingDay, us), formatDuration(getUsTargetMs(nextTradingDay, US_OPEN_MINUTES)));
    elements.usMarketPhase.textContent = `US Holiday (${holidayName})`;
    return;
  }

  if (isWeekend(us.weekday)) {
    const nextTradingDay = getNextUsTradingDayParts(us);
    setUsNextEvent(formatNextUsOpenLabel(nextTradingDay, us), formatDuration(getUsTargetMs(nextTradingDay, US_OPEN_MINUTES)));
    elements.usMarketPhase.textContent = 'Weekend Closed';
    return;
  }

  if (us.minutesSinceMidnight < US_OPEN_MINUTES) {
    elements.usMarketPhase.textContent = 'Pre-Market / Closed';
    setUsNextEvent('Market Open (9:30 AM ET)', formatDuration(getUsTargetMs(us, US_OPEN_MINUTES)));
    return;
  }

  if (us.minutesSinceMidnight < US_CLOSE_MINUTES) {
    elements.usMarketPhase.textContent = 'Regular Trading Hours';
    setUsNextEvent('Market Close (4:00 PM ET)', formatDuration(getUsTargetMs(us, US_CLOSE_MINUTES)));
    return;
  }

  const nextTradingDay = getNextUsTradingDayParts(us);
  elements.usMarketPhase.textContent = 'Market Closed';
  setUsNextEvent(formatNextUsOpenLabel(nextTradingDay, us), formatDuration(getUsTargetMs(nextTradingDay, US_OPEN_MINUTES)));
}

function updateMarketTimers() {
  updateHeaderMarketStatus();
  updateUsMarketTimers();
  const now = Date.now();
  const parts = getIstDateParts();
  const holidayName = getNseHolidayName(parts.dateKey);

  if (holidayName) {
    const nextTradingDay = getNextTradingDayParts(parts);
    setNextEvent(formatNextOpenLabel(nextTradingDay, parts), formatDuration(getTargetUtcMs(nextTradingDay, MARKET_OPEN_MINUTES) - now));
    elements.marketPhase.textContent = `Market Holiday (${holidayName})`;
    return;
  }

  if (isWeekend(parts.weekday)) {
    const nextTradingDay = getNextTradingDayParts(parts);
    setNextEvent(formatNextOpenLabel(nextTradingDay, parts), formatDuration(getTargetUtcMs(nextTradingDay, MARKET_OPEN_MINUTES) - now));
    elements.marketPhase.textContent = 'Weekend Closed';
    return;
  }

  if (parts.minutesSinceMidnight < PRE_OPEN_MINUTES) {
    elements.marketPhase.textContent = 'Market Closed';
    setNextEvent('Pre-open (9:00 AM)', formatDuration(getTargetUtcMs(parts, PRE_OPEN_MINUTES) - now));
    return;
  }

  if (parts.minutesSinceMidnight < MARKET_OPEN_MINUTES) {
    elements.marketPhase.textContent = 'Pre-Open Live';
    setNextEvent('Market Open (9:15 AM)', formatDuration(getTargetUtcMs(parts, MARKET_OPEN_MINUTES) - now));
    return;
  }

  if (parts.minutesSinceMidnight < MARKET_CLOSE_MINUTES) {
    elements.marketPhase.textContent = 'Market Open';
    setNextEvent('Market Close (3:30 PM)', formatDuration(getTargetUtcMs(parts, MARKET_CLOSE_MINUTES) - now));
    return;
  }

  const nextTradingDay = getNextTradingDayParts(parts);
  elements.marketPhase.textContent = 'Market Closed';
  setNextEvent(formatNextOpenLabel(nextTradingDay, parts), formatDuration(getTargetUtcMs(nextTradingDay, MARKET_OPEN_MINUTES) - now));
}

function switchTab(tab) {
  currentActiveTab = tab;
  for (const button of tabButtons) {
    button.classList.toggle('active', button.dataset.tab === tab);
  }

  for (const [name, panel] of Object.entries(tabPanels)) {
    panel.classList.toggle('active', name === tab);
  }

  renderStatus();
}

function renderSearchResults(results, container, mode) {
  const isAlertMode = mode === 'alert';
  const isUsMode = mode === 'us-stock';
  if (isAlertMode) {
    alertSearchResultsState = results;
  } else if (isUsMode) {
    usStockSearchResultsState = results;
  } else {
    stockSearchResultsState = results;
  }

  const listToCompare = isAlertMode ? priceAlerts : isUsMode ? trackedUsStocks : trackedStocks;
  const duplicateKeys = new Set(listToCompare.map((item) => item.key));
  if (!results.length) {
    container.hidden = true;
    container.innerHTML = '';
    return;
  }

  container.hidden = false;
  container.innerHTML = results.map((result) => {
    const exists = duplicateKeys.has(result.key);
    const actionLabel = exists ? 'Added' : isAlertMode ? 'Select' : 'Add';
    return `
      <button
        type="button"
        class="stock-search-item"
        data-key="${result.key}"
        data-symbol="${result.symbol}"
        data-name="${result.name.replace(/"/g, '&quot;')}"
        data-display-symbol="${result.displaySymbol}"
        ${exists && !isAlertMode ? 'disabled' : ''}
      >
        <span>
          <span class="stock-search-primary">${result.displaySymbol}</span>
          <span class="stock-search-secondary">${result.name}</span>
        </span>
        <span class="stock-search-add">${actionLabel}</span>
      </button>
    `;
  }).join('');
}

function renderSearchState(container, message, mode) {
  if (mode === 'alert') {
    alertSearchResultsState = [];
  } else if (mode === 'us-stock') {
    usStockSearchResultsState = [];
  } else {
    stockSearchResultsState = [];
  }
  container.hidden = false;
  container.innerHTML = `<div class="stock-search-state">${message}</div>`;
}

function clearSearchResults(container, mode) {
  if (mode === 'alert') {
    alertSearchResultsState = [];
  } else if (mode === 'us-stock') {
    usStockSearchResultsState = [];
  } else {
    stockSearchResultsState = [];
  }
  container.hidden = true;
  container.innerHTML = '';
}


function switchInnerTab(tab) {
  currentInnerActiveTab = tab;
  for (const button of innerTabButtons) {
    button.classList.toggle('active', button.dataset.innerTab === tab);
  }

  for (const [name, panel] of Object.entries(innerTabPanels)) {
    panel.classList.toggle('active', name === tab);
  }

  renderStatus();
}
async function loadTrackedStocks() {
  const data = await chrome.storage.local.get([TRACKED_STOCKS_KEY]);
  const rawList = Array.isArray(data[TRACKED_STOCKS_KEY]) ? data[TRACKED_STOCKS_KEY] : cloneList(DEFAULT_TRACKED_STOCKS);
  trackedStocks = rawList.filter((stock) => !isKnownUsStockKey(stock.key) && !isKnownUsStockKey(stock.symbol) && !isKnownUsStockKey(stock.name));
}

async function loadTrackedUsStocks() {
  const data = await chrome.storage.local.get([TRACKED_US_STOCKS_KEY]);
  trackedUsStocks = Array.isArray(data[TRACKED_US_STOCKS_KEY]) ? data[TRACKED_US_STOCKS_KEY] : cloneList(DEFAULT_TRACKED_US_STOCKS);
}

async function loadPriceAlerts() {
  const data = await chrome.storage.local.get([PRICE_ALERTS_KEY]);
  priceAlerts = dedupePriceAlerts(Array.isArray(data[PRICE_ALERTS_KEY]) ? data[PRICE_ALERTS_KEY] : []);
}

async function loadUsPriceAlerts() {
  const data = await chrome.storage.local.get([US_PRICE_ALERTS_KEY]);
  usPriceAlerts = dedupeUsPriceAlerts(Array.isArray(data[US_PRICE_ALERTS_KEY]) ? data[US_PRICE_ALERTS_KEY] : []);
}

async function loadData() {
  const data = await chrome.storage.local.get([STORAGE_KEY, LAST_UPDATED_KEY, 'lastError']);
  const marketData = data[STORAGE_KEY] || {};
  const india = marketData.india || {};
  const global = marketData.global || {};
  const stocks = marketData.stocks || {};
  latestMarketStocks = stocks;

  renderIndex('nifty', elements.niftyPrice, elements.niftyDelta, india.nifty);
  renderIndex('bankNifty', elements.bankNiftyPrice, elements.bankNiftyDelta, india.bankNifty);
  renderIndex('giftNifty', elements.giftNiftyPrice, elements.giftNiftyDelta, india.giftNifty);
  renderIndex('sensex', elements.sensexPrice, elements.sensexDelta, india.sensex);
  renderIndex('sp500', elements.sp500Price, elements.sp500Delta, global.sp500);
  renderIndex('dowJones', elements.dowJonesPrice, elements.dowJonesDelta, global.dowJones);
  renderIndex('nasdaq', elements.nasdaqPrice, elements.nasdaqDelta, global.nasdaq);
  renderIndex('ftse100', elements.ftse100Price, elements.ftse100Delta, global.ftse100);
  renderIndex('nikkei225', elements.nikkei225Price, elements.nikkei225Delta, global.nikkei225);

  renderStocks(stocks);
  renderUsStocks(stocks);
  renderStatus(data[LAST_UPDATED_KEY], data.lastError);
}

async function syncNotificationToggleButton() {
  const data = await chrome.storage.local.get([NOTIFICATIONS_PAUSED_KEY]);
  const pauseVal = data[NOTIFICATIONS_PAUSED_KEY];
  
  let isPausedActive = false;
  let selectValue = 'active';

  if (pauseVal === true || pauseVal === 'indefinite' || (pauseVal && pauseVal.type === 'indefinite')) {
    selectValue = 'indefinite';
    isPausedActive = true;
  } else if (pauseVal && typeof pauseVal === 'object' && pauseVal.until) {
    if (Date.now() < pauseVal.until) {
      selectValue = pauseVal.type || 'active'; // fallback
      isPausedActive = true;
    }
  }

  if (elements.notifToggleSelect) {
    elements.notifToggleSelect.value = selectValue;
    elements.notifToggleSelect.classList.toggle('paused', isPausedActive);
  }
}

async function refreshNow(options = {}) {
  if (refreshInFlight) {
    return;
  }

  const silent = Boolean(options.silent);
  refreshInFlight = true;
  if (!silent) {
    elements.refreshBtn.disabled = true;
    elements.statusText.textContent = 'Refreshing...';
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'refresh-now' });
    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to refresh');
    }
  } catch (error) {
    elements.statusText.textContent = `Error: ${error?.message || 'Failed to refresh'}`;
  } finally {
    if (!silent) {
      elements.refreshBtn.disabled = false;
    }
    refreshInFlight = false;
    await loadTrackedStocks();
    await loadTrackedUsStocks();
    await loadPriceAlerts();
    await loadData();
  }
}

async function runSearch(query, mode) {
  const trimmed = String(query || '').trim();
  const container = mode === 'us-stock' ? elements.usStockSearchResults : elements.stockSearchResults;
  const requestId = mode === 'us-stock' ? ++usSearchRequestId : ++searchRequestId;

  if (trimmed.length < (mode === 'us-stock' ? 1 : 2)) {
    clearSearchResults(container, mode);
    return;
  }

  renderSearchState(container, 'Searching...', mode);

  try {
    const msgType = mode === 'us-stock' ? 'search-us-stocks' : 'search-stocks';
    const response = await chrome.runtime.sendMessage({ type: msgType, query: trimmed });
    const latestId = mode === 'us-stock' ? usSearchRequestId : searchRequestId;
    if (requestId !== latestId) {
      return;
    }

    if (!response?.ok) {
      throw new Error(response?.error || 'Search failed');
    }

    const results = response.results || [];
    if (results.length === 0) {
      renderSearchState(container, mode === 'us-stock' ? 'No US stocks found' : 'No NSE stocks found', mode);
      return;
    }

    renderSearchResults(results, container, mode);
  } catch (error) {
    const latestId = mode === 'us-stock' ? usSearchRequestId : searchRequestId;
    if (requestId !== latestId) {
      return;
    }
    renderSearchState(container, error?.message || 'Search failed', mode);
  }
}

async function addTrackedStock(stock) {
  const response = await chrome.runtime.sendMessage({ type: 'add-stock', stock });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to add stock');
  }

  elements.stockSearchInput.value = '';
  clearSearchResults(elements.stockSearchResults, 'stock');
}

async function addTrackedUsStock(stock) {
  const response = await chrome.runtime.sendMessage({ type: 'add-us-stock', stock });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to add US stock');
  }

  elements.usStockSearchInput.value = '';
  clearSearchResults(elements.usStockSearchResults, 'us-stock');
}

async function removeTrackedStock(key) {
  const stock = getTrackedStockByKey(key);
  if (!stock) {
    return;
  }

  if (!window.confirm(`Remove ${stock.name} from Stock Tracker?`)) {
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: 'remove-stock', key });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to remove stock');
  }
}

async function removeTrackedUsStock(key) {
  const stock = getTrackedUsStockByKey(key);
  if (!stock) {
    return;
  }

  if (!window.confirm(`Remove ${stock.name} from US Stock Tracker?`)) {
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: 'remove-us-stock', key });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to remove US stock');
  }
}

function showPriceAlertSavedDialog(alert) {
  const currentPrice = latestMarketStocks[alert.key]?.price;
  const lines = [`${alert.name} alert saved.`];
  const isBuy = alert.type === 'buy';

  if (typeof currentPrice === 'number') {
    if (isBuy && currentPrice <= alert.threshold) {
      lines.push(`Current price ${formatPrice(currentPrice)} is already below ${formatPrice(alert.threshold)}.`);
    } else if (!isBuy && currentPrice >= alert.threshold) {
      lines.push(`Current price ${formatPrice(currentPrice)} is already above ${formatPrice(alert.threshold)}.`);
    }
  }

  window.alert(lines.join('\n'));
}

async function upsertPriceAlert(alert) {
  const response = await chrome.runtime.sendMessage({ type: 'upsert-price-alert', alert });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to save alert');
  }
}

async function removePriceAlert(id) {
  const alert = getPriceAlertById(id);
  if (!alert) {
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: 'remove-price-alert', id });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to remove alert');
  }
}

async function resetPriceAlert(id) {
  const response = await chrome.runtime.sendMessage({ type: 'reset-price-alert', id });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to reset alert');
  }
}

async function upsertUsPriceAlert(alert) {
  const response = await chrome.runtime.sendMessage({ type: 'upsert-us-price-alert', alert });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to save US alert');
  }
}

async function removeUsPriceAlert(id) {
  const alert = getPriceAlertById(id) || usPriceAlerts.find((a) => a.id === id);
  if (!alert) {
    return;
  }

  const response = await chrome.runtime.sendMessage({ type: 'remove-us-price-alert', id });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to remove US alert');
  }
}

async function resetUsPriceAlert(id) {
  const response = await chrome.runtime.sendMessage({ type: 'reset-us-price-alert', id });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to reset US alert');
  }
}

async function syncApiPriceAlerts() {
  const btn = elements.syncApiAlertsBtn;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'sync-price-alerts-api' });
    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to sync API alerts');
    }

    elements.statusText.textContent = `Synced ${response.count || 0} API alerts.`;
    await loadTrackedStocks();
    await loadPriceAlerts();
    renderStocks(latestMarketStocks);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function syncUsApiPriceAlerts() {
  const btn = elements.syncUsApiAlertsBtn;
  if (!btn) {
    return;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Syncing...';

  try {
    const response = await chrome.runtime.sendMessage({ type: 'sync-us-price-alerts-api' });
    if (!response?.ok) {
      throw new Error(response?.error || 'Failed to sync US API alerts');
    }

    elements.statusText.textContent = `Synced ${response.count || 0} US API alerts.`;
    await loadTrackedUsStocks();
    await loadUsPriceAlerts();
    renderUsStocks(latestMarketStocks);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (changes[TRACKED_STOCKS_KEY] || changes[PRICE_ALERTS_KEY]) {
    await loadTrackedStocks();
    await loadPriceAlerts();
    renderStocks(latestMarketStocks);
  }

  if (changes[TRACKED_US_STOCKS_KEY] || changes[US_PRICE_ALERTS_KEY]) {
    await loadTrackedUsStocks();
    await loadUsPriceAlerts();
    renderUsStocks(latestMarketStocks);
  }

  if (changes[STORAGE_KEY] || changes[LAST_UPDATED_KEY] || changes.lastError) {
    loadData();
  }
});

elements.refreshBtn.addEventListener('click', () => refreshNow());
elements.notifToggleSelect.addEventListener('change', async (e) => {
  const val = e.target.value;
  let pauseData = false;

  if (val === 'indefinite') {
    pauseData = 'indefinite';
  } else if (val !== 'active') {
    const mins = parseInt(val, 10);
    pauseData = {
      until: Date.now() + mins * 60 * 1000,
      type: val
    };
  }

  await chrome.storage.local.set({ [NOTIFICATIONS_PAUSED_KEY]: pauseData });
  await syncNotificationToggleButton();
});

for (const button of tabButtons) {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
}

for (const button of innerTabButtons) {
  button.addEventListener('click', () => switchInnerTab(button.dataset.innerTab));
}

elements.stockSort.addEventListener('change', () => {
  currentStockSort = elements.stockSort.value;
  renderStocks(latestMarketStocks);
});

if (elements.usStockSort) {
  elements.usStockSort.addEventListener('change', () => {
    currentUsStockSort = elements.usStockSort.value;
    renderUsStocks(latestMarketStocks);
  });
}

// India Quick Filter Chips
if (elements.indiaStockFilters) {
  elements.indiaStockFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    elements.indiaStockFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentIndiaFilter = chip.dataset.filter;
    renderStocks(latestMarketStocks);
  });
}

// US Quick Filter Chips
if (elements.usStockFilters) {
  elements.usStockFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    elements.usStockFilters.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    currentUsFilter = chip.dataset.filter;
    renderUsStocks(latestMarketStocks);
  });
}

elements.stockSearchInput.addEventListener('input', () => {
  if (elements.clearStockSearchBtn) {
    elements.clearStockSearchBtn.classList.toggle('hidden', !elements.stockSearchInput.value.trim());
  }
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => runSearch(elements.stockSearchInput.value, 'stock'), 250);
});

if (elements.clearStockSearchBtn) {
  elements.clearStockSearchBtn.addEventListener('click', () => {
    elements.stockSearchInput.value = '';
    elements.clearStockSearchBtn.classList.add('hidden');
    clearSearchResults(elements.stockSearchResults, 'stock');
    elements.stockSearchInput.focus();
  });
}

if (elements.usStockSearchInput) {
  elements.usStockSearchInput.addEventListener('input', () => {
    if (elements.clearUsStockSearchBtn) {
      elements.clearUsStockSearchBtn.classList.toggle('hidden', !elements.usStockSearchInput.value.trim());
    }
    clearTimeout(usSearchDebounceTimer);
    usSearchDebounceTimer = setTimeout(() => runSearch(elements.usStockSearchInput.value, 'us-stock'), 250);
  });
}

if (elements.clearUsStockSearchBtn) {
  elements.clearUsStockSearchBtn.addEventListener('click', () => {
    elements.usStockSearchInput.value = '';
    elements.clearUsStockSearchBtn.classList.add('hidden');
    clearSearchResults(elements.usStockSearchResults, 'us-stock');
    elements.usStockSearchInput.focus();
  });
}

elements.stockSearchResults.addEventListener('click', async (event) => {
  const button = event.target.closest('.stock-search-item');
  if (!button || button.disabled) {
    return;
  }

  try {
    await addTrackedStock({
      key: button.dataset.key,
      symbol: button.dataset.symbol,
      name: button.dataset.name
    });
  } catch (error) {
    elements.statusText.textContent = `Error: ${error?.message || 'Failed to add stock'}`;
  }
});

if (elements.usStockSearchResults) {
  elements.usStockSearchResults.addEventListener('click', async (event) => {
    const button = event.target.closest('.stock-search-item');
    if (!button || button.disabled) {
      return;
    }

    try {
      await addTrackedUsStock({
        key: button.dataset.key,
        symbol: button.dataset.symbol,
        name: button.dataset.name
      });
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to add US stock'}`;
    }
  });
}

elements.stocksList.addEventListener('click', async (event) => {
  const row = event.target.closest('.stock-row');
  if (!row) {
    return;
  }

  const stockKey = row.dataset.stock;
  const stock = getTrackedStockByKey(stockKey);
  if (!stock) {
    return;
  }

  // Remove stock
  const removeButton = event.target.closest('.stock-remove-btn');
  if (removeButton) {
    try {
      await removeTrackedStock(removeButton.dataset.key);
      const alert = getStockPriceAlert(stockKey);
      if (alert) {
        await removePriceAlert(alert.id);
      }
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to remove stock'}`;
    }
    return;
  }

  // Toggle Alert Editor
  const badgeBtn = event.target.closest('.stock-alert-badge-btn');
  if (badgeBtn) {
    if (openAlertEditors.has(stockKey)) {
      openAlertEditors.delete(stockKey);
    } else {
      openAlertEditors.add(stockKey);
    }
    renderStocks(latestMarketStocks);
    return;
  }

  // Save Alert
  const saveBtn = event.target.closest('.alert-save-btn');
  if (saveBtn) {
    const thresholdInput = row.querySelector('.alert-threshold-input');
    const typeSelect = row.querySelector('.alert-type-select');
    const threshold = Number(thresholdInput.value);
    const type = typeSelect.value || 'buy';

    if (!Number.isFinite(threshold) || threshold <= 0) {
      elements.statusText.textContent = 'Enter a valid target price.';
      return;
    }

    try {
      await upsertPriceAlert({
        key: stock.key,
        symbol: stock.symbol,
        name: stock.name,
        threshold,
        type
      });
      openAlertEditors.delete(stockKey);
      await loadPriceAlerts();
      renderStocks(latestMarketStocks);
      showPriceAlertSavedDialog({
        key: stock.key,
        name: stock.name,
        threshold,
        type
      });
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to save alert'}`;
    }
    return;
  }

  // Reset Alert
  const resetBtn = event.target.closest('.alert-reset-btn');
  if (resetBtn) {
    const alert = getStockPriceAlert(stockKey);
    if (alert) {
      try {
        await resetPriceAlert(alert.id);
        elements.statusText.textContent = `${stock.name} alert reset.`;
        openAlertEditors.delete(stockKey);
        renderStocks(latestMarketStocks);
      } catch (error) {
        elements.statusText.textContent = `Error: ${error?.message || 'Failed to reset alert'}`;
      }
    }
    return;
  }

  // Clear Alert
  const clearBtn = event.target.closest('.alert-clear-btn');
  if (clearBtn) {
    const alert = getStockPriceAlert(stockKey);
    if (alert) {
      try {
        await removePriceAlert(alert.id);
        elements.statusText.textContent = `${stock.name} alert cleared.`;
        openAlertEditors.delete(stockKey);
        await loadPriceAlerts();
        renderStocks(latestMarketStocks);
      } catch (error) {
        elements.statusText.textContent = `Error: ${error?.message || 'Failed to clear alert'}`;
      }
    }
    return;
  }
});

if (elements.usStocksList) {
  elements.usStocksList.addEventListener('click', async (event) => {
    const row = event.target.closest('.stock-row');
    if (!row) {
      return;
    }

    const stockKey = row.dataset.usStock;
    const stock = getTrackedUsStockByKey(stockKey);
    if (!stock) {
      return;
    }

    // Remove stock
    const removeButton = event.target.closest('.us-stock-remove-btn');
    if (removeButton) {
      try {
        await removeTrackedUsStock(removeButton.dataset.key);
        const alert = getUsStockPriceAlert(stockKey);
        if (alert) {
          await removeUsPriceAlert(alert.id);
        }
      } catch (error) {
        elements.statusText.textContent = `Error: ${error?.message || 'Failed to remove US stock'}`;
      }
      return;
    }

    // Toggle US Alert Editor
    const badgeBtn = event.target.closest('.us-stock-alert-badge-btn');
    if (badgeBtn) {
      if (openUsAlertEditors.has(stockKey)) {
        openUsAlertEditors.delete(stockKey);
      } else {
        openUsAlertEditors.add(stockKey);
      }
      renderUsStocks(latestMarketStocks);
      return;
    }

    // Save US Alert
    const saveBtn = event.target.closest('.us-alert-save-btn');
    if (saveBtn) {
      const thresholdInput = row.querySelector('.alert-threshold-input');
      const typeSelect = row.querySelector('.alert-type-select');
      const threshold = Number(thresholdInput.value);
      const type = typeSelect.value || 'buy';

      if (!Number.isFinite(threshold) || threshold <= 0) {
        elements.statusText.textContent = 'Enter a valid target price.';
        return;
      }

      try {
        await upsertUsPriceAlert({
          key: stock.key,
          symbol: stock.symbol,
          name: stock.name,
          threshold,
          type
        });
        openUsAlertEditors.delete(stockKey);
        await loadUsPriceAlerts();
        renderUsStocks(latestMarketStocks);
        showPriceAlertSavedDialog({
          key: stock.key,
          name: stock.name,
          threshold,
          type
        });
      } catch (error) {
        elements.statusText.textContent = `Error: ${error?.message || 'Failed to save US alert'}`;
      }
      return;
    }

    // Reset US Alert
    const resetBtn = event.target.closest('.us-alert-reset-btn');
    if (resetBtn) {
      const alert = getUsStockPriceAlert(stockKey);
      if (alert) {
        try {
          await resetUsPriceAlert(alert.id);
          elements.statusText.textContent = `${stock.name} US alert reset.`;
          openUsAlertEditors.delete(stockKey);
          renderUsStocks(latestMarketStocks);
        } catch (error) {
          elements.statusText.textContent = `Error: ${error?.message || 'Failed to reset US alert'}`;
        }
      }
      return;
    }

    // Clear US Alert
    const clearBtn = event.target.closest('.us-alert-clear-btn');
    if (clearBtn) {
      const alert = getUsStockPriceAlert(stockKey);
      if (alert) {
        try {
          await removeUsPriceAlert(alert.id);
          elements.statusText.textContent = `${stock.name} US alert cleared.`;
          openUsAlertEditors.delete(stockKey);
          await loadUsPriceAlerts();
          renderUsStocks(latestMarketStocks);
        } catch (error) {
          elements.statusText.textContent = `Error: ${error?.message || 'Failed to clear US alert'}`;
        }
      }
      return;
    }
  });
}

document.addEventListener('click', (event) => {
  if (!event.target.closest('#stockSearchInput') && !event.target.closest('#stockSearchResults')) {
    clearSearchResults(elements.stockSearchResults, 'stock');
  }

  if (!event.target.closest('#usStockSearchInput') && !event.target.closest('#usStockSearchResults')) {
    clearSearchResults(elements.usStockSearchResults, 'us-stock');
  }
});

elements.syncApiAlertsBtn.addEventListener('click', async () => {
  try {
    await syncApiPriceAlerts();
  } catch (error) {
    elements.statusText.textContent = `Error: ${error?.message || 'Failed to sync API alerts'}`;
  }
});

if (elements.syncUsApiAlertsBtn) {
  elements.syncUsApiAlertsBtn.addEventListener('click', async () => {
    try {
      await syncUsApiPriceAlerts();
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to sync US API alerts'}`;
    }
  });
}

if (elements.resetStorageBtn) {
  elements.resetStorageBtn.addEventListener('click', async () => {
    if (!confirm('Clear local cache and clean up stocks list (preserving your India and US stocks in their separate lists)?')) {
      return;
    }
    try {
      elements.statusText.textContent = 'Clearing and restoring clean storage...';
      const response = await chrome.runtime.sendMessage({ type: 'reset-storage' });
      if (!response?.ok) {
        throw new Error(response?.error || 'Failed to reset storage');
      }
      await loadTrackedStocks();
      await loadTrackedUsStocks();
      await loadPriceAlerts();
      await loadUsPriceAlerts();
      await loadData();
      elements.statusText.textContent = `Cleaned storage: restored ${response.indiaCount || 0} India and ${response.usCount || 0} US stocks.`;
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to reset storage'}`;
    }
  });
}

elements.stockSort.value = currentStockSort;
if (elements.usStockSort) {
  elements.usStockSort.value = currentUsStockSort;
}
switchTab('india');
switchInnerTab('tracker');
await loadTrackedStocks();
await loadTrackedUsStocks();
await loadPriceAlerts();
await loadUsPriceAlerts();
await ensureHolidaysCacheLoaded();
await loadData();
updateMarketTimers();
await syncNotificationToggleButton();

setInterval(() => {
  refreshNow({ silent: true });
}, POPUP_REFRESH_INTERVAL_MS);

setInterval(() => {
  updateMarketTimers();
}, TIMER_REFRESH_INTERVAL_MS);







