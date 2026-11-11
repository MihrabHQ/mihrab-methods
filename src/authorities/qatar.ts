/**
 * Qatar — the Qatar Calendar House: Doha, the place its calendar prints.
 * The House gives Doha's times as the reference for the east coast, from
 * Al Khor to Al Wakra.
 */
import cities from '../data/generated/qatarCities.js';
import corrections from '../data/generated/qatarCorrections.js';
import certification from '../data/generated/qatarCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'qatar' as const;
const TZ = 'Asia/Qatar';

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'QA', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const qatar = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.qatar,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Qatar — Qatar Calendar House',
    method:
      'Meeus’s apparent sun at each time’s own moment; Fajr at 18° less 1.12 minutes; sunrise with the sun’s centre 0.8333° below the horizon less 0.10; Dhuhr 0.95 minutes after the transit; Asr at one shadow length plus 0.87; Maghrib at sunset plus 2.02; each rounded to the nearest minute; Isha ninety minutes after the Maghrib printed.',
    countries: ['QA'],
    parameters: {
      fajrAngle: 18,
      sunriseAltitude: -0.8333,
      asrShadow: 1,
      marginMinutes: 'Fajr −1.12, sunrise −0.10, Dhuhr +0.95, Asr +0.87, Maghrib +2.02',
      isha: '90 minutes after the printed Maghrib',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun at each time’s own moment',
    },
    sources: [{ title: 'دار التقويم القطري — Qatar Calendar House', url: 'https://www.qatarch.com/' }],
    spec: 'docs/methods.md#qatar',
  },
});

export const places = qatar.places;
