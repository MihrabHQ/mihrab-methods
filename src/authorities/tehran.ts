/**
 * Iran — the Institute of Geophysics of the University of Tehran: the
 * thirty-one province capitals its Calendar Center prints a sheet for, each
 * at the point its times are computed at.
 */
import cities from '../data/generated/tehranCities.js';
import corrections from '../data/generated/tehranCorrections.js';
import certification from '../data/generated/tehranCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'tehran' as const;
/** Iran keeps UTC+3:30 all year, since 2022. */
const TZ = 'Asia/Tehran';

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'IR', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const tehran = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.tehran,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Iran — Institute of Geophysics, University of Tehran',
    method:
      'Meeus’s apparent sun at each time’s own moment, iterated; Fajr at 17.7°, sunrise at −0.8333°, Dhuhr at the transit, Maghrib at 4.5° below the horizon; no margins; the nearest minute. Asr (one shadow length) and Isha (14°) are computed but not printed by the Institute, so they are not held to a table.',
    countries: ['IR'],
    parameters: {
      fajrAngle: 17.7,
      maghribAngle: 4.5,
      ishaAngle: 14,
      sunriseAltitude: -0.8333,
      asrShadow: 1,
      dhuhr: 'the sun’s transit',
      marginMinutes: 'none',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun, declination and equation of time iterated at each time',
      notPrinted: 'Asr and Isha: the sheets print Fajr, sunrise, Dhuhr, sunset, Maghrib and midnight',
    },
    sources: [{ title: 'مرکز تقویم مؤسسه ژئوفیزیک دانشگاه تهران — اوقات شرعی مراکز استان‌ها', url: 'https://calendar.ut.ac.ir/fa' }],
    spec: 'docs/methods.md#iran-institute-of-geophysics-tehran',
  },
});

export const places = tehran.places;
