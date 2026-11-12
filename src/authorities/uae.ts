/**
 * United Arab Emirates — the General Authority of Islamic Affairs,
 * Endowments and Zakat: the zones its prayer times are published for, each
 * with the point, the two horizon allowances and the morning margin its
 * times are computed with.
 */
import zones from '../data/generated/uaeZones.js';
import corrections from '../data/generated/uaeCorrections.js';
import certification from '../data/generated/uaeCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'uae' as const;
/** The Emirates keep UTC+4 all year. */
const TZ = 'Asia/Dubai';

function buildPlaces(): Place[] {
  return zones.map(z => {
    const key = String(z.id);
    return {
      authority: AUTHORITY,
      id: `${AUTHORITY}:${key}`,
      key,
      name: z.name,
      country: 'AE',
      lat: z.lat,
      lon: z.lon,
      tz: TZ,
      dipDeg: z.dipEast,
      dipMaghribDeg: z.dipWest,
      // the zone's margin on its morning: Fajr and sunrise both
      fajrMinutes: z.morningMinutes,
    };
  });
}

export const uae = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.uae,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'United Arab Emirates — General Authority of Islamic Affairs, Endowments and Zakat',
    method:
      'Meeus’s apparent sun at each time’s own moment; Fajr and Isha at 18°; sunrise and Maghrib with the upper limb on the horizon (34′ of refraction, the day’s semi-diameter) lowered by the zone’s horizon allowance, east and west; the zone’s morning (Fajr and sunrise) earlier by its own margin; Dhuhr two minutes after the transit; Asr on the apparent sun with the noon shadow taken at Dhuhr; every time rounded to the nearest minute.',
    countries: ['AE'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 18,
      horizon: 'upper limb, 34′ refraction, semi-diameter for the day’s distance, lowered by the zone’s allowance (east for sunrise, west for Maghrib)',
      morningMargin: 'per zone, nothing to 2.2 minutes earlier, on Fajr and sunrise',
      dhuhrMinutes: 2,
      asrShadow: 1,
      asr: 'on the apparent sun: the refracted altitude at Dhuhr gives the noon shadow',
      imsak: 'Fajr less 10 minutes',
      rounding: 'to the nearest minute',
      sun: 'Meeus, apparent, iterated',
    },
    sources: [{ title: 'الهيئة العامة للشؤون الإسلامية والأوقاف والزكاة — مواقيت الصلاة', url: 'https://www.awqaf.gov.ae/prayer-times' }],
    spec: 'docs/methods.md#united-arab-emirates',
  },
});

export const places = uae.places;
