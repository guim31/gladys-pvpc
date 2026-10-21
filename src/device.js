// -----------------------------------------------------------------------------
// The one device: the PVPC prices of the Spanish regulated tariff.
//
// Its external id is built on the country ("es"), the only identity the prices
// have: changing the zone keeps the device, its history and the scenes using
// it. Feature keys are forever, like the ids built on them.
//
// Every feature is a read-only sensor. Prices use `currency/decimal` in euros
// (Gladys has no €/kWh unit: the name carries it); the hours are `text/text`
// ("03:00", local time of the zone); the rank of the current hour and the
// 2.0TD period are `counter-sensor/integer`, so a scene can say "rank ≤ 4" or
// "period = 3" with the core's own conditions; "tomorrow published" is an
// `input/binary`.
// -----------------------------------------------------------------------------

import {
  DEVICE_FEATURE_CATEGORIES,
  DEVICE_FEATURE_TYPES,
  DEVICE_FEATURE_UNITS,
  DEVICE_POLL_FREQUENCIES,
} from '@gladysassistant/integration-sdk';
import { NAMES, PERIOD_NAMES } from './i18n.js';
import { roundPrice } from './prices.js';
import { marketTime, zoneTimezone } from './time.js';

const DEVICE_TYPE = 'pvpc';
const COUNTRY = 'es';

export const FEATURE = {
  PRICE_NOW: 'price_now',
  PRICE_NEXT: 'price_next',
  PRICE_AVG_TODAY: 'price_avg_today',
  PRICE_MIN_TODAY: 'price_min_today',
  PRICE_MAX_TODAY: 'price_max_today',
  CHEAPEST_HOUR_TODAY: 'cheapest_hour_today',
  CHEAPEST_HOUR_REMAINING: 'cheapest_hour_remaining',
  PRICIEST_HOUR_TODAY: 'priciest_hour_today',
  PRICE_RANK_NOW: 'price_rank_now',
  TARIFF_PERIOD: 'tariff_period',
  TARIFF_PERIOD_NAME: 'tariff_period_name',
  TOMORROW_AVAILABLE: 'tomorrow_available',
};

// Display bounds only (the core never applies them): the PVPC stays well
// under 1 €/kWh, but it went over 0.5 in 2022.
const PRICE_BOUNDS = { min: 0, max: 1 };
// 25 hours on the day the clocks go back.
const RANK_BOUNDS = { min: 1, max: 25 };
const PERIOD_BOUNDS = { min: 1, max: 3 };
const BINARY_BOUNDS = { min: 0, max: 1 };
// text/text: min and max are NOT NULL in the core (422 on "Add to Gladys").
const TEXT_BOUNDS = { min: 0, max: 0 };

/** @param {object} gladys */
export function deviceIds(gladys) {
  return gladys.externalIds(DEVICE_TYPE, COUNTRY);
}

/**
 * @param {object} gladys
 * @param {ReturnType<import('./config.js').normalizeConfig>} config
 */
