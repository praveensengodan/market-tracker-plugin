// Holidays Manager - Fetches from NSE API and caches locally
// Fetches once per day and shares cache across background worker and UI

const NSE_HOLIDAYS_API = 'https://www.nseindia.com/api/holiday-master?type=trading';
const CACHE_KEY = 'nseHolidaysCacheV2';
const CACHE_TIMESTAMP_KEY = 'nseHolidaysCacheTimestampV2';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const FALLBACK_CM_HOLIDAYS = {
    '2026-01-15': 'Municipal Corporation Election - Maharashtra',
    '2026-01-26': 'Republic Day',
    '2026-03-03': 'Holi',
    '2026-03-26': 'Shri Ram Navami',
    '2026-03-31': 'Shri Mahavir Jayanti',
    '2026-04-03': 'Good Friday',
    '2026-04-14': 'Dr. Baba Saheb Ambedkar Jayanti',
    '2026-05-01': 'Maharashtra Day',
    '2026-05-28': 'Bakri Id',
    '2026-06-26': 'Muharram',
    '2026-09-14': 'Ganesh Chaturthi',
    '2026-10-02': 'Mahatma Gandhi Jayanti',
    '2026-10-20': 'Dussehra',
    '2026-11-10': 'Diwali-Balipratipada',
    '2026-11-24': 'Prakash Gurpurb Sri Guru Nanak Dev',
    '2026-12-25': 'Christmas'
};

// In-memory cache (populated from storage on first use)
let holidaysMemoryCache = { ...FALLBACK_CM_HOLIDAYS }; // Start with fallback holidays, not null
let cacheInitialized = false;

function withFallbackHolidays(holidays = {}) {
    return {
        ...FALLBACK_CM_HOLIDAYS,
        ...holidays
    };
}

/**
 * Fetch holidays from NSE API
 */
async function fetchHolidaysFromAPI() {
    try {
        const response = await fetch(NSE_HOLIDAYS_API);
        if (!response.ok) {
            throw new Error(`NSE API error: ${response.status}`);
        }
        const data = await response.json();

        // Use only the CM segment from NSE holiday response.
        // Weekend dates inside CM are ignored because weekends are already handled separately.
        const holidays = {};
        const segmentData = Array.isArray(data?.CM) ? data.CM : [];
        const monthMap = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };

        segmentData.forEach((item) => {
            if (!item?.tradingDate || !/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(item.tradingDate)) {
                return;
            }

            const [day, month, year] = item.tradingDate.split('-');
            const monthNum = monthMap[month] || '01';
            const dateKey = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
            const weekday = new Date(`${dateKey}T00:00:00`).getDay();

            if (weekday === 0 || weekday === 6) {
                return;
            }

            holidays[dateKey] = item.description || 'CM Holiday';
        });

        return Object.keys(holidays).length > 0 ? withFallbackHolidays(holidays) : withFallbackHolidays();
    } catch (error) {
        console.error('Failed to fetch NSE holidays:', error);
        return null;
    }
}

/**
 * Get cached holidays from storage
 */
