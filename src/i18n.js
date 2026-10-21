// -----------------------------------------------------------------------------
// Every text the integration shows to the user, in the four languages of the
// Gladys interface (en, fr, de, es). German says "du", Spanish says "usted",
// like the rest of guim31's integrations. The vocabulary follows the Gladys
// interface (Strompreis, Precio de la electricidad...); punta, llano and valle
// are the official names of the 2.0TD periods, kept in Spanish next to their
// translation.
//
//   - NAMES        : the feature names, frozen when the user adds the device,
//                    in the language of the configuration;
//   - PERIOD_NAMES : the state of the "tariff period" text feature;
//   - TEXT         : the fixed texts (widget, connection status);
//   - MESSAGES     : the texts built from a value.
//
// test/i18n.test.js checks that every entry carries exactly the four
// languages.
// -----------------------------------------------------------------------------

/** Feature names, by language then feature key (≤ 40 characters). */
export const NAMES = {
  en: {
    price_now: 'Current price (€/kWh)',
    price_next: 'Next hour price (€/kWh)',
    price_avg_today: 'Average price today (€/kWh)',
    price_min_today: 'Lowest price today (€/kWh)',
    price_max_today: 'Highest price today (€/kWh)',
    cheapest_hour_today: 'Cheapest hour today',
    cheapest_hour_remaining: 'Cheapest hour left today',
    priciest_hour_today: 'Most expensive hour today',
    price_rank_now: 'Hour rank (1 = cheapest)',
    tariff_period: '2.0TD period (1 peak, 3 off-peak)',
    tariff_period_name: '2.0TD tariff period',
    tomorrow_available: "Tomorrow's prices published",
  },
  fr: {
    price_now: 'Prix actuel (€/kWh)',
    price_next: 'Prix heure suivante (€/kWh)',
    price_avg_today: 'Prix moyen du jour (€/kWh)',
    price_min_today: 'Prix min du jour (€/kWh)',
    price_max_today: 'Prix max du jour (€/kWh)',
    cheapest_hour_today: 'Heure la moins chère du jour',
    cheapest_hour_remaining: 'Heure la moins chère restante',
    priciest_hour_today: 'Heure la plus chère du jour',
    price_rank_now: "Rang de l'heure (1 = moins chère)",
    tariff_period: 'Période 2.0TD (1 pointe, 3 creuse)',
    tariff_period_name: 'Période tarifaire 2.0TD',
    tomorrow_available: 'Prix de demain publiés',
  },
  de: {
    price_now: 'Aktueller Strompreis (€/kWh)',
    price_next: 'Preis nächste Stunde (€/kWh)',
    price_avg_today: 'Durchschnittspreis heute (€/kWh)',
    price_min_today: 'Tiefstpreis heute (€/kWh)',
    price_max_today: 'Höchstpreis heute (€/kWh)',
    cheapest_hour_today: 'Günstigste Stunde heute',
    cheapest_hour_remaining: 'Günstigste verbleibende Stunde',
    priciest_hour_today: 'Teuerste Stunde heute',
    price_rank_now: 'Rang der Stunde (1 = günstigste)',
    tariff_period: '2.0TD-Zeitraum (1 Spitze, 3 Tal)',
    tariff_period_name: '2.0TD-Tarifzeitraum',
    tomorrow_available: 'Preise für morgen veröffentlicht',
  },
  es: {
    price_now: 'Precio actual (€/kWh)',
    price_next: 'Precio próxima hora (€/kWh)',
    price_avg_today: 'Precio medio de hoy (€/kWh)',
    price_min_today: 'Precio mínimo de hoy (€/kWh)',
    price_max_today: 'Precio máximo de hoy (€/kWh)',
    cheapest_hour_today: 'Hora más barata de hoy',
    cheapest_hour_remaining: 'Hora más barata restante',
    priciest_hour_today: 'Hora más cara de hoy',
    price_rank_now: 'Rango de la hora (1 = más barata)',
    tariff_period: 'Periodo 2.0TD (1 punta, 3 valle)',
    tariff_period_name: 'Periodo tarifario 2.0TD',
    tomorrow_available: 'Precios de mañana publicados',
  },
};

/** The 2.0TD periods, by language then period number (≤ 40 characters). */
export const PERIOD_NAMES = {
  en: { 1: 'Peak (punta, P1)', 2: 'Flat (llano, P2)', 3: 'Off-peak (valle, P3)' },
  fr: { 1: 'Pointe (punta, P1)', 2: 'Plein (llano, P2)', 3: 'Creuse (valle, P3)' },
  de: { 1: 'Spitze (punta, P1)', 2: 'Normal (llano, P2)', 3: 'Tal (valle, P3)' },
  es: { 1: 'Punta (P1)', 2: 'Llano (P2)', 3: 'Valle (P3)' },
};

