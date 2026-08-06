import { getNseHolidayName, ensureHolidaysCacheLoaded } from './holidaysManager.js';

const STORAGE_KEY = 'marketData';
const LAST_UPDATED_KEY = 'lastUpdatedAt';
const NOTIFICATIONS_PAUSED_KEY = 'notificationsPaused';
const TRACKED_STOCKS_KEY = 'trackedStocks';
const PRICE_ALERTS_KEY = 'priceAlerts';
const POPUP_REFRESH_INTERVAL_MS = 10000;
const TIMER_REFRESH_INTERVAL_MS = 1000;

const IST_OFFSET_MINUTES = 330;
const PRE_OPEN_MINUTES = 9 * 60;
const MARKET_OPEN_MINUTES = 9 * 60 + 15;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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

const elements = {
  refreshBtn: document.getElementById('refreshBtn'),
  statusText: document.getElementById('statusText'),
  marketPhase: document.getElementById('marketPhase'),
  nextEventLabel: document.getElementById('nextEventLabel'),
  nextEventTimer: document.getElementById('nextEventTimer'),
  stocksList: document.getElementById('stocksList'),
  priceAlertsList: document.getElementById('priceAlertsList'),
  notifToggleSelect: document.getElementById('notifToggleSelect'),
  stockSort: document.getElementById('stockSort'),
  stockSearchInput: document.getElementById('stockSearchInput'),
  stockSearchResults: document.getElementById('stockSearchResults'),
  alertStockSearchInput: document.getElementById('alertStockSearchInput'),
  alertSearchResults: document.getElementById('alertSearchResults'),
  alertTypeSelect: document.getElementById('alertTypeSelect'),
  alertThresholdInput: document.getElementById('alertThresholdInput'),
  addAlertBtn: document.getElementById('addAlertBtn'),
  syncApiAlertsBtn: document.getElementById('syncApiAlertsBtn'),
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
  alerts: document.getElementById('inner-tab-alerts')
};

const lastRenderedPrices = {};
let refreshInFlight = false;
let currentStockSort = 'changeAsc';
let trackedStocks = cloneList(DEFAULT_TRACKED_STOCKS);
let priceAlerts = [];
let stockSearchResultsState = [];
let alertSearchResultsState = [];
let selectedAlertStock = null;
let searchRequestId = 0;
let searchDebounceTimer = null;
let alertSearchRequestId = 0;
let alertSearchDebounceTimer = null;
let latestMarketStocks = {};

function cloneList(items) {
  return items.map((item) => ({ ...item }));
}

function getAlertSourceRank(source) {
  return String(source || '').includes('api') ? 2 : 1;
}

function dedupePriceAlerts(alerts) {
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
  const baseSymbol = String(symbol || '').toUpperCase().replace(/\.NS$/i, '');
  return `https://in.tradingview.com/symbols/NSE-${baseSymbol}/`;
}

function getTrackedStockByKey(key) {
  return trackedStocks.find((stock) => stock.key === key) || null;
}

function getPriceAlertById(id) {
  return priceAlerts.find((alert) => alert.id === id) || null;
}