async function getCachedHolidays() {
    try {
        const storage = await chrome.storage.local.get([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
        const cached = storage[CACHE_KEY];
        const timestamp = storage[CACHE_TIMESTAMP_KEY];

        if (!cached || !timestamp) {
            return null;
        }

        // Check if cache is still valid
        const now = Date.now();
        if (now - timestamp > CACHE_DURATION_MS) {
            return null; // Cache expired
        }

        return cached;
    } catch (error) {
        console.error('Failed to get cached holidays:', error);
        return null;
    }
}

/**
 * Clear the cached holidays from storage
 */
async function clearCachedHolidays() {
    try {
        await chrome.storage.local.remove([CACHE_KEY, CACHE_TIMESTAMP_KEY]);
    } catch (error) {
        console.error('Failed to clear cached holidays:', error);
    }
}
async function cacheHolidays(holidays) {
    try {
        await chrome.storage.local.set({
            [CACHE_KEY]: withFallbackHolidays(holidays),
            [CACHE_TIMESTAMP_KEY]: Date.now()
        });
    } catch (error) {
        console.error('Failed to cache holidays:', error);
    }
}

/**
 * Load holidays into memory cache from storage
 */
async function loadMemoryCache() {
    if (cacheInitialized) {
        return holidaysMemoryCache;
    }

    const cached = await getCachedHolidays();
    if (cached) {
        holidaysMemoryCache = withFallbackHolidays(cached);
    }

    cacheInitialized = true;
    return holidaysMemoryCache;
}

/**
 * Get holiday name for a date (YYYY-MM-DD format)
 * Synchronous - reads from memory cache (populated during initialization)
 */
export function getNseHolidayName(dateKey) {
    try {
        if (!dateKey) {
            return null;
        }

        const result = holidaysMemoryCache && holidaysMemoryCache[dateKey] ? holidaysMemoryCache[dateKey] : null;
        return result;
    } catch (error) {
        console.error('Error getting holiday name:', error);
        return null;
    }
}

/**
 * Async version for manual refresh - fetches from API if cache expired
 */
export async function getNseHolidayNameAsync(dateKey) {
    try {
        if (!cacheInitialized) {
            await loadMemoryCache();
        }

        if (holidaysMemoryCache && holidaysMemoryCache[dateKey]) {
            return holidaysMemoryCache[dateKey];
        }

        // If not in cache or cache empty, try to fetch fresh data
        const cached = await getCachedHolidays();
        if (cached) {
            holidaysMemoryCache = withFallbackHolidays(cached);
            return holidaysMemoryCache[dateKey] || null;
        }

        // Cache expired or doesn't exist, fetch from API
        const fresh = await fetchHolidaysFromAPI();
        if (fresh) {
            await cacheHolidays(fresh);
            holidaysMemoryCache = withFallbackHolidays(fresh);
            return fresh[dateKey] || null;
        }

        return null;
    } catch (error) {
        console.error('Error getting holiday name:', error);
        return null;
    }
}

/**
 * Force refresh holidays from API (bypasses cache duration)
 */
export async function refreshHolidaysFromAPI() {
    try {
        const fresh = await fetchHolidaysFromAPI();

        if (fresh && Object.keys(fresh).length > 0) {
            await cacheHolidays(fresh);
            holidaysMemoryCache = withFallbackHolidays(fresh);
            cacheInitialized = true;
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to refresh holidays:', error);
        return false;
    }
}

/**
 * Initialize holidays cache on startup (from background worker)
 */
export async function initializeHolidaysCache() {
    try {
        const cached = await getCachedHolidays();
        if (cached && Object.keys(cached).length > 0) {
            holidaysMemoryCache = withFallbackHolidays(cached);
            cacheInitialized = true;
            return; // Cache still valid
        }

        // Cache is empty or doesn't exist, clear and fetch fresh
        if (cached === null || Object.keys(cached || {}).length === 0) {
            await clearCachedHolidays();
        }

        await refreshHolidaysFromAPI();
    } catch (error) {
        console.error('Failed to initialize holidays cache:', error);
    }
}

/**
 * Ensure cache is loaded (safe to call from any context)
 * Returns a promise that resolves when cache is ready
 */
export async function ensureHolidaysCacheLoaded() {
    if (cacheInitialized) {
        return; // Already loaded
    }

    try {
        const cached = await getCachedHolidays();
        if (cached && Object.keys(cached).length > 0) {
            holidaysMemoryCache = withFallbackHolidays(cached);
            cacheInitialized = true;
            return;
        }

        // Cache is empty or doesn't exist, clear it and fetch fresh
        if (cached === null || Object.keys(cached || {}).length === 0) {
            await clearCachedHolidays();
        }

        const fresh = await fetchHolidaysFromAPI();

        if (fresh && Object.keys(fresh).length > 0) {
            await cacheHolidays(fresh);
            holidaysMemoryCache = fresh;
            cacheInitialized = true;
        } else {
            cacheInitialized = true;
        }
    } catch (error) {
        cacheInitialized = true;
        console.error('Error ensuring holidays cache loaded:', error);
    }
}