/** Fixed texts. */
export const TEXT = {
  // Widget (labels ≤ 24, captions ≤ 80)
  now: { en: 'Now', fr: 'Maintenant', de: 'Jetzt', es: 'Ahora' },
  nextHour: { en: 'Next hour', fr: 'Heure suivante', de: 'Nächste Stunde', es: 'Próxima hora' },
  average: {
    en: 'Today average',
    fr: 'Moyenne du jour',
    de: 'Schnitt heute',
    es: 'Media de hoy',
  },
  today: { en: 'Today', fr: "Aujourd'hui", de: 'Heute', es: 'Hoy' },
  tomorrow: { en: 'Tomorrow', fr: 'Demain', de: 'Morgen', es: 'Mañana' },
  min: { en: 'Min', fr: 'Min', de: 'Min', es: 'Mín' },
  max: { en: 'Max', fr: 'Max', de: 'Max', es: 'Máx' },
  cheapestLeft: {
    en: 'Cheapest left today',
    fr: 'Moins cher restant',
    de: 'Günstigste verbleibend',
    es: 'Más barata restante',
  },
  cheapestTomorrow: {
    en: 'Cheapest tomorrow',
    fr: 'Moins cher demain',
    de: 'Am günstigsten morgen',
    es: 'Más barata mañana',
  },
  tomorrowAverage: {
    en: 'Tomorrow average',
    fr: 'Moyenne de demain',
    de: 'Schnitt morgen',
    es: 'Media de mañana',
  },
  tomorrowPending: {
    en: 'Around 20:15',
    fr: 'Vers 20:15',
    de: 'Gegen 20:15',
    es: 'Hacia las 20:15',
  },
  period: { en: 'Period', fr: 'Période', de: 'Zeitraum', es: 'Periodo' },
  caption: {
    en: 'PVPC 2.0TD, energy term, taxes excluded',
    fr: 'PVPC 2.0TD, terme énergie, hors taxes',
    de: 'PVPC 2.0TD, Energiepreis, ohne Steuern',
    es: 'PVPC 2.0TD, término de energía, sin impuestos',
  },
  noPrices: {
    en: 'No price received from Red Eléctrica yet: check the integration logs.',
    fr: "Aucun prix reçu de Red Eléctrica pour l'instant : consultez les logs de l'intégration.",
    de: 'Noch kein Preis von Red Eléctrica erhalten: Sieh dir die Protokolle der Integration an.',
    es: 'Todavía no se ha recibido ningún precio de Red Eléctrica: consulte los registros de la integración.',
  },

  // Configuration screen
  initFailed: {
    en: 'Initialization failed, check the integration logs.',
    fr: "L'initialisation a échoué, consultez les logs de l'intégration.",
    de: 'Initialisierung fehlgeschlagen, sieh dir die Protokolle der Integration an.',
    es: 'La inicialización ha fallado, consulte los registros de la integración.',
  },
  unreachable: {
    en: 'Red Eléctrica cannot be reached: the last known prices stay in use.',
    fr: 'Red Eléctrica est injoignable : les derniers prix connus restent utilisés.',
    de: 'Red Eléctrica ist nicht erreichbar: Die zuletzt bekannten Preise bleiben in Gebrauch.',
    es: 'No se puede acceder a Red Eléctrica: se siguen usando los últimos precios conocidos.',
  },
  noPriceToday: {
    en: 'Red Eléctrica answers, but publishes no PVPC price for today.',
    fr: "Red Eléctrica répond, mais ne publie aucun prix PVPC pour aujourd'hui.",
    de: 'Red Eléctrica antwortet, veröffentlicht aber keinen PVPC-Preis für heute.',
    es: 'Red Eléctrica responde, pero no publica ningún precio PVPC para hoy.',
  },
};

/** Texts built from a value. */
export const MESSAGES = {
  /**
   * Result of the "Refresh now" action.
   * @param {{ today: number, tomorrow: number, price: string | null }} r
   */
  refreshed: ({ today, tomorrow, price }) => ({
    en: [
      `Prices received: ${today} hours today, ${tomorrow > 0 ? `${tomorrow} hours tomorrow` : 'tomorrow not published yet'}.`,
      price ? `Current price: ${price} €/kWh.` : 'No price for the current hour.',
    ].join('\n'),
    fr: [
      `Prix reçus : ${today} heures aujourd'hui, ${tomorrow > 0 ? `${tomorrow} heures demain` : 'demain pas encore publié'}.`,
      price ? `Prix actuel : ${price} €/kWh.` : "Aucun prix pour l'heure en cours.",
    ].join('\n'),
    de: [
      `Preise erhalten: ${today} Stunden heute, ${tomorrow > 0 ? `${tomorrow} Stunden morgen` : 'morgen noch nicht veröffentlicht'}.`,
      price ? `Aktueller Preis: ${price} €/kWh.` : 'Kein Preis für die aktuelle Stunde.',
    ].join('\n'),
    es: [
      `Precios recibidos: ${today} horas hoy, ${tomorrow > 0 ? `${tomorrow} horas mañana` : 'mañana todavía no publicado'}.`,
      price ? `Precio actual: ${price} €/kWh.` : 'No hay precio para la hora actual.',
    ].join('\n'),
  }),

  /**
   * The refresh action failed.
   * @param {string} reason technical reason (no secret: a public API)
   */
  refreshFailed: (reason) => ({
    en: `Red Eléctrica cannot be reached (${reason}). The last known prices stay in use.`,
    fr: `Red Eléctrica est injoignable (${reason}). Les derniers prix connus restent utilisés.`,
    de: `Red Eléctrica ist nicht erreichbar (${reason}). Die zuletzt bekannten Preise bleiben in Gebrauch.`,
    es: `No se puede acceder a Red Eléctrica (${reason}). Se siguen usando los últimos precios conocidos.`,
  }),
};

/**
 * The text of a multi-language object in `language`, English otherwise.
 * @param {Record<string, string>} text
 * @param {string} language
 */
export function pick(text, language) {
  return text[language] ?? text.en;
}
