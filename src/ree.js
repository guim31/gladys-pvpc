// -----------------------------------------------------------------------------
// Red Eléctrica (REE) open data API (no account, no key).
//
//   GET https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real
//       ?start_date=YYYY-MM-DDT00:00&end_date=YYYY-MM-DDT23:59
//       &time_trunc=hour&geo_limit=peninsular&geo_ids=8741
//
// The answer is JSON:API: `included[]` holds one series per indicator. The
// PVPC 2.0TD price is the series of id "1001" (type "PVPC"), one value per
// hour in €/MWh, `datetime` an ISO date with the Madrid offset of that hour:
// the two 02:00 of the day the clocks go back carry +02:00 then +01:00, so
// every hour is a distinct instant. The same answer also carries the spot
// market price (id "600", every 15 minutes since October 2025): ignored.
//
// Tomorrow's prices appear around 20:15 (Madrid). Until then the answer just
// stops at today's last hour. A range with no data at all answers HTTP 502
// with `errors[]` ("Los datos solicitados no están disponibles").
// -----------------------------------------------------------------------------

export const API_URL = 'https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real';

/** PVPC 2.0TD indicator, the same id as on ESIOS. */
export const PVPC_INDICATOR = '1001';

/** The electrical systems REE prices, with their geo ids. */
export const ZONES = {
  peninsula: { geoLimit: 'peninsular', geoId: 8741 },
  canarias: { geoLimit: 'canarias', geoId: 8742 },
  baleares: { geoLimit: 'baleares', geoId: 8743 },
  ceuta: { geoLimit: 'ceuta', geoId: 8744 },
  melilla: { geoLimit: 'melilla', geoId: 8745 },
};

const HOUR = 60 * 60 * 1000;
const USER_AGENT = 'gladys-pvpc (+https://github.com/guim31/gladys-pvpc)';

/** A failed request, with what the user can be told about it. */
export class ReeError extends Error {
  /**
   * @param {string} message
   * @param {{ kind: 'network' | 'http' | 'format', status?: number }} details
   */
  constructor(message, { kind, status }) {
    super(message);
    this.name = 'ReeError';
    this.kind = kind;
    this.status = status;
  }
}

/**
 * Read the PVPC prices of the Madrid days `from` to `to`, inclusive.
 * @param {object} options
 * @param {string} options.from `YYYY-MM-DD`
 * @param {string} options.to `YYYY-MM-DD`
 * @param {keyof typeof ZONES} options.zone
 * @param {typeof fetch} [options.fetch]
 * @param {number} [options.timeoutMs]
 * @returns {Promise<Array<{ start: Date, end: Date, price: number }>>} sorted
 *   hourly slots, price in €/kWh
 */
export async function fetchPrices({ from, to, zone, fetch = globalThis.fetch, timeoutMs = 15000 }) {
  const geo = ZONES[zone] ?? ZONES.peninsula;
  const url = new URL(API_URL);
  url.searchParams.set('start_date', `${from}T00:00`);
  url.searchParams.set('end_date', `${to}T23:59`);
  url.searchParams.set('time_trunc', 'hour');
  url.searchParams.set('geo_limit', geo.geoLimit);
  url.searchParams.set('geo_ids', String(geo.geoId));

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const reason = err?.name === 'TimeoutError' ? 'timeout' : (err?.cause?.code ?? err?.message);
    throw new ReeError(`REE unreachable (${reason})`, { kind: 'network' });
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    if (response.ok) {
      throw new ReeError('REE sent an unreadable answer', { kind: 'format' });
    }
  }
  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail;
    throw new ReeError(
      `REE answered HTTP ${response.status}${detail ? ` (${String(detail).slice(0, 120)})` : ''}`,
      { kind: 'http', status: response.status },
    );
  }
  return parsePrices(body);
}

/**
 * Turn an API answer into sorted hourly slots in €/kWh. Unreadable values are
 * skipped one by one: a single malformed hour must not hide the other 47.
 * @param {unknown} body
 */
export function parsePrices(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.included)) {
    throw new ReeError('REE sent an unexpected answer', { kind: 'format' });
  }
  const series = body.included.find((item) => String(item?.id) === PVPC_INDICATOR);
  const values = Array.isArray(series?.attributes?.values) ? series.attributes.values : [];
  const byStart = new Map();
  for (const entry of values) {
    const start = new Date(entry?.datetime);
    const value = entry?.value;
    if (Number.isNaN(start.getTime()) || typeof value !== 'number' || !Number.isFinite(value)) {
      continue;
    }
    byStart.set(start.getTime(), {
      start,
      end: new Date(start.getTime() + HOUR),
      price: value / 1000,
    });
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}