export function buildDevice(gladys, config) {
  const ids = deviceIds(gladys);
  const names = NAMES[config.language] ?? NAMES.en;
  const sensor = (key, category, type, bounds, extra = {}) => ({
    name: names[key],
    external_id: ids.feature(key),
    category,
    type,
    ...bounds,
    read_only: true,
    has_feedback: false,
    keep_history: true,
    ...extra,
  });
  const price = (key) =>
    sensor(
      key,
      DEVICE_FEATURE_CATEGORIES.CURRENCY,
      DEVICE_FEATURE_TYPES.CURRENCY.DECIMAL,
      PRICE_BOUNDS,
      { unit: DEVICE_FEATURE_UNITS.EURO },
    );
  const text = (key) =>
    sensor(key, DEVICE_FEATURE_CATEGORIES.TEXT, DEVICE_FEATURE_TYPES.TEXT.TEXT, TEXT_BOUNDS, {
      keep_history: false,
    });
  const integer = (key, bounds) =>
    sensor(
      key,
      DEVICE_FEATURE_CATEGORIES.COUNTER_SENSOR,
      DEVICE_FEATURE_TYPES.SENSOR.INTEGER,
      bounds,
    );

  return {
    name: 'PVPC',
    external_id: ids.device,
    model: 'PVPC 2.0TD',
    // Polled once a minute by the core when it does (Gladys#3198: often not):
    // the container's own timer does the work, onPoll is the fallback.
    should_poll: true,
    poll_frequency: DEVICE_POLL_FREQUENCIES.EVERY_MINUTES,
    features: [
      price(FEATURE.PRICE_NOW),
      price(FEATURE.PRICE_NEXT),
      price(FEATURE.PRICE_AVG_TODAY),
      price(FEATURE.PRICE_MIN_TODAY),
      price(FEATURE.PRICE_MAX_TODAY),
      text(FEATURE.CHEAPEST_HOUR_TODAY),
      text(FEATURE.CHEAPEST_HOUR_REMAINING),
      text(FEATURE.PRICIEST_HOUR_TODAY),
      integer(FEATURE.PRICE_RANK_NOW, RANK_BOUNDS),
      integer(FEATURE.TARIFF_PERIOD, PERIOD_BOUNDS),
      text(FEATURE.TARIFF_PERIOD_NAME),
      sensor(
        FEATURE.TOMORROW_AVAILABLE,
        DEVICE_FEATURE_CATEGORIES.INPUT,
        DEVICE_FEATURE_TYPES.SENSOR.BINARY,
        BINARY_BOUNDS,
      ),
    ],
  };
}

/**
 * The states of the device for a market snapshot. A value the snapshot does
 * not know (no price for the current hour) is left out: the feature keeps its
 * last state rather than receiving a made-up one.
 * @param {object} gladys
 * @param {ReturnType<ReturnType<import('./market.js').createMarket>['snapshot']>} snapshot
 * @param {ReturnType<import('./config.js').normalizeConfig>} config
 */
export function buildStates(gladys, snapshot, config) {
  const ids = deviceIds(gladys);
  const timeZone = zoneTimezone(snapshot.zone);
  const states = [];
  const number = (key, value) =>
    states.push({ device_feature_external_id: ids.feature(key), state: value });
  const text = (key, value) =>
    states.push({ device_feature_external_id: ids.feature(key), text: value });

  if (snapshot.current) {
    number(FEATURE.PRICE_NOW, roundPrice(snapshot.current.price));
  }
  if (snapshot.next) {
    number(FEATURE.PRICE_NEXT, roundPrice(snapshot.next.price));
  }
  const summary = snapshot.todaySummary;
  if (summary) {
    number(FEATURE.PRICE_AVG_TODAY, roundPrice(summary.average));
    number(FEATURE.PRICE_MIN_TODAY, roundPrice(summary.min.price));
    number(FEATURE.PRICE_MAX_TODAY, roundPrice(summary.max.price));
    text(FEATURE.CHEAPEST_HOUR_TODAY, marketTime(summary.min.start, timeZone));
    text(FEATURE.PRICIEST_HOUR_TODAY, marketTime(summary.max.start, timeZone));
  }
  if (snapshot.remainingSummary) {
    text(
      FEATURE.CHEAPEST_HOUR_REMAINING,
      marketTime(snapshot.remainingSummary.min.start, timeZone),
    );
  }
  if (snapshot.rank !== null) {
    number(FEATURE.PRICE_RANK_NOW, snapshot.rank);
  }
  number(FEATURE.TARIFF_PERIOD, snapshot.period);
  const periodNames = PERIOD_NAMES[config.language] ?? PERIOD_NAMES.en;
  text(FEATURE.TARIFF_PERIOD_NAME, periodNames[snapshot.period]);
  // Only once REE answered: before that, "not published" would be a guess.
  if (snapshot.todaySlots.length > 0) {
    number(FEATURE.TOMORROW_AVAILABLE, snapshot.tomorrowSlots.length > 0 ? 1 : 0);
  }
  return states;
}
