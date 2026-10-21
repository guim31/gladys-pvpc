// -----------------------------------------------------------------------------
// The clocks of the PVPC.
//
//   - The price day is a calendar day of Europe/Madrid, whatever the timezone
//     of the Gladys host: REE publishes the prices of a Madrid day, 23, 24 or
//     25 hours long. "Today", the day summary and the rank use it.
//   - The hours shown to the user (the cheapest hour, the scene variables)
//     and the 2.0TD tariff periods are in the official time of the zone:
//     Europe/Madrid, or Atlantic/Canary in the Canary Islands, an hour behind
//     (the periods follow the local time of each territory, CNMC Circular
//     3/2020).
// -----------------------------------------------------------------------------

export const MARKET_TIMEZONE = 'Europe/Madrid';
export const CANARY_TIMEZONE = 'Atlantic/Canary';

const formatters = new Map();

/**
 * @param {Date} date
 * @param {string} timeZone
 * @returns {{ year: string, month: string, day: string, hour: string, minute: string, weekday: string }}
 */
function parts(date, timeZone) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    });
    formatters.set(timeZone, formatter);
  }
  const found = {};
  for (const { type, value } of formatter.formatToParts(date)) {
    found[type] = value;
  }
  return found;
}

/**
 * The timezone of the hours shown to the user in a zone.
 * @param {string} zone
 */
export function zoneTimezone(zone) {
  return zone === 'canarias' ? CANARY_TIMEZONE : MARKET_TIMEZONE;
}

/**
 * The calendar day of an instant, `YYYY-MM-DD`, Madrid by default.
 * @param {Date} date
 * @param {string} [timeZone]
 */
export function marketDay(date, timeZone = MARKET_TIMEZONE) {
  const { year, month, day } = parts(date, timeZone);
  return `${year}-${month}-${day}`;
}

/**
 * The day after `day` (pure calendar arithmetic: no DST pitfall).
 * @param {string} day `YYYY-MM-DD`
 * @param {number} [offset] days to add, 1 by default
 */
export function addDays(day, offset = 1) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, date + offset)).toISOString().slice(0, 10);
}

/**
 * The clock time of an instant, `HH:MM`, Madrid by default.
 * @param {Date} date
 * @param {string} [timeZone]
 */
export function marketTime(date, timeZone = MARKET_TIMEZONE) {
  const { hour, minute } = parts(date, timeZone);
  return `${hour}:${minute}`;
}

/**
 * The hour of the clock, 0 to 23, Madrid by default.
 * @param {Date} date
 * @param {string} [timeZone]
 */
export function marketHour(date, timeZone = MARKET_TIMEZONE) {
  return Number(parts(date, timeZone).hour);
}

// The national holidays that turn a weekday into a whole "valle" day: the
// fixed-date ones that cannot be moved by a region (CNMC Circular 3/2020,
// art. 7; the list aiopvpc and the CNMC simulator use). Good Friday is a
// national holiday too, but without a fixed date: excluded by the Circular.
const NATIONAL_HOLIDAYS = new Set([
  '01-01',
  '01-06',
  '05-01',
  '08-15',
  '10-12',
  '11-01',
  '12-06',
  '12-08',
  '12-25',
]);

export const PERIOD = { PUNTA: 1, LLANO: 2, VALLE: 3 };

/**
 * The 2.0TD tariff period of an instant: 1 punta (peak), 2 llano (flat),
 * 3 valle (off-peak), in the local time of the zone.
 *
 * Weekdays: valle 00-08; Península, Baleares and Canarias punta 10-14 and
 * 18-22, llano 08-10, 14-18 and 22-24; Ceuta and Melilla shifted an hour,
 * punta 11-15 and 19-23. Saturdays, Sundays and national holidays: valle all
 * day.
 * @param {Date} date
 * @param {string} zone
 */
export function tariffPeriod(date, zone) {
  const local = parts(date, zoneTimezone(zone));
  if (
    local.weekday === 'Sat' ||
    local.weekday === 'Sun' ||
    NATIONAL_HOLIDAYS.has(`${local.month}-${local.day}`)
  ) {
    return PERIOD.VALLE;
  }
  const hour = Number(local.hour);
  if (hour < 8) {
    return PERIOD.VALLE;
  }
  const shift = zone === 'ceuta' || zone === 'melilla' ? 1 : 0;
  const peak = (from, to) => hour >= from + shift && hour < to + shift;
  return peak(10, 14) || peak(18, 22) ? PERIOD.PUNTA : PERIOD.LLANO;
}
