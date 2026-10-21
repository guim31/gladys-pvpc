// -----------------------------------------------------------------------------
// Read the real PVPC prices (yesterday to tomorrow), read-only, through the
// client the integration uses — to run from a machine that has the network:
//
//   node scripts/probe.mjs [zone] [YYYY-MM-DD]
//
// No account, no key, nothing sensitive: public regulated prices.
// -----------------------------------------------------------------------------

import { fetchPrices, ZONES } from '../src/ree.js';
import { slotAt, slotsOfDay, summarize } from '../src/prices.js';
import { addDays, marketDay, marketTime, tariffPeriod, zoneTimezone } from '../src/time.js';

const zone = process.argv[2] ?? 'peninsula';
const today = process.argv[3] ?? marketDay(new Date());
if (!Object.hasOwn(ZONES, zone)) {
  console.log(`Unknown zone ${zone}: ${Object.keys(ZONES).join(', ')}`);
  process.exit(2);
}
const timeZone = zoneTimezone(zone);

try {
  const started = Date.now();
  const slots = await fetchPrices({ from: addDays(today, -1), to: addDays(today), zone });
  console.log(`${zone}: ${slots.length} hourly prices in ${Date.now() - started} ms`);
  for (const [label, day] of [
    ['yesterday', addDays(today, -1)],
    ['today', today],
    ['tomorrow', addDays(today)],
  ]) {
    const summary = summarize(slotsOfDay(slots, day));
    console.log(
      `  ${label.padEnd(9)} ${day}: ${slotsOfDay(slots, day).length} hours` +
        (summary
          ? `, avg ${summary.average.toFixed(5)} €/kWh, min ${summary.min.price} at ` +
            `${marketTime(summary.min.start, timeZone)}, max ${summary.max.price} at ` +
            `${marketTime(summary.max.start, timeZone)}`
          : ''),
    );
  }
  const now = new Date();
  const current = slotAt(slots, now);
  console.log(
    `  now ${marketTime(now, timeZone)}: ${current ? `${current.price} €/kWh` : 'no price'}, ` +
      `2.0TD period ${tariffPeriod(now, zone)}`,
  );
} catch (err) {
  console.log(`FAILED (${err.kind ?? 'error'}) ${err.message}`);
  process.exit(1);
}
