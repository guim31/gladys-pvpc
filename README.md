# PVPC for Gladys Assistant

A [Gladys Assistant](https://gladysassistant.com) integration for the **Spanish
regulated electricity price, PVPC 2.0TD** (Precio Voluntario para el Pequeño
Consumidor), hour by hour, from the open data of
[Red Eléctrica](https://www.ree.es) (REE): the price of the current hour, the
cheapest hours of the day, the 2.0TD period (punta, llano, valle), a chart of today
and tomorrow, scene triggers and a scene action to run appliances when electricity is
cheapest. No account, no API key.

Tested against the live REE API; not yet on the Gladys of a real PVPC customer:
feedback welcome. Not affiliated with Red Eléctrica.

## Features

- **One device, read-only**: current price, next hour price, average, lowest and
  highest price of the day, the cheapest hour (of the day, and still to come), the
  most expensive hour, rank of the current hour (1 = cheapest), 2.0TD period (as a
  number for scenes and by name), "tomorrow's prices published". €/kWh, energy term,
  taxes excluded.
- **Zones**: Península, Baleares, Canarias (hours in local time), Ceuta, Melilla
  (their own 2.0TD hours).
- **Dashboard widget** "PVPC electricity prices": tiles for now, next hour and today's
  average, a step chart of today and tomorrow with the minimum and maximum marked,
  the 2.0TD period and the cheapest hours.
- **Scene triggers**: "Cheapest hours of the day begin" (the cheapest run of 1 to 8
  consecutive hours), "One of the cheapest hours begins" (each of the N cheapest
  hours), "The price drops below a threshold" (once per run of cheap hours, with its
  end), "Tomorrow's prices are published" (around 20:15, with tomorrow's summary).
- **Scene action** "Find the cheapest hours before a deadline": the cheapest run of N
  hours finished before a given time, returned to the scene (`starts_now`,
  `start_time`, `minutes_to_start`...).
- Feature names, widget and documentation in English, French, German and Spanish.

## Requirements

- Gladys Assistant **5.1.0** or later.
- Internet access from Gladys to `apidatos.ree.es`.

## Installation

In Gladys: **Integrations → Install from GitHub**, enter
`https://github.com/guim31/gladys-pvpc`. Choose your zone, then add the PVPC device
from the **Discovery** tab, and the "PVPC electricity prices" widget on a dashboard.

The user documentation, in four languages, is in [`docs/`](docs/en.md).

## How it works

The container reads
`GET https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real`
(`time_trunc=hour`, the geo id of the zone), keeping the PVPC series (indicator
1001, €/MWh). One request covers yesterday, today and tomorrow. It asks once an
hour, every 15 minutes from 20:15 (Madrid) until tomorrow's prices are out, and
backs off after a failure; the last known prices stay in use meanwhile. A timer in
the container refreshes the states every minute (the core's `onPoll` is only a
fallback, Gladys#3198), publishes only what changed (plus a 6-hour heartbeat) and
fires the scene triggers when an hour begins. A day is a calendar day of
Europe/Madrid (23 or 25 hours when the clocks change), whatever the timezone of
Gladys.

## Limitations

- The energy term of the PVPC 2.0TD, taxes excluded (no power term, electricity tax,
  VAT/IGIC or meter rental). Free-market contracts have their own prices.
- Hourly prices, as the PVPC is still priced (the spot market trades quarter hours
  since October 2025).
- The optional ESIOS API (personal token) is not used.
- The triggers consider the current day only: a cheapest run never spans midnight
  (the scene action does).
- Fixed national holidays only for the 2.0TD periods, as the CNMC rule says.
- Read-only: the integration controls nothing.

## Development

Node.js 22+, ESM, no build step. The only runtime dependency is
[`@gladysassistant/integration-sdk`](https://github.com/GladysAssistant/integration-sdk-js).

```bash
npm install
npm test              # node --test, against the SDK's fake Gladys and a fake REE API
npm run lint
npm run format:check
npx github:GladysAssistant/integration-store .   # store validator
node scripts/probe.mjs [zone]                     # the real prices (network)
```

See [`CLAUDE.md`](CLAUDE.md) for the architecture and the project rules.

## Credits

- Prices: [Red Eléctrica](https://www.ree.es) open data (REData API). The test
  fixtures in `test/fixtures/ree/` are real answers of this API.
- The design follows the Home Assistant `pvpc_hourly_pricing` integration and the
  [`aiopvpc`](https://github.com/azogue/aiopvpc) library by Eugenio Panadero (MIT),
  read for the 2.0TD periods and holidays; no code is copied.
- The structure, triggers and widget come from
  [gladys-energyzero](https://github.com/guim31/gladys-energyzero).

## License

[Apache-2.0](LICENSE). PVPC and Red Eléctrica are names of their owners; this
project is not affiliated with Red Eléctrica de España.
