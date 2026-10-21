// -----------------------------------------------------------------------------
// The scene triggers: which events go out when an hour begins, once; and the
// daily "tomorrow's prices are published".
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrices } from '../src/ree.js';
import { slotsOfDay } from '../src/prices.js';
import { eventsForSlot, tomorrowEvent, TRIGGER } from '../src/triggers.js';
import { createWorld, FIXTURES } from './helpers/world.js';

const slots = parsePrices(FIXTURES.twoDays);
const day = slotsOfDay(slots, '2026-10-20');
const at = (hour) => day[hour]; // the slot starting at hour:00 in Madrid
const summary = (events) => events.map((e) => `${e.key}:${e.data.threshold ?? e.data.hours}`);
const of = (events, key) => events.filter((e) => e.key === key);

test('15:00, the cheapest hour of 20 October: every "N cheapest hours" and the 1-hour window', () => {
  const events = eventsForSlot(day, at(15), { slots });
  assert.deepEqual(summary(events), [
    'cheapest_window_started:1',
    'cheap_hour_started:1',
    'cheap_hour_started:2',
    'cheap_hour_started:3',
    'cheap_hour_started:4',
    'cheap_hour_started:5',
    'cheap_hour_started:6',
    'cheap_hour_started:8',
    'cheap_hour_started:10',
    'cheap_hour_started:12',
    'price_below_started:0.05',
  ]);
  assert.deepEqual(events[0].data, {
    hours: '1',
    average_price: 0.04829,
    start_time: '15:00',
    end_time: '16:00',
  });
  assert.deepEqual(events[1].data, {
    hours: '1',
    rank: 1,
    price: 0.04829,
    start_time: '15:00',
    end_time: '16:00',
  });
});

test('each window length begins exactly once a day', () => {
  const byHour = {};
  for (const [hour, slot] of day.entries()) {
    for (const event of of(eventsForSlot(day, slot, { slots }), TRIGGER.CHEAPEST_WINDOW)) {
      (byHour[hour] ??= []).push(Number(event.data.hours));
    }
  }
  assert.deepEqual(byHour, { 10: [8], 12: [6], 13: [5], 14: [2, 3, 4], 15: [1] });
  const three = of(eventsForSlot(day, at(14), { slots }), TRIGGER.CHEAPEST_WINDOW)[1];
  assert.deepEqual([three.data.start_time, three.data.end_time], ['14:00', '17:00']);
});

test('each N cheapest hours fires exactly N times a day', () => {
  const counts = {};
  for (const slot of day) {
    for (const event of of(eventsForSlot(day, slot, { slots }), TRIGGER.CHEAP_HOUR)) {
      counts[event.data.hours] = (counts[event.data.hours] ?? 0) + 1;
    }
  }
  assert.deepEqual(counts, { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 8, 10: 10, 12: 12 });
});

test('the price drops below a threshold: once per run, with its end', () => {
  // 13:00 0.1715, then 14:00 0.07531, 15:00 0.04829, 16:00 0.07641, 17:00 0.14575.
  const below = of(eventsForSlot(day, at(14), { slots }), TRIGGER.PRICE_BELOW);
  assert.deepEqual(
    below.map((e) => [e.data.threshold, e.data.hours, e.data.end_time]),
    [
      ['0.08', 3, '17:00'],
      ['0.10', 3, '17:00'],
      ['0.12', 3, '17:00'],
      ['0.15', 4, '18:00'],
    ],
  );
  assert.equal(below[0].data.price, 0.07531);
  // 16:00 is still under 0.08: the run goes on, nothing new.
  assert.deepEqual(of(eventsForSlot(day, at(16), { slots }), TRIGGER.PRICE_BELOW), []);
  // Across midnight: 23:00 (0.21702) then 00:00 on the 21st (0.19037).
  const tomorrow = slotsOfDay(slots, '2026-10-21');
  const midnight = of(eventsForSlot(tomorrow, tomorrow[0], { slots }), TRIGGER.PRICE_BELOW);
  assert.deepEqual(
    midnight.map((e) => e.data.threshold),
    ['0.20'],
  );
  assert.equal(midnight[0].data.hours, 6); // 00:00-06:00 under 0.20
});

