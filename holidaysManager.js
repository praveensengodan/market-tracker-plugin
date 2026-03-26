// Holidays Manager - Fetches from NSE API and caches locally
// Fetches once per day and shares cache across background worker and UI

const NSE_HOLIDAYS_API = 'https://www.nseindia.com/api/holiday-master?type=trading';
const CACHE_KEY = 'nseHolidaysCache';
const CACHE_TIMESTAMP_KEY = 'nseHolidaysCacheTimestamp';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache (populated from storage on first use)
let holidaysMemoryCache = {}; // Start with empty object, not null
let cacheInitialized = false;

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

        // API returns an object with segment keys (CBM, FO, etc.)
        // Each segment contains an array of holiday objects
        // Example: { "CBM": [{tradingDate: "26-Jan-2026", ...}], "FO": [...] }
        const holidays = {};
        const segments = Object.keys(data);

        segments.forEach(segment => {
            const segmentData = data[segment];

            if (Array.isArray(segmentData)) {
                segmentData.forEach((item, index) => {
                    if (item.tradingDate) {
                        // Normalize date from "DD-MMM-YYYY" to "YYYY-MM-DD"
                        let dateKey = item.tradingDate;
                        const originalDt = item.tradingDate;

                        // Convert "26-Jan-2026" to "2026-01-26"
                        if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateKey)) {
                            const [day, month, year] = dateKey.split('-');
                            const monthMap = {
                                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                            };
                            const monthNum = monthMap[month] || '01';
                            dateKey = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;

                            // Store with description or default name
                            const description = item.description || `${segment} Holiday`;
                            holidays[dateKey] = description;
                        }
                    }
                });
            }
        });

        return Object.keys(holidays).length > 0 ? holidays : null;
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
            [CACHE_KEY]: holidays,
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
        holidaysMemoryCache = cached;
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
            holidaysMemoryCache = cached;
            return holidaysMemoryCache[dateKey] || null;
        }

        // Cache expired or doesn't exist, fetch from API
        const fresh = await fetchHolidaysFromAPI();
        if (fresh) {
            await cacheHolidays(fresh);
            holidaysMemoryCache = fresh;
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
            holidaysMemoryCache = fresh;
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
            holidaysMemoryCache = cached;
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
            holidaysMemoryCache = cached;
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
