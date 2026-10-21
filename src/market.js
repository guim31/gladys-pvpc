// -----------------------------------------------------------------------------
// The prices the integration knows, and when to ask REE again.
//
// One request per refresh (yesterday, today and tomorrow, Madrid days:
// yesterday's last hour tells whether the price just went under a threshold
// at midnight). The refresh
// policy keeps the load on this free public API as low as the use allows:
//   - once an hour;
//   - every 15 minutes from 20:15 (Madrid) while tomorrow's prices are
//     missing: REE publishes them around 20:15 and the scenes and the widget
//     want them soon after;
//   - after a failure, again after 5, 10, 20, 40 then 60 minutes.
// The data of the last successful refresh stays in use while a refresh
// fails: prices are known a day ahead, an hour without the API changes
// nothing for the current price.
// -----------------------------------------------------------------------------

import { fetchPrices } from './ree.js';
import { rankOf, slotAfter, slotAt, slotsOfDay, summarize } from './prices.js';
import { addDays, marketDay, tariffPeriod } from './time.js';

const MINUTE = 60 * 1000;
export const REFRESH_MS = 60 * MINUTE;
export const TOMORROW_RETRY_MS = 15 * MINUTE;
/** Minutes after midnight (Madrid) from which tomorrow's prices are awaited. */
export const TOMORROW_FROM_MINUTE = 20 * 60 + 15;
const FAILURE_BACKOFF_MS = [5, 10, 20, 40, 60].map((minutes) => minutes * MINUTE);

const madridMinutes = (date) => {
  const [hour, minute] = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(date)
    .split(':')
    .map(Number);
  return hour * 60 + minute;
};

/**
 * @param {object} [options]
 * @param {typeof fetch} [options.fetch]
 * @param {() => number} [options.now]
 */
export function createMarket({ fetch = globalThis.fetch, now = () => Date.now() } = {}) {
  let slots = [];
  let lastSuccessAt = null;
  let lastAttemptAt = null;
  let failures = 0;
  // The zone of the prices in memory: another zone is another series.
  let fetchedZone = null;

  /** Whether a refresh is due at `at`, and why (for the debug log). */
  function dueReason(at, { zone }) {
    // Another zone is another series: no backoff delays it (an empty
    // snapshot until then).
    if (lastSuccessAt !== null && zone !== fetchedZone) {
      return 'zone changed';
    }
    if (lastAttemptAt !== null && failures > 0) {
      const wait = FAILURE_BACKOFF_MS[Math.min(failures, FAILURE_BACKOFF_MS.length) - 1];
      return at - lastAttemptAt >= wait ? 'retry after a failure' : null;
    }
    if (lastSuccessAt === null) {
      return 'first refresh';
    }
    if (at - lastSuccessAt >= REFRESH_MS) {
      return 'hourly refresh';
    }
    const today = marketDay(new Date(at));
    if (
      slotsOfDay(slots, addDays(today)).length === 0 &&
      madridMinutes(new Date(at)) >= TOMORROW_FROM_MINUTE &&
      at - lastAttemptAt >= TOMORROW_RETRY_MS
    ) {
      return "waiting for tomorrow's prices";
    }
    return null;
  }

  return {
    get lastSuccessAt() {
      return lastSuccessAt;
    },
    get failing() {
      return failures > 0;
    },

    /**
     * @param {{ zone: string }} config
     * @returns {string | null} why a refresh is due now, or null
     */
    dueReason(config) {
      return dueReason(now(), config);
    },

    /**
     * Read the prices of yesterday, today and tomorrow.
     * @param {{ zone: string }} config
     * @throws {import('./ree.js').ReeError} data kept as it was
     */
    async refresh(config) {
      const at = now();
      lastAttemptAt = at;
      const today = marketDay(new Date(at));
      try {
        const fresh = await fetchPrices({
          from: addDays(today, -1),
          to: addDays(today),
          zone: config.zone,
          fetch,
        });
        const changed = config.zone !== fetchedZone || fingerprint(fresh) !== fingerprint(slots);
        slots = fresh;
        fetchedZone = config.zone;
        lastSuccessAt = at;
        failures = 0;
        return { changed };
      } catch (err) {
        failures += 1;
        throw err;
      }
    },

    /**
     * Everything the device, the widget, the triggers and the scene action
     * read, at `at`.
     * @param {ReturnType<import('./config.js').normalizeConfig>} config
     * @param {Date} [at]
     */
    snapshot(config, at = new Date(now())) {
      const known = config.zone === fetchedZone ? slots : [];
      const today = marketDay(at);
      const todaySlots = slotsOfDay(known, today);
      const tomorrowSlots = slotsOfDay(known, addDays(today));
      const current = slotAt(known, at);
      const currentToday = current && todaySlots.includes(current) ? current : null;
      return {
        at,
        today,
        zone: config.zone,
        slots: known,
        current,
        next: current ? slotAfter(known, current) : null,
        rank: currentToday ? rankOf(todaySlots, currentToday) : null,
        period: tariffPeriod(at, config.zone),
        todaySlots,
        todaySummary: summarize(todaySlots),
        // The cheapest hour of today not over yet, the current one included.
        remainingSummary: summarize(todaySlots.filter((slot) => slot.end > at)),
        tomorrowSlots,
        tomorrowSummary: summarize(tomorrowSlots),
      };
    },
  };
}

function fingerprint(list) {
  return JSON.stringify(list.map((slot) => [slot.start.getTime(), slot.price]));
}
