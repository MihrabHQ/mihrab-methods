/**
 * Kuwait — the Ministry of Awqaf and Islamic Affairs: Kuwait City and the
 * areas its table gives. The Ministry prints one table, computed at Kuwait
 * City, and gives each area as whole minutes on it; an area's point here
 * carries those minutes in its longitude (a quarter of a degree from the
 * city's to the minute), which is what the method reads, and areas with the
 * same minutes are told apart by a thousandth of a degree of latitude, which
 * it does not read. The points are not where the areas are.
 */
import areas from '../data/generated/kuwaitAreas.js';
import corrections from '../data/generated/kuwaitCorrections.js';
import certification from '../data/generated/kuwaitCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'kuwait' as const;
const TZ = 'Asia/Kuwait';

function buildPlaces(): Place[] {
  return areas.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'KW', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const kuwait = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.kuwait,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Kuwait — Ministry of Awqaf and Islamic Affairs',
    method:
      'One table for the country, the same every year: each day’s times are those of that day of 1978 at Kuwait City (29 February has 28 February’s), from Meeus’s apparent sun at each time’s own moment; Fajr at 18°, Isha at 17.5°; sunrise and Maghrib with the sun’s centre 0.8333° below the horizon; Dhuhr at the transit; Asr at one shadow length, the noon shadow from the declination of local noon, plus 0.15 minutes; every time rounded to the nearest minute; an area adds its whole minutes.',
    countries: ['KW'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 17.5,
      sunriseAltitude: -0.8333,
      asrShadow: 1,
      asrMarginMinutes: 0.15,
      tableYear: 1978,
      areaMinutes: 'whole minutes on Kuwait City’s times, from −4 (Qaruh) to +6 (Salmy)',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun at each time’s own moment, for the day of 1978',
    },
    sources: [{ title: 'وزارة الأوقاف والشؤون الإسلامية — Ministry of Awqaf and Islamic Affairs', url: 'https://www.awqaf.gov.kw/' }],
    spec: 'docs/methods.md#kuwait',
  },
});

export const places = kuwait.places;
