// -----------------------------------------------------------------------------
// A complete test world: the SDK's fake Gladys, a fake REE API serving the
// real fixtures, a settable clock and a temporary /data, with the
// integration wired on top through createApp — the very wiring index.js uses.
// -----------------------------------------------------------------------------

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFakeGladys } from '@gladysassistant/integration-sdk/testing';
import { createApp } from '../../src/app.js';

// The integration logs its lifecycle; keep the test output readable
// (LOG_LEVEL is read on every log call). LOG_LEVEL=debug npm test shows them.
process.env.LOG_LEVEL ??= 'silent';

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`../fixtures/ree/${name}`, import.meta.url), 'utf8'));

export const FIXTURES = {
  twoDays: fixture('two-days.json'),
  dstOctober: fixture('dst-october.json'),
  dstMarch: fixture('dst-march.json'),
  error: fixture('error-502.json'),
};

/** 20 October 2026, 10:30 in Madrid (CEST, UTC+2): the first fixture day. */
export const DAY_TIME = '2026-10-20T08:30:00Z';

const madridDay = (iso) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date(iso));

/** Every real PVPC value of the fixtures, the answers are cut from them. */
const ALL_VALUES = [FIXTURES.twoDays, FIXTURES.dstOctober, FIXTURES.dstMarch].flatMap(
  (body) => body.included.find((item) => item.id === '1001').attributes.values,
);

/**
 * A real-looking answer for the Madrid days `from` to `to`: the PVPC series
 * cut from the fixtures (plus the spot market series REE also sends), only
 * the hours starting before `until` when given (tomorrow not published yet).
 * @param {string} from `YYYY-MM-DD`
 * @param {string} to `YYYY-MM-DD`
 * @param {string} [until] ISO date
 */
export function answerFor(from, to, until) {
  const values = ALL_VALUES.filter((value) => {
    const day = madridDay(value.datetime);
    return day >= from && day <= to && (!until || new Date(value.datetime) < new Date(until));
  });
  if (values.length === 0) {
    return { status: 502, body: FIXTURES.error };
  }
  const body = structuredClone(FIXTURES.twoDays);
  body.included = [
    { ...body.included[0], attributes: { ...body.included[0].attributes, values } },
    body.included[1],
  ];
  return { status: 200, body };
}

/**
 * A fake REE API. `api.answer` is a function `(url) => { status, body }`
 * (by default cut from the fixtures, `api.until` hiding the later hours);
 * `api.down` makes every request fail like an unreachable host.
 */
export function createFakeApi({ until } = {}) {
  const api = {
    until,
    down: false,
    requests: [],
    answer: (url) =>
      answerFor(
        url.searchParams.get('start_date').slice(0, 10),
        url.searchParams.get('end_date').slice(0, 10),
        api.until,
      ),
    async fetch(url, init) {
      const parsed = new URL(url);
      api.requests.push({ url: parsed, headers: init?.headers });
      if (api.down) {
        throw new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
      }
      const { status, body } = api.answer(parsed);
      return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    },
    count() {
      return api.requests.length;
    },
  };
  return api;
}

/** A clock the test moves by hand. */
export function createClock(iso = DAY_TIME) {
  let current = new Date(iso).getTime();
  return {
    now: () => current,
    set(next) {
      current = new Date(next).getTime();
    },
    advance(ms) {
      current += ms;
    },
  };
}

/**
 * @param {object} [options]
 * @param {object} [options.config] raw integration config
 * @param {boolean} [options.created] the user already added the device
 * @param {string} [options.until] REE knows the hours before this ISO date only
 * @param {string} [options.at] the clock, ISO
 * @param {boolean} [options.connect]
 * @param {string} [options.dataDir]
 */
export async function createWorld({
  config = {},
  created = true,
  until,
  at = DAY_TIME,
  connect = true,
  dataDir = mkdtempSync(join(tmpdir(), 'gladys-pvpc-')),
} = {}) {
  const api = createFakeApi({ until });
  const clock = createClock(at);
  const gladys = createFakeGladys({ config });
  const app = createApp(gladys, { fetch: api.fetch, now: clock.now, timers: false, dataDir });
  const world = { gladys, api, clock, app, dataDir };
  if (created) {
    // The device as the user added it, before the integration connects.
    const { buildDevice } = await import('../../src/device.js');
    const { normalizeConfig } = await import('../../src/config.js');
    gladys.fake.devices = [buildDevice(gladys, normalizeConfig(config))];
  }
  if (connect) {
    await gladys.connect();
  }
  return world;
}

/** External id of a feature of the PVPC device. */
export const featureId = (gladys, key) => gladys.externalIds('pvpc', 'es').feature(key);

/** The last state of a feature: a number, or the text of a text feature. */
export function last(gladys, key) {
  const id = featureId(gladys, key);
  const states = gladys.fake.states.filter((s) => s.device_feature_external_id === id);
  const state = states.at(-1);
  return state === undefined ? undefined : (state.text ?? state.state);
}
