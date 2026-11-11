/**
 * Türkiye Takvimi — the calendar's cities, each at the point and with the
 * temkin its published year is computed with. The first list is Türkiye's
 * 81 province centres.
 */
import cities from '../data/generated/turkiyeTakvimiCities.js';
import corrections from '../data/generated/turkiyetakvimiCorrections.js';
import certification from '../data/generated/turkiyetakvimiCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'turkiyetakvimi' as const;

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return {
      authority: AUTHORITY,
      id: `${AUTHORITY}:${key}`,
      key,
      name: c.name,
      country: 'TR',
      lat: c.lat,
      lon: c.lon,
      tz: 'Europe/Istanbul',
      temkin: c.temkin,
    };
  });
}

export const turkiyeTakvimi = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.turkiyetakvimi,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Türkiye Takvimi',
    method:
      'The precise apparent sun at each event’s own moment, and a temkin T per city (the time the sun takes on the summer solstice from the level horizon to the city’s own). Fajr is the calendar’s Sabâh, the sun 18° below the horizon with no temkin; sunrise the sun’s centre on the level horizon less T and two minutes; Dhuhr the transit plus T; Asr (the noon shadow taken at the declination of local noon) and Isha (17°) plus T; Maghrib the level horizon plus T and two minutes; every time rounded up to the minute.',
    countries: ['TR'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 17,
      sunriseAltitude: 0,
      asrShadow: 1,
      asrNoonShadow: 'tan|φ − δ| at the declination of local noon',
      temkin: 'per city, minutes: on Dhuhr, Asr, Maghrib and Isha, and before sunrise',
      horizonMarginMinutes: 2,
      rounding: 'up to the minute',
      sun: 'precise apparent sun (VSOP87, IAU 2006 precession, IAU 2000B nutation), iterated at each event',
    },
    sources: [{ title: 'Türkiye Takvimi — namaz vakitleri', url: 'https://www.namazvakti.com/' }],
    spec: 'docs/methods.md#türkiye-takvimi',
  },
});

export const places = turkiyeTakvimi.places;
