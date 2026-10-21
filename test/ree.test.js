// -----------------------------------------------------------------------------
// The REE client, on real answers (test/fixtures/ree/), and the 2.0TD periods.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPrices, parsePrices, ReeError } from '../src/ree.js';
import { PERIOD, tariffPeriod } from '../src/time.js';
import { createFakeApi, FIXTURES } from './helpers/world.js';

test('the PVPC series in €/kWh, the 15-minute spot series ignored', () => {
  const slots = parsePrices(FIXTURES.twoDays);
  assert.equal(slots.length, 48);
  assert.equal(slots[0].price, 0.20894); // 208.94 €/MWh
  assert.equal(slots[0].end - slots[0].start, 3600000);
});

test('the day the clocks go back: two distinct 02:00, sorted', () => {
  const slots = parsePrices(FIXTURES.dstOctober);
  assert.equal(slots.length, 25);
  assert.equal(slots[2].start.toISOString(), '2025-10-26T00:00:00.000Z'); // 02:00 CEST
  assert.equal(slots[3].start.toISOString(), '2025-10-26T01:00:00.000Z'); // 02:00 CET
  slots.slice(1).forEach((slot, index) => assert.ok(slot.start >= slots[index].end));
});

test('unreadable values are skipped one by one, an unknown answer is an error', () => {
  const body = structuredClone(FIXTURES.twoDays);
  const values = body.included.find((item) => item.id === '1001').attributes.values;
  values[0].value = null;
  values[1].datetime = 'yesterday';
  assert.equal(parsePrices(body).length, 46);
  assert.deepEqual(parsePrices({ included: [] }), []);
  assert.throws(() => parsePrices(FIXTURES.error), ReeError);
  assert.throws(() => parsePrices(null), ReeError);
});

test('the request: Madrid days, hourly, the geo id of the zone', async () => {
  const api = createFakeApi();
  const slots = await fetchPrices({
    from: '2026-10-20',
    to: '2026-10-21',
    zone: 'melilla',
    fetch: api.fetch,
  });
  assert.equal(slots.length, 48);
  const { searchParams } = api.requests[0].url;
  assert.equal(searchParams.get('start_date'), '2026-10-20T00:00');
  assert.equal(searchParams.get('end_date'), '2026-10-21T23:59');
  assert.equal(searchParams.get('time_trunc'), 'hour');
  assert.equal(searchParams.get('geo_limit'), 'melilla');
  assert.equal(searchParams.get('geo_ids'), '8745');
  assert.match(api.requests[0].headers['User-Agent'], /gladys-pvpc/);
});

test('HTTP 502 "no data", network errors: a ReeError saying why', async () => {
  const api = createFakeApi();
  await assert.rejects(
    fetchPrices({ from: '2030-01-01', to: '2030-01-02', zone: 'peninsula', fetch: api.fetch }),
    (err) =>
      err instanceof ReeError && err.status === 502 && /no están disponibles/.test(err.message),
  );
  api.down = true;
  await assert.rejects(
    fetchPrices({ from: '2026-10-20', to: '2026-10-21', zone: 'peninsula', fetch: api.fetch }),
    /REE unreachable \(ENOTFOUND\)/,
  );
  const garbage = async () => new Response('<html>', { status: 200 });
  await assert.rejects(
    fetchPrices({ from: '2026-10-20', to: '2026-10-21', zone: 'peninsula', fetch: garbage }),
    /unreadable/,
  );
});

test('2.0TD periods on a weekday, mainland and islands', () => {
  // Tuesday 20 October 2026, CEST (UTC+2).
  const at = (hour) => new Date(Date.UTC(2026, 9, 20, hour - 2, 30));
  const day = Array.from({ length: 24 }, (_, hour) => tariffPeriod(at(hour), 'peninsula'));
  const { PUNTA: P, LLANO: L, VALLE: V } = PERIOD;
  assert.deepEqual(day, [V, V, V, V, V, V, V, V, L, L, P, P, P, P, L, L, L, L, P, P, P, P, L, L]);
  assert.deepEqual(
    Array.from({ length: 24 }, (_, hour) => tariffPeriod(at(hour), 'baleares')),
    day,
  );
  // Canary Islands: the same hours in their own time, an hour behind Madrid.
  assert.equal(tariffPeriod(at(10), 'canarias'), L); // 09:30 in Las Palmas
  assert.equal(tariffPeriod(at(11), 'canarias'), P);
});

test('2.0TD periods in Ceuta and Melilla: peak 11-15 and 19-23', () => {
  const at = (hour) => new Date(Date.UTC(2026, 9, 20, hour - 2, 30));
  const { PUNTA: P, LLANO: L, VALLE: V } = PERIOD;
  assert.deepEqual(
    Array.from({ length: 24 }, (_, hour) => tariffPeriod(at(hour), 'ceuta')),
    [V, V, V, V, V, V, V, V, L, L, L, P, P, P, P, L, L, L, L, P, P, P, P, L],
  );
});

test('weekends and fixed national holidays are valle all day', () => {
  const noon = (iso) => new Date(`${iso}T10:30:00Z`);
  assert.equal(tariffPeriod(noon('2026-10-24'), 'peninsula'), PERIOD.VALLE); // Saturday
  assert.equal(tariffPeriod(noon('2026-10-25'), 'peninsula'), PERIOD.VALLE); // Sunday
  assert.equal(tariffPeriod(noon('2026-10-12'), 'peninsula'), PERIOD.VALLE); // Fiesta Nacional, Monday
  assert.equal(tariffPeriod(noon('2026-12-08'), 'melilla'), PERIOD.VALLE); // Inmaculada, Tuesday
  assert.equal(tariffPeriod(noon('2026-04-03'), 'peninsula'), PERIOD.PUNTA); // Good Friday: no fixed date
});
