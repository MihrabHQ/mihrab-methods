/**
 * Algeria — the Ministry of Religious Affairs and Wakfs: its cities at the
 * points its table is computed at.
 */
import cities from '../data/generated/algeriaCities.js';
import points from '../data/generated/algeriaMethodPoints.js';
import corrections from '../data/generated/algeriaCorrections.js';
import certification from '../data/generated/algeriaCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'algeria' as const;

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return {
      authority: AUTHORITY,
      id: `${AUTHORITY}:${key}`,
      key,
      name: c.nameEn ?? c.name,
      country: 'DZ',
      lat: points[key]?.[0] ?? c.lat,
      lon: points[key]?.[1] ?? c.lon,
      tz: 'Africa/Algiers',
    };
  });
}

export const algeria = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.algeria,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Algeria — Ministry of Religious Affairs and Wakfs',
    method:
      'NOAA’s solar formulas; Dhuhr at the transit; every other time the transit plus or minus the hour angle, the declination taken at that prayer’s own moment and the equation of time kept at noon’s; Fajr 18°, Isha 17°, sunrise and sunset at −0.833°; Asr from the signed noon shadow; Maghrib three minutes after sunset; every time rounded up to the minute.',
    countries: ['DZ'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 17,
      sunriseAltitude: -0.833,
      asrShadow: 1,
      asrNoonShadow: 'tan(φ − δ) with its sign',
      maghribAfterSunsetMinutes: 3,
      rounding: 'up to the minute',
      sun: 'NOAA solar calculator series; declination iterated at each prayer, equation of time at noon',
    },
    sources: [{ title: 'Ministry of Religious Affairs and Wakfs — مواقيت الصلاة', url: 'https://www.marw.dz/' }],
    spec: 'docs/methods.md#algeria',
  },
});

export const places = algeria.places;
