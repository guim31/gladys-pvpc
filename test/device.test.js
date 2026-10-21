// -----------------------------------------------------------------------------
// The device and its states, built from the real fixtures through the whole
// wiring (fake Gladys + fake REE API).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURE } from '../src/device.js';
import { createWorld, DAY_TIME, last } from './helpers/world.js';

test('one device, built on the country, with French names by default', async () => {
  const { gladys } = await createWorld();
  const [device] = gladys.fake.discoveredDevices;
  assert.equal(device.name, 'PVPC');
  assert.equal(device.external_id, 'ext:test-integration:pvpc:es');
  assert.deepEqual(
    device.features.map((f) => f.external_id.split(':').at(-1)),
    Object.values(FEATURE),
  );
  const names = Object.fromEntries(
    device.features.map((f) => [f.external_id.split(':').at(-1), f.name]),
  );
  assert.equal(names.price_now, 'Prix actuel (€/kWh)');
  assert.equal(names.tariff_period, 'Période 2.0TD (1 pointe, 3 creuse)');
  for (const feature of device.features) {
    assert.equal(feature.read_only, true, `${feature.name} is a sensor`);
  }
});

test('the states at 10:30 on Tuesday 20 October 2026, mainland', async () => {
  const { gladys } = await createWorld({ at: DAY_TIME, config: { language: 'es' } });
  assert.equal(last(gladys, FEATURE.PRICE_NOW), 0.29344); // 10:00-11:00, 293.44 €/MWh
  assert.equal(last(gladys, FEATURE.PRICE_NEXT), 0.2258);
  assert.equal(last(gladys, FEATURE.PRICE_AVG_TODAY), 0.22076);
  assert.equal(last(gladys, FEATURE.PRICE_MIN_TODAY), 0.04829);
  assert.equal(last(gladys, FEATURE.PRICE_MAX_TODAY), 0.37229);
  assert.equal(last(gladys, FEATURE.CHEAPEST_HOUR_TODAY), '15:00');
  assert.equal(last(gladys, FEATURE.CHEAPEST_HOUR_REMAINING), '15:00');
  assert.equal(last(gladys, FEATURE.PRICIEST_HOUR_TODAY), '19:00');
  assert.equal(last(gladys, FEATURE.PRICE_RANK_NOW), 19);
  assert.equal(last(gladys, FEATURE.TARIFF_PERIOD), 1); // punta 10-14
  assert.equal(last(gladys, FEATURE.TARIFF_PERIOD_NAME), 'Punta (P1)');
  assert.equal(last(gladys, FEATURE.TOMORROW_AVAILABLE), 1);
});

test('the cheapest hour left moves once the cheapest one is over', async () => {
  const { gladys } = await createWorld({ at: '2026-10-20T16:30:00Z' }); // 18:30
  assert.equal(last(gladys, FEATURE.CHEAPEST_HOUR_TODAY), '15:00');
  assert.equal(last(gladys, FEATURE.CHEAPEST_HOUR_REMAINING), '23:00');
});

test('Canary Islands: the same instants, shown an hour earlier', async () => {
  const { gladys, api } = await createWorld({ config: { zone: 'canarias' } });
  assert.equal(api.requests[0].url.searchParams.get('geo_ids'), '8742');
  assert.equal(last(gladys, FEATURE.PRICE_NOW), 0.29344);
  assert.equal(last(gladys, FEATURE.CHEAPEST_HOUR_TODAY), '14:00');
  // 09:30 in Las Palmas: llano 08-10.
  assert.equal(last(gladys, FEATURE.TARIFF_PERIOD), 2);
});

test('before 20:15, tomorrow is not published', async () => {
  const { gladys } = await createWorld({
    at: '2026-10-20T16:00:00Z',
    until: '2026-10-20T22:00:00Z',
  });
  assert.equal(last(gladys, FEATURE.TOMORROW_AVAILABLE), 0);
  assert.equal(last(gladys, FEATURE.PRICE_NOW), 0.31386);
});

test('a changed zone republishes every value, the device keeps its id', async () => {
  const { gladys, api } = await createWorld();
  const id = gladys.fake.discoveredDevices[0].external_id;
  const before = gladys.fake.states.length;
  await gladys.fake.configUpdated({ zone: 'ceuta' });
  assert.equal(api.requests.at(-1).url.searchParams.get('geo_limit'), 'ceuta');
  assert.equal(gladys.fake.discoveredDevices.at(-1).external_id, id);
  // Same prices, all sent again.
  assert.equal(gladys.fake.states.length - before, 12);
});

test('nothing is published before the user adds the device, everything once added', async () => {
  const { gladys } = await createWorld({ created: false });
  assert.equal(gladys.fake.states.length, 0);
  await gladys.fake.deviceCreated(gladys.fake.discoveredDevices[0]);
  assert.equal(gladys.fake.states.length, 12);
  assert.ok(gladys.fake.widgetRefreshes.length > 0, 'the widget is nudged');
});

test('an unchanged value is not sent again within the hour', async () => {
  const { gladys, app, clock } = await createWorld();
  const before = gladys.fake.states.length;
  clock.advance(60 * 1000);
  await app.cycle();
  assert.equal(gladys.fake.states.length, before);
  // The next hour: the current and next prices and the rank move, the
  // period stays punta.
  clock.set('2026-10-20T09:00:30Z');
  await app.cycle();
  const ids = gladys.fake.states
    .slice(before)
    .map((s) => s.device_feature_external_id.split(':').at(-1));
  assert.deepEqual(ids.sort(), ['price_next', 'price_now', 'price_rank_now']);
});

test("at 23:30 the next hour is tomorrow's, when it is published", async () => {
  const late = '2026-10-20T21:30:00Z';
  const { gladys } = await createWorld({ at: late });
  assert.equal(last(gladys, FEATURE.PRICE_NEXT), 0.19037);

  const early = await createWorld({ at: late, until: '2026-10-20T22:00:00Z' });
  assert.equal(last(early.gladys, FEATURE.PRICE_NEXT), undefined);
  assert.equal(last(early.gladys, FEATURE.PRICE_NOW), 0.21702);
});

test('the day the clocks go back has 25 hours, both 02:00 ranked', async () => {
  const { gladys, app, clock } = await createWorld({ at: '2025-10-26T00:30:00Z' }); // 02:30 CEST
  const first = last(gladys, FEATURE.PRICE_RANK_NOW);
  clock.set('2025-10-26T01:30:00Z'); // 02:30 CET, the second 02:00
  await app.cycle();
  const second = last(gladys, FEATURE.PRICE_RANK_NOW);
  assert.ok(first >= 1 && first <= 25 && second >= 1 && second <= 25);
  assert.notEqual(first, second);
  assert.equal(app.market.snapshot(app.config).todaySlots.length, 25);
  // A Sunday: valle all day.
  assert.equal(last(gladys, FEATURE.TARIFF_PERIOD), 3);
});

test('the day the clocks go forward has 23 hours', async () => {
  const { app } = await createWorld({ at: '2026-03-29T10:00:00Z' });
  const { todaySlots } = app.market.snapshot(app.config);
  assert.equal(todaySlots.length, 23);
  // 01:00 CET is followed by 03:00 CEST: no hole between the instants.
  todaySlots.slice(1).forEach((slot, index) => {
    assert.equal(slot.start.getTime(), todaySlots[index].end.getTime());
  });
});
