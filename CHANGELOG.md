# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

## [1.0.0] - 2026-10-21

### Added

- The PVPC device: current and next hour price, average, lowest and highest price
  of the day, cheapest hour (of the day and still to come), most expensive hour,
  rank of the current hour, 2.0TD period (number and name), "tomorrow's prices
  published". Prices from the open data of Red Eléctrica, no account or key.
- Zones: Península, Baleares, Canarias (hours in local time), Ceuta and Melilla
  (their own 2.0TD hours).
- The "PVPC electricity prices" dashboard widget: today and tomorrow in a chart,
  the current price, the 2.0TD period and the cheapest hours.
- Scene triggers: the cheapest hours of the day begin, one of the N cheapest hours
  begins, the price drops below a threshold, tomorrow's prices are published.
- Scene action: find the cheapest run of N hours before a deadline.
- A "Refresh the prices now" button in the configuration.
- Feature names, texts and documentation in English, French, German and Spanish.

[Unreleased]: https://github.com/guim31/gladys-pvpc/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/guim31/gladys-pvpc/releases/tag/v1.0.0
