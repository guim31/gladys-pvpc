// -----------------------------------------------------------------------------
// The scene action "find the cheapest hours before a deadline", on the real
// prices of 20 and 21 October 2026, through the whole wiring.
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld } from './helpers/world.js';

const run = async (world, fields) => {
  const ack = await world.gladys.fake.sceneAction('find_cheapest_window', fields);
  assert.equal(ack.success, true, JSON.stringify(ack));
  return ack.data.outputs;
};

test('in the evening, the 3 cheapest hours before 07:00 tomorrow', async () => {
  const world = await createWorld({ at: '2026-10-20T19:05:00Z' }); // 21:05
  const outputs = await run(world, { hours: '3', before: '07:00' });
  // 21st: 03:00 173.86, 04:00 173.55, 05:00 178.9 €/MWh.
  assert.deepEqual(outputs, {
    found: true,
    starts_now: false,
    start_time: '03:00',
    end_time: '06:00',
    average_price: 0.17544,
    minutes_to_start: 355,
  });
});

test('without deadline, the whole known future is searched', async () => {
  const world = await createWorld({ at: '2026-10-20T19:05:00Z' });
  const outputs = await run(world, { hours: '3', before: 'any' });
  assert.equal(outputs.start_time, '14:00'); // tomorrow afternoon, solar hours
  assert.equal(outputs.average_price, 0.01877);
});

test('a window may start in the hour in progress during its first minutes only', async () => {
  const early = await createWorld({ at: '2026-10-20T13:05:00Z' }); // 15:05
  const now = await run(early, { hours: '1', before: '17:00' });
  assert.equal(now.starts_now, true);
  assert.equal(now.start_time, '15:00');
  assert.equal(now.minutes_to_start, 0);

  const late = await createWorld({ at: '2026-10-20T13:40:00Z' }); // 15:40
  const next = await run(late, { hours: '1', before: '17:00' });
  assert.equal(next.start_time, '16:00');
  assert.equal(next.minutes_to_start, 20);
});

test('a deadline beyond the known prices searches the known hours', async () => {
  const world = await createWorld({
    at: '2026-10-20T08:30:00Z', // 10:30, tomorrow not published
    until: '2026-10-20T22:00:00Z',
  });
  const outputs = await run(world, { hours: '2', before: '07:00' });
  assert.equal(outputs.start_time, '14:00');
  assert.equal(outputs.end_time, '16:00');
});

test('no window: found is false, every output still there', async () => {
  const world = await createWorld({ at: '2026-10-20T13:40:00Z' }); // 15:40
  const outputs = await run(world, { hours: '3', before: '17:00' });
  assert.deepEqual(outputs, {
    found: false,
    starts_now: false,
    start_time: '',
    end_time: '',
    average_price: 0,
    minutes_to_start: 0,
  });
});

test('unknown fields fail the action, the scene carries on', async () => {
  const world = await createWorld();
  const ack = await world.gladys.fake.sceneAction('find_cheapest_window', {
    hours: '7',
    before: '07:00',
  });
  assert.equal(ack.success, false);
  const deadline = await world.gladys.fake.sceneAction('find_cheapest_window', {
    hours: '2',
    before: '7h',
  });
  assert.equal(deadline.success, false);
});

test('the deadline is the next HH:00, even within the hour in progress', async () => {
  // 06:30, tomorrow not published: "before 07:00" leaves no whole hour.
  const early = await createWorld({ at: '2026-10-20T04:30:00Z', until: '2026-10-20T22:00:00Z' });
  assert.equal((await run(early, { hours: '1', before: '07:00' })).found, false);
  // 15:20, "before 16:00": the 15:00 hour began too long ago, nothing fits.
  const afternoon = await createWorld({ at: '2026-10-20T13:20:00Z' });
  assert.equal((await run(afternoon, { hours: '1', before: '16:00' })).found, false);
  // 15:20, "before 18:00": 16:00-17:00 at the latest.
  const fits = await run(afternoon, { hours: '1', before: '18:00' });
  assert.deepEqual([fits.start_time, fits.end_time], ['16:00', '17:00']);
});

test('the deadline in the clock of the zone, and over a skipped DST hour', async () => {
  const { nextDeadline } = await import('../src/scenes.js');
  const at = new Date('2026-10-20T13:20:00Z'); // 15:20 Madrid, 14:20 Las Palmas
  assert.equal(
    new Date(nextDeadline(at, '16:00', 'Europe/Madrid')).toISOString(),
    '2026-10-20T14:00:00.000Z',
  );
  assert.equal(
    new Date(nextDeadline(at, '16:00', 'Atlantic/Canary')).toISOString(),
    '2026-10-20T15:00:00.000Z',
  );
  // 29 March 2026: 02:00 does not exist in Madrid, 03:00 CEST stands for it.
  const spring = new Date('2026-03-28T23:30:00Z'); // 00:30 CET
  assert.equal(
    new Date(nextDeadline(spring, '02:00', 'Europe/Madrid')).toISOString(),
    '2026-03-29T01:00:00.000Z',
  );
});