function getSortedStockEntries(stocks) {
  const entries = [...trackedStocks];

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

function upsertStockRow(stock) {
  let row = elements.stocksList.querySelector(`[data-stock="${stock.key}"]`);

  if (!row) {
    row = document.createElement('article');
    row.className = 'stock-row';
    row.dataset.stock = stock.key;
    row.innerHTML = `
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
    `;
    elements.stocksList.appendChild(row);
  }

  row.querySelector('.stock-link').href = getTradingViewStockUrl(stock.symbol);
  row.querySelector('.stock-name').textContent = stock.name;
  row.querySelector('.stock-symbol').textContent = stock.symbol;
  row.querySelector('.stock-remove-btn').dataset.key = stock.key;

  return row;
}

function renderStocks(stocks) {
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
function renderPriceAlerts(stocks) {
  const ordered = [...priceAlerts].sort((a, b) => a.name.localeCompare(b.name));
  elements.priceAlertsList.innerHTML = '';

  if (ordered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'alert-empty';
    empty.textContent = 'No price alerts yet. Search a stock, set a price, and add an alert.';
    elements.priceAlertsList.appendChild(empty);
    return;
  }

  for (const alert of ordered) {
    const current = stocks[alert.key]?.price;
    const type = alert.type || 'buy';
    const status = getAlertStatusMeta(current, alert.threshold, type);
    const row = document.createElement('article');
    row.className = 'alert-row';
    row.dataset.alertId = alert.id;
    row.innerHTML = `
      <div class="alert-main">
        <div class="alert-name-block">
          <span class="alert-name">${alert.name}</span>
          <span class="alert-symbol">${alert.symbol}</span>
          <span class="alert-current">Current: ${typeof current === 'number' ? formatPrice(current) : '--'}</span>
          <span class="alert-type-chip ${type}">${type.toUpperCase()}</span>
          <span class="alert-status-chip ${status.className}">${status.label}</span>
        </div>
      </div>
      <div class="alert-controls">
        <span class="alert-label">Target</span>
        <input class="alert-threshold-input" type="number" min="0" step="0.01" value="${Number(alert.threshold).toFixed(2)}" />
        <button type="button" class="alert-save-btn">Update</button>
        <button type="button" class="alert-reset-btn">Reset</button>
        <button type="button" class="alert-remove-btn" aria-label="Remove alert" title="Remove alert">X</button>
      </div>
    `;
    elements.priceAlertsList.appendChild(row);
  }
}

function renderStatus(lastUpdatedAt, lastError) {
  if (lastError) {
    elements.statusText.textContent = `Error: ${lastError}`;
    return;
  }

  if (!lastUpdatedAt) {
    elements.statusText.textContent = 'No data yet';
    return;
  }

  const time = new Date(lastUpdatedAt);
  elements.statusText.textContent = `Updated at ${time.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}`;
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
  elements.nextEventLabel.textContent = label;
  elements.nextEventTimer.textContent = timer;
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

function updateMarketTimers() {
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
  for (const button of tabButtons) {
    button.classList.toggle('active', button.dataset.tab === tab);
  }

  for (const [name, panel] of Object.entries(tabPanels)) {
    panel.classList.toggle('active', name === tab);
  }
}

function renderSearchResults(results, container, mode) {
  const isAlertMode = mode === 'alert';
  if (isAlertMode) {
    alertSearchResultsState = results;
  } else {
    stockSearchResultsState = results;
  }

  const duplicateKeys = new Set((isAlertMode ? priceAlerts : trackedStocks).map((item) => item.key));
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
  } else {
    stockSearchResultsState = [];
  }
  container.hidden = false;
  container.innerHTML = `<div class="stock-search-state">${message}</div>`;
}

function clearSearchResults(container, mode) {
  if (mode === 'alert') {
    alertSearchResultsState = [];
  } else {
    stockSearchResultsState = [];
  }
  container.hidden = true;
  container.innerHTML = '';
}


function switchInnerTab(tab) {
  for (const button of innerTabButtons) {
    button.classList.toggle('active', button.dataset.innerTab === tab);
  }

  for (const [name, panel] of Object.entries(innerTabPanels)) {
    panel.classList.toggle('active', name === tab);
  }
}
async function loadTrackedStocks() {
  const data = await chrome.storage.local.get([TRACKED_STOCKS_KEY]);
  trackedStocks = Array.isArray(data[TRACKED_STOCKS_KEY]) ? data[TRACKED_STOCKS_KEY] : cloneList(DEFAULT_TRACKED_STOCKS);
}

async function loadPriceAlerts() {
  const data = await chrome.storage.local.get([PRICE_ALERTS_KEY]);
  console.log('loadPriceAlerts raw data from storage:', data[PRICE_ALERTS_KEY]);
  priceAlerts = dedupePriceAlerts(Array.isArray(data[PRICE_ALERTS_KEY]) ? data[PRICE_ALERTS_KEY] : []);
  console.log('loadPriceAlerts deduped alerts in popup:', priceAlerts);
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

  renderPriceAlerts(stocks);
  renderStocks(stocks);
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
    await loadPriceAlerts();
    await loadData();
  }
}

async function runSearch(query, mode) {
  const trimmed = String(query || '').trim();
  const container = mode === 'alert' ? elements.alertSearchResults : elements.stockSearchResults;
  const requestId = mode === 'alert' ? ++alertSearchRequestId : ++searchRequestId;

  if (trimmed.length < 2) {
    clearSearchResults(container, mode);
    return;
  }

  renderSearchState(container, 'Searching...', mode);

  try {
    const response = await chrome.runtime.sendMessage({ type: 'search-stocks', query: trimmed });
    const latestId = mode === 'alert' ? alertSearchRequestId : searchRequestId;
    if (requestId !== latestId) {
      return;
    }

    if (!response?.ok) {
      throw new Error(response?.error || 'Search failed');
    }

    const results = response.results || [];
    if (results.length === 0) {
      renderSearchState(container, 'No NSE stocks found', mode);
      return;
    }

    renderSearchResults(results, container, mode);
  } catch (error) {
    const latestId = mode === 'alert' ? alertSearchRequestId : searchRequestId;
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

  if (!window.confirm(`Remove price alert for ${alert.name}?`)) {
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
    await loadPriceAlerts();
    renderPriceAlerts(latestMarketStocks);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') {
    return;
  }

  if (changes[TRACKED_STOCKS_KEY]) {
    await loadTrackedStocks();
    renderStocks(latestMarketStocks);
  }

  if (changes[PRICE_ALERTS_KEY]) {
    await loadPriceAlerts();
    renderPriceAlerts(latestMarketStocks);
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

elements.stockSearchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => runSearch(elements.stockSearchInput.value, 'stock'), 250);
});

elements.alertStockSearchInput.addEventListener('input', () => {
  selectedAlertStock = null;
  clearTimeout(alertSearchDebounceTimer);
  alertSearchDebounceTimer = setTimeout(() => runSearch(elements.alertStockSearchInput.value, 'alert'), 250);
});

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

elements.alertSearchResults.addEventListener('click', (event) => {
  const button = event.target.closest('.stock-search-item');
  if (!button) {
    return;
  }

  selectedAlertStock = {
    key: button.dataset.key,
    symbol: button.dataset.symbol,
    name: button.dataset.name,
    displaySymbol: button.dataset.displaySymbol
  };
  elements.alertStockSearchInput.value = `${selectedAlertStock.displaySymbol} - ${selectedAlertStock.name}`;
  clearSearchResults(elements.alertSearchResults, 'alert');
});

function resolveAlertSelection() {
  if (selectedAlertStock) {
    return selectedAlertStock;
  }

  const typed = String(elements.alertStockSearchInput.value || '').trim().toUpperCase();
  if (!typed) {
    return null;
  }

  const fromResults = alertSearchResultsState.find((item) => {
    const display = String(item.displaySymbol || '').toUpperCase();
    const symbol = String(item.symbol || '').toUpperCase();
    const name = String(item.name || '').toUpperCase();
    return typed === display || typed === symbol || typed.includes(display) || typed.includes(name);
  });

  if (fromResults) {
    return fromResults;
  }

  return alertSearchResultsState[0] || null;
}
elements.addAlertBtn.addEventListener('click', async () => {
  const threshold = Number(elements.alertThresholdInput.value);
  const alertStock = resolveAlertSelection();
  const type = elements.alertTypeSelect.value || 'buy';
  if (!alertStock) {
    elements.statusText.textContent = 'Search a stock and pick a match for the alert.';
    return;
  }
  selectedAlertStock = alertStock;
  if (!Number.isFinite(threshold) || threshold <= 0) {
    elements.statusText.textContent = 'Enter a valid alert price.';
    return;
  }

  try {
    await upsertPriceAlert({
      key: alertStock.key,
      symbol: alertStock.symbol,
      name: alertStock.name,
      threshold,
      type
    });
    elements.alertStockSearchInput.value = '';
    elements.alertThresholdInput.value = '';
    selectedAlertStock = null;
    clearSearchResults(elements.alertSearchResults, 'alert');
    showPriceAlertSavedDialog({
      key: alertStock.key,
      name: alertStock.name,
      threshold,
      type
    });
  } catch (error) {
    elements.statusText.textContent = `Error: ${error?.message || 'Failed to save alert'}`;
  }
});

elements.priceAlertsList.addEventListener('click', async (event) => {
  const removeBtn = event.target.closest('.alert-remove-btn');
  if (removeBtn) {
    try {
      await removePriceAlert(removeBtn.closest('.alert-row').dataset.alertId);
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to remove alert'}`;
    }
    return;
  }

  const saveBtn = event.target.closest('.alert-save-btn');
  if (saveBtn) {
    const row = saveBtn.closest('.alert-row');
    const alert = getPriceAlertById(row.dataset.alertId);
    const threshold = Number(row.querySelector('.alert-threshold-input').value);
    if (!alert) {
      return;
    }

    if (!Number.isFinite(threshold) || threshold <= 0) {
      elements.statusText.textContent = 'Enter a valid alert price.';
      return;
    }

    try {
      await upsertPriceAlert({ ...alert, threshold });
      showPriceAlertSavedDialog({ ...alert, threshold });
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to save alert'}`;
    }
    return;
  }

  const resetBtn = event.target.closest('.alert-reset-btn');
  if (resetBtn) {
    const row = resetBtn.closest('.alert-row');
    try {
      await resetPriceAlert(row.dataset.alertId);
      elements.statusText.textContent = 'Alert reset. It will notify again on the next matching check.';
    } catch (error) {
      elements.statusText.textContent = `Error: ${error?.message || 'Failed to reset alert'}`;
    }
  }
});

elements.syncApiAlertsBtn.addEventListener('click', async () => {
  try {
    await syncApiPriceAlerts();
  } catch (error) {
    elements.statusText.textContent = `Error: ${error?.message || 'Failed to sync API alerts'}`;
  }
});

elements.stocksList.addEventListener('click', async (event) => {
  const removeButton = event.target.closest('.stock-remove-btn');
  if (!removeButton) {
    return;
  }

  try {
    await removeTrackedStock(removeButton.dataset.key);
  } catch (error) {
    elements.statusText.textContent = `Error: ${error?.message || 'Failed to remove stock'}`;
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest('#stockSearchInput') && !event.target.closest('#stockSearchResults')) {
    clearSearchResults(elements.stockSearchResults, 'stock');
  }

  if (!event.target.closest('#alertStockSearchInput') && !event.target.closest('#alertSearchResults')) {
    clearSearchResults(elements.alertSearchResults, 'alert');
  }
});

elements.stockSort.value = currentStockSort;
switchTab('india');
switchInnerTab('tracker');
await loadTrackedStocks();
await loadPriceAlerts();
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







