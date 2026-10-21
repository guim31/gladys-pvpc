// -----------------------------------------------------------------------------
// The price widget: what the card shows, within the core's vocabulary and
// budget (validateWidgetContent is the SDK's copy of the core checks).
// -----------------------------------------------------------------------------

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateWidgetContent } from '@gladysassistant/integration-sdk';
import { WIDGET } from '../src/widget.js';
import { createWorld } from './helpers/world.js';

async function content(world, language = 'en') {
  const ack = await world.gladys.fake.widgetGet(WIDGET.PRICES, { language });
  assert.equal(ack.success, true, ack.error);
  return ack.data.content;
}

const byType = (c, type) => c.components.filter((component) => component.type === type);

test('today and tomorrow, the current price and the cheapest hours', async () => {
  const world = await createWorld();
  const c = await content(world);
  assert.deepEqual(validateWidgetContent(c), []);
  assert.equal(byType(c, 'text')[0].text, 'PVPC 2.0TD, energy term, taxes excluded');
  assert.deepEqual(
    byType(c, 'value').map((v) => [v.label, v.value, v.unit]),
    [
      ['Now', 0.293, '€/kWh'],
      ['Next hour', 0.226, '€/kWh'],
      ['Today average', 0.221, '€/kWh'],
    ],
  );
  const [chart] = byType(c, 'chart');
  assert.equal(chart.chart_type, 'stepline');
  assert.equal(chart.now_marker, true);
  assert.deepEqual(
    chart.series.map((s) => [s.name, s.points.length]),
    [
      ['Today', 24],
      ['Tomorrow', 24],
    ],
  );
  assert.deepEqual(
    chart.annotations.map((a) => a.label),
    ['Min 15:00', 'Max 19:00', 'Min 14:00', 'Max 20:00'],
  );
  const [status] = byType(c, 'status');
  assert.deepEqual(
    status.items.map((i) => i.label),
    ['Period', 'Cheapest left today', 'Cheapest tomorrow', 'Tomorrow average'],
  );
  assert.equal(status.items[0].value, 'Peak (punta, P1)');
  assert.equal(status.items[1].value, '15:00 · 0.048 €/kWh');
  // Until the next hour, when the current price changes.
  assert.equal(c.ttl_seconds, 1805);
});

test('in the four languages, numbers in the local format', async () => {
  const world = await createWorld();
  const fr = await content(world, 'fr');
  assert.equal(byType(fr, 'status')[0].items[1].value, '15:00 · 0,048 €/kWh');
  assert.equal(byType(fr, 'value')[0].label, 'Maintenant');
  const de = await content(world, 'de');
  assert.equal(byType(de, 'text')[0].text, 'PVPC 2.0TD, Energiepreis, ohne Steuern');
  const es = await content(world, 'es');
  assert.equal(byType(es, 'chart')[0].series[1].name, 'Mañana');
  for (const c of [fr, de, es]) {
    assert.deepEqual(validateWidgetContent(c), []);
  }
});

test("before 20:15, tomorrow's prices are announced, not invented", async () => {
  const world = await createWorld({
    at: '2026-10-20T16:30:00Z', // 18:30
    until: '2026-10-20T22:00:00Z',
    config: { zone: 'canarias' },
  });
  const c = await content(world);
  assert.deepEqual(validateWidgetContent(c), []);
  assert.equal(byType(c, 'chart')[0].series.length, 1);
  assert.equal(byType(c, 'chart')[0].annotations.length, 2);
  // Canary Islands: the hours in local time, an hour behind Madrid.
  assert.deepEqual(
    byType(c, 'status')[0].items.map((i) => [i.label, i.value]),
    [
      ['Period', 'Flat (llano, P2)'], // 17:30 in Las Palmas
      ['Cheapest left today', '22:00 · 0.217 €/kWh'],
      ['Tomorrow', 'Around 20:15'],
    ],
  );
});

test('without any price, one sentence', async () => {
  const empty = await createWorld({ connect: false });
  empty.api.answer = () => ({ status: 503, body: {} });
  await empty.gladys.connect();
  const c = await content(empty, 'es');
  assert.deepEqual(validateWidgetContent(c), []);
  assert.deepEqual(byType(c, 'text').length, 1);
  assert.match(byType(c, 'text')[0].text, /Todavía no se ha recibido ningún precio/);
});
