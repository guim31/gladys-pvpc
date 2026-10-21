// -----------------------------------------------------------------------------
// Scene triggers (manifest `scene_triggers`, Gladys 5.1+).
//
// What the device states cannot say: "it starts NOW". The rank of the current
// hour is a state (a scene can wait for "rank ≤ 4" with the core's own
// threshold), but the start of the cheapest 3-hour window of the day — the
// moment to start a dishwasher once — is an event.
//
//   cheapest_window_started    the cheapest run of N consecutive hours of the
//                              day begins (N = 1 is the cheapest hour);
//   cheap_hour_started         one of the N cheapest hours of the day begins
//                              (they may be apart: a boiler, a car charger);
//   price_below_started        the price goes under a threshold: the first
//                              hour of a run of hours under it begins, with
//                              the end of that run (when it lasts);
//   tomorrow_prices_published  REE published tomorrow's prices (fired by
//                              src/app.js, once a day).
//
// The core filters scene events on equality and membership only, so the
// scene author picks N (or the threshold) in a required select, and the
// integration fires one event per value that matches the hour: at the start
// of the third-cheapest hour, `cheap_hour_started` goes out with hours = "3",
// "4", "5"... A scene listening for "4 cheapest hours" thus runs once, at the
// start of each of these hours. At most 23 events an hour, far from the 300
// per minute of the core.
// -----------------------------------------------------------------------------

import { cheapestWindow, rankOf, roundPrice, slotAfter, summarize } from './prices.js';
import { marketTime } from './time.js';

export const TRIGGER = {
  CHEAPEST_WINDOW: 'cheapest_window_started',
  CHEAP_HOUR: 'cheap_hour_started',
  PRICE_BELOW: 'price_below_started',
  TOMORROW_PUBLISHED: 'tomorrow_prices_published',
};

/** The values the scene author can pick, as declared in the manifest options. */
export const WINDOW_HOURS = [1, 2, 3, 4, 5, 6, 8];
export const CHEAP_HOURS = [1, 2, 3, 4, 5, 6, 8, 10, 12];
export const THRESHOLDS = ['0.05', '0.08', '0.10', '0.12', '0.15', '0.20', '0.25'];

/**
 * The scene events to fire when `slot` begins.
 * @param {Array} daySlots the slots of the Madrid day of `slot`
 * @param {{ start: Date, end: Date, price: number }} slot
 * @param {object} [options]
 * @param {Array} [options.slots] every known slot (the hour before, the run after)
 * @param {string} [options.timeZone] clock of the times sent
 * @returns {Array<{ key: string, data: object }>}
 */
export function eventsForSlot(daySlots, slot, { slots = daySlots, timeZone } = {}) {
  if (!daySlots.includes(slot)) {
    return [];
  }
  const time = (date) => marketTime(date, timeZone);
  const events = [];

  for (const hours of WINDOW_HOURS) {
    const window = cheapestWindow(daySlots, hours);
    if (window && window.start.getTime() === slot.start.getTime()) {
      events.push({
        key: TRIGGER.CHEAPEST_WINDOW,
        data: {
          hours: String(hours),
          average_price: roundPrice(window.average),
          start_time: time(window.start),
          end_time: time(window.end),
        },
      });
    }
  }

  const rank = rankOf(daySlots, slot);
  for (const hours of CHEAP_HOURS) {
    if (rank <= hours) {
      events.push({
        key: TRIGGER.CHEAP_HOUR,
        data: {
          hours: String(hours),
          rank,
          price: roundPrice(slot.price),
          start_time: time(slot.start),
          end_time: time(slot.end),
        },
      });
    }
  }

  const before = slots.find((other) => other.end.getTime() === slot.start.getTime());
  for (const threshold of THRESHOLDS) {
    const limit = Number(threshold);
    if (slot.price >= limit || (before && before.price < limit)) {
      continue;
    }
    // The run of hours under the threshold, as far as the prices are known.
    let last = slot;
    let count = 1;
    for (
      let next = slotAfter(slots, last);
      next && next.price < limit;
      next = slotAfter(slots, next)
    ) {
      last = next;
      count += 1;
    }
    events.push({
      key: TRIGGER.PRICE_BELOW,
      data: {
        threshold,
        price: roundPrice(slot.price),
        hours: count,
        start_time: time(slot.start),
        end_time: time(last.end),
      },
    });
  }
  return events;
}

/**
 * The event saying tomorrow's prices are out.
 * @param {Array} tomorrowSlots
 * @param {string} [timeZone]
 * @returns {{ key: string, data: object } | null}
 */
export function tomorrowEvent(tomorrowSlots, timeZone) {
  const summary = summarize(tomorrowSlots);
  if (!summary) {
    return null;
  }
  const window = cheapestWindow(tomorrowSlots, 3);
  return {
    key: TRIGGER.TOMORROW_PUBLISHED,
    data: {
      average_price: roundPrice(summary.average),
      min_price: roundPrice(summary.min.price),
      cheapest_time: marketTime(summary.min.start, timeZone),
      max_price: roundPrice(summary.max.price),
      priciest_time: marketTime(summary.max.start, timeZone),
      cheapest_3h_start: window ? marketTime(window.start, timeZone) : '',
    },
  };
}
