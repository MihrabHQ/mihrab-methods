/**
 * Jordan — the Ministry of Awqaf, Islamic Affairs and Holy Places: the zones
 * its timetable is printed for, each with the point, the two horizon
 * allowances and the Fajr margin its times are computed with. Jerusalem is
 * one of them; like the rest it is printed on Jordan's clock.
 */
import zones from '../data/generated/jordanZones.js';
import corrections from '../data/generated/jordanCorrections.js';
import certification from '../data/generated/jordanCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'jordan' as const;
/** The Ministry's clock, for every zone: UTC+3 all year. */
const TZ = 'Asia/Amman';

function buildPlaces(): Place[] {
  return zones.map(z => {
    const key = String(z.id);
    return {
      authority: AUTHORITY,
      id: `${AUTHORITY}:${key}`,
      key,
      name: z.name,
      country: z.id === 33 ? 'PS' : 'JO',
      lat: z.lat,
      lon: z.lon,
      tz: TZ,
      dipDeg: z.dipEast,
      dipMaghribDeg: z.dipWest,
      fajrMinutes: z.fajrMinutes,
    };
  });
}

export const jordan = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.jordan,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Jordan — Ministry of Awqaf, Islamic Affairs and Holy Places',
    method:
      'Each zone at its own point, from Meeus’s apparent sun at each time’s own moment; Fajr and Isha at 18°, a zone’s Fajr earlier by its own margin of up to a minute; sunrise and Maghrib with the sun’s upper limb on the horizon (34′ of refraction and the day’s semi-diameter) lowered by the zone’s horizon allowance east and west; Dhuhr at the transit; Asr on the apparent sun at one shadow length; every time rounded to the nearest minute.',
    countries: ['JO', 'PS'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 18,
      asrShadow: 1,
      asr: 'on the apparent sun: the noon shadow from the refracted noon altitude',
      horizon: 'the upper limb with 34′ of refraction, lowered by the zone’s allowance (Place.dipDeg east, Place.dipMaghribDeg west)',
      fajrMargin: 'per zone, minutes (Place.fajrMinutes)',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun at each time’s own moment',
    },
    sources: [{ title: 'وزارة الأوقاف والشؤون والمقدسات الإسلامية — Ministry of Awqaf, Islamic Affairs and Holy Places', url: 'https://www.awqaf.gov.jo/' }],
    spec: 'docs/methods.md#jordan',
  },
});

export const places = jordan.places;
