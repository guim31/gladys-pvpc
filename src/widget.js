// -----------------------------------------------------------------------------
// Dashboard widget (manifest `widgets`, Gladys 5.1+): the prices of today and
// tomorrow (PVPC 2.0TD).
//
// Inline values, not device-bound tiles: the widget works before the device is
// added, and an inline tile shows "€/kWh" where a device tile could only say
// "€". Layout, within the core budget (8 components, 2 texts, 6 tiles, one
// focal, one status):
//   caption   what the price is ("PVPC 2.0TD, energy term, taxes excluded")
//   tiles     now, next hour, today's average
//   chart     today then tomorrow (step line: a price holds for the hour),
//             minimum and maximum marked, "now" drawn by the core
//   status    2.0TD period, cheapest hour left today, cheapest hour and
//             average of tomorrow (or when they are expected)
// -----------------------------------------------------------------------------

import { WIDGET_CHART_TYPES, WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { PERIOD_NAMES, pick, TEXT } from './i18n.js';
import { marketTime, zoneTimezone } from './time.js';

export const WIDGET = { PRICES: 'prices' };

const round3 = (value) => Math.round(value * 1000) / 1000;

/**
 * @param {number} value
 * @param {string} language
 */
export function formatPrice(value, language) {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

/**
 * Seconds until the next hour starts (the current price changes), within
 * the core bounds.
 * @param {Date} at
 */
function ttlSeconds(at) {
  const toNextHour = 3600 - Math.floor((at.getTime() % 3600000) / 1000);
  return Math.min(3600, Math.max(10, toNextHour + 5));
}

/**
 * @param {object} options
 * @param {ReturnType<ReturnType<import('./market.js').createMarket>['snapshot']>} options.snapshot
 * @param {string} options.language the user's language, sent by the core
 */
export function buildPricesContent({ snapshot, language }) {
  const t = (text) => pick(text, language);
  const { current, next, todaySlots, todaySummary, tomorrowSlots, tomorrowSummary } = snapshot;
  const time = (date) => marketTime(date, zoneTimezone(snapshot.zone));

  if (todaySlots.length === 0 && tomorrowSlots.length === 0) {
    return {
      ttl_seconds: 300,
      components: [{ type: 'text', variant: 'body', text: t(TEXT.noPrices) }],
    };
  }

  const components = [{ type: 'text', variant: 'caption', text: t(TEXT.caption) }];

  const tile = (label, price, icon) => {
    if (price !== undefined) {
      components.push({
        type: 'value',
        label: t(label),
        value: round3(price),
        unit: '€/kWh',
        icon,
      });
    }
  };
  tile(TEXT.now, current?.price, 'zap');
  tile(TEXT.nextHour, next?.price, 'clock');
  tile(TEXT.average, todaySummary?.average, 'activity');

  const points = (slots) =>
    slots.map((slot) => ({ t: slot.start.toISOString(), v: round3(slot.price) }));
  const series = [];
  if (todaySlots.length > 0) {
    series.push({ name: t(TEXT.today), points: points(todaySlots) });
  }
  if (tomorrowSlots.length > 0) {
    series.push({ name: t(TEXT.tomorrow), points: points(tomorrowSlots) });
  }
  const annotations = [];
  for (const summary of [todaySummary, tomorrowSummary]) {
    if (summary) {
      annotations.push(
        {
          t: summary.min.start.toISOString(),
          value: round3(summary.min.price),
          label: `${t(TEXT.min)} ${time(summary.min.start)}`,
          color: WIDGET_COLORS.SUCCESS,
        },
        {
          t: summary.max.start.toISOString(),
          value: round3(summary.max.price),
          label: `${t(TEXT.max)} ${time(summary.max.start)}`,
          color: WIDGET_COLORS.DANGER,
        },
      );
    }
  }
  components.push({
    type: 'chart',
    chart_type: WIDGET_CHART_TYPES.STEPLINE,
    unit: '€/kWh',
    series,
    annotations,
    now_marker: true,
  });

  const periods = PERIOD_NAMES[language] ?? PERIOD_NAMES.en;
  const items = [
    {
      label: t(TEXT.period),
      value: periods[snapshot.period],
      icon: 'clock',
      color:
        snapshot.period === 3
          ? WIDGET_COLORS.SUCCESS
          : snapshot.period === 1
            ? WIDGET_COLORS.DANGER
            : WIDGET_COLORS.WARNING,
    },
  ];
  const cheapest = (summary) =>
    `${time(summary.min.start)} · ${formatPrice(summary.min.price, language)} €/kWh`;
  if (snapshot.remainingSummary) {
    items.push({
      label: t(TEXT.cheapestLeft),
      value: cheapest(snapshot.remainingSummary),
      icon: 'trending-down',
      color: WIDGET_COLORS.SUCCESS,
    });
  }
  if (tomorrowSummary) {
    items.push(
      {
        label: t(TEXT.cheapestTomorrow),
        value: cheapest(tomorrowSummary),
        icon: 'trending-down',
        color: WIDGET_COLORS.SUCCESS,
      },
      {
        label: t(TEXT.tomorrowAverage),
        value: `${formatPrice(tomorrowSummary.average, language)} €/kWh`,
        icon: 'activity',
        color: WIDGET_COLORS.INFO,
      },
    );
  } else {
    items.push({
      label: t(TEXT.tomorrow),
      value: t(TEXT.tomorrowPending),
      icon: 'clock',
      color: WIDGET_COLORS.NEUTRAL,
    });
  }
  components.push({ type: 'status', items });

  return { ttl_seconds: ttlSeconds(snapshot.at), components };
}
