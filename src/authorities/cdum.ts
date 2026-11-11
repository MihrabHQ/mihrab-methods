/**
 * The Central Muftiate of Russia — the Central Spiritual Administration of
 * Muslims of Russia: the cities it publishes a yearly timetable for, each
 * at the point its times are computed at and on its own clock.
 */
import cities from '../data/generated/cdumCities.js';
import corrections from '../data/generated/cdumCorrections.js';
import certification from '../data/generated/cdumCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'cdum' as const;

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'RU', lat: c.lat, lon: c.lon, tz: c.tz };
  });
}

export const cdum = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.cdum,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Russia — Central Spiritual Administration of Muslims of Russia',
    method:
      'Kazakhstan’s sun and arithmetic (a short series for the sun, each time computed once from a fixed first guess of its hour); Fajr at 18°, Isha at 17°, sunrise and sunset at −0.833°, Asr at two shadow lengths; a margin of 2 minutes on every time (Fajr and sunrise earlier, the rest later), then the nearest minute; where the sun does not reach 18° in the morning or 17° in the evening, the 45th parallel’s share of the night: its Fajr-to-sunrise and Maghrib-to-Isha minutes, scaled by the place’s night over the parallel’s, before the printed sunrise and after the printed Maghrib, the minute cut off.',
    countries: ['RU'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 17,
      sunriseAltitude: -0.833,
      asrShadow: 2,
      marginMinutes: '2 on every time: Fajr and sunrise earlier, Dhuhr, Asr, Maghrib and Isha later',
      whiteNights: 'where the twilight does not form: the share of the night the same time takes at latitude 45° on the place’s meridian, on the printed minutes, cut to the minute',
      rounding: 'to the nearest minute',
      sun: 'low-precision series (mean elements linear in time, two terms of the equation of the centre), not iterated',
    },
    sources: [{ title: 'Центральное духовное управление мусульман России — Время намаза', url: 'https://cdum.ru/time-namaz/Moskva/index.php' }],
    spec: 'docs/methods.md#russia-the-central-muftiate',
  },
});

export const places = cdum.places;