test('19:00, the most expensive hour, fires nothing', () => {
  assert.deepEqual(eventsForSlot(day, at(19), { slots }), []);
  // A slot of another day is never compared with this one.
  assert.deepEqual(eventsForSlot(day.slice(1), at(0), { slots }), []);
});

test('the times follow the clock of the zone (Canary Islands an hour behind)', () => {
  const [event] = eventsForSlot(day, at(15), { slots, timeZone: 'Atlantic/Canary' });
  assert.equal(event.data.start_time, '14:00');
});

test('the events go out when the hour begins, once, even across a restart', async () => {
  const world = await createWorld({ at: '2026-10-20T12:59:30Z' }); // 14:59:30
  const before = world.gladys.fake.sceneEvents.length;
  world.clock.set('2026-10-20T13:00:02Z');
  await world.app.cycle();
  const fired = world.gladys.fake.sceneEvents.length - before;
  assert.equal(fired, 11);
  world.clock.set('2026-10-20T13:01:02Z');
  await world.app.cycle();
  assert.equal(world.gladys.fake.sceneEvents.length - before, 11, 'once');

  // The container restarts at 15:02 with the same /data: nothing again.
  const restarted = await createWorld({ at: '2026-10-20T13:02:00Z', dataDir: world.dataDir });
  assert.equal(
    restarted.gladys.fake.sceneEvents.filter((e) => e.key !== TRIGGER.TOMORROW_PUBLISHED).length,
    0,
  );
});

test('an hour that began more than 10 minutes ago fires nothing', async () => {
  const hourly = (world) =>
    world.gladys.fake.sceneEvents.filter((e) => e.key !== TRIGGER.TOMORROW_PUBLISHED);
  const late = await createWorld({ at: '2026-10-20T13:11:00Z' }); // 15:11
  assert.deepEqual(hourly(late), []);
  const onTime = await createWorld({ at: '2026-10-20T13:09:00Z' });
  assert.equal(hourly(onTime).length, 11);
});

test('a refused event is sent again on the next cycle, the others are not duplicated', async (t) => {
  const world = await createWorld({ at: '2026-10-20T12:59:30Z' });
  const before = world.gladys.fake.sceneEvents.length;
  const original = world.gladys.publishSceneEvent.bind(world.gladys);
  let calls = 0;
  t.mock.method(world.gladys, 'publishSceneEvent', async (key, data) => {
    calls += 1;
    if (calls === 3) {
      throw new Error('429 TOO_MANY_REQUESTS');
    }
    return original(key, data);
  });
  world.clock.set('2026-10-20T13:00:02Z');
  await world.app.cycle();
  assert.equal(world.gladys.fake.sceneEvents.length - before, 2);
  world.clock.set('2026-10-20T13:01:02Z');
  await world.app.cycle();
  const sent = world.gladys.fake.sceneEvents
    .slice(before)
    .map((e) => `${e.key}:${e.data.threshold ?? e.data.hours}`);
  assert.equal(sent.length, 11);
  assert.equal(new Set(sent).size, 11);
});

test("tomorrow's prices: one event when they appear, never twice", async () => {
  const world = await createWorld({
    at: '2026-10-20T18:20:00Z', // 20:20
    until: '2026-10-20T22:00:00Z',
  });
  const announced = () =>
    world.gladys.fake.sceneEvents.filter((e) => e.key === TRIGGER.TOMORROW_PUBLISHED);
  assert.equal(announced().length, 0);
  world.api.until = undefined; // REE publishes
  world.clock.set('2026-10-20T18:35:30Z');
  await world.app.cycle();
  assert.equal(announced().length, 1);
  assert.deepEqual(announced()[0].data, {
    average_price: 0.20474,
    min_price: 0.01837,
    cheapest_time: '14:00',
    max_price: 0.41808,
    priciest_time: '20:00',
    cheapest_3h_start: '14:00',
  });
  world.clock.advance(60 * 60 * 1000);
  await world.app.cycle();
  const restarted = await createWorld({ at: '2026-10-20T19:40:00Z', dataDir: world.dataDir });
  assert.equal(announced().length, 1);
  assert.equal(
    restarted.gladys.fake.sceneEvents.filter((e) => e.key === TRIGGER.TOMORROW_PUBLISHED).length,
    0,
  );
  assert.equal(tomorrowEvent([]), null);
});
