# REE fixtures

Real answers of the Red Eléctrica open data API
(`https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real`,
`time_trunc=hour`), recorded on 21 October 2026. Public regulated prices: nothing
personal.

| File               | Request                                                  | Content                                               |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------- |
| `two-days.json`    | 20 to 22 October 2026, mainland (22nd not published yet) | PVPC 48 hours, spot market every 15 minutes           |
| `dst-october.json` | 26 October 2025, the clocks go back                      | PVPC 25 hours (02:00 twice, +02:00 then +01:00)       |
| `dst-march.json`   | 29 March 2026, the clocks go forward                     | PVPC 23 hours (no 02:00)                              |
| `ceuta.json`       | 21 October 2026, `geo_limit=ceuta&geo_ids=8744`          | PVPC 24 hours                                         |
| `error-502.json`   | a day with no data (2030)                                | HTTP 502 "Los datos solicitados no están disponibles" |

The PVPC series is `included[]` of id `1001`, values in €/MWh.
