/**
 * Egypt — the Egyptian General Authority of Survey: its cities and towns,
 * each at the point its published year shows.
 */
import cities from '../data/generated/egyptCities.js';
import corrections from '../data/generated/egyptCorrections.js';
import certification from '../data/generated/egyptCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'egypt' as const;
/** One clock for the country, summer time included, and the Authority prints every place on it. */
const TZ = 'Africa/Cairo';

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'EG', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const egypt = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.egypt,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Egypt — Egyptian General Authority of Survey',
    method:
      'Meeus’s apparent sun at each time’s own moment; Fajr at 19.5°, Isha at 17.5°; sunrise and Maghrib with the sun’s centre 0.845° below the horizon; Asr one shadow length beyond the noon shadow, the noon shadow from the declination of local noon; no margins; every time rounded to the nearest minute.',
    countries: ['EG'],
    parameters: {
      fajrAngle: 19.5,
      ishaAngle: 17.5,
      sunriseAltitude: -0.845,
      asrShadow: 1,
      marginMinutes: 'none',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun, the declination and the equation of time at each time’s own moment',
    },
    sources: [{ title: 'Egyptian General Authority of Survey — مواقيت الصلاة', url: 'https://www.esa.gov.eg/praytimes.aspx' }],
    spec: 'docs/methods.md#egypt',
  },
});

export const places = egypt.places;
