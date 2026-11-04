/**
 * Morocco — the Ministry of Habous and Islamic Affairs: its cities at the
 * points and horizons its tables are computed with.
 */
import cities from '../data/generated/moroccoCities.js';
import points from '../data/generated/moroccoMethodPoints.js';
import corrections from '../data/generated/moroccoCorrections.js';
import certification from '../data/generated/moroccoCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { moroccoDipEast, moroccoDipWest } from '../methods/morocco.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'morocco' as const;

/**
 * Morocco left GMT+1 for GMT on 2026-09-20 for good; the tz databases still
 * move its clock, so the zone is pinned rather than named.
 */
const MOROCCO_TZ = 'Etc/GMT';
/** The ministry's clock: GMT+1, then GMT — its tables print GMT from 17 September 2026, three days before the clocks moved. */
export const MOROCCO_CLOCK: [string, number][] = [['2020-01-01', 60], ['2026-09-17', 0]];

function buildPlaces(): Place[] {
  return cities
    .filter(c => typeof c.lat === 'number' && typeof c.lng === 'number')
    .map(c => {
      const key = String(c.id);
      const base = { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'MA', tz: MOROCCO_TZ, clock: MOROCCO_CLOCK };
      const p = points[key];
      return p
        ? { ...base, lat: p[0], lon: p[1], dipDeg: p[2], ...(p.length > 3 ? { dipMaghribDeg: p[3] } : {}) }
        : { ...base, lat: c.lat as number, lon: c.lng as number, dipDeg: moroccoDipEast(c.heightM ?? 0), dipMaghribDeg: moroccoDipWest(c.heightM ?? 0) };
    });
}

export const morocco = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.morocco,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Morocco — Ministry of Habous and Islamic Affairs',
    method:
      'Meeus’s apparent sun taken at each prayer’s own moment; Fajr 19°, Isha 17°; Asr on the apparent sun — the gnomon’s shadow at noon plus one length, refraction on both altitudes; Dhuhr five minutes after transit; sunrise one minute before and Maghrib 1.8 minutes after the sun on −(34′ + s) less each city’s own horizon allowance east and west (an angle, about 0.32°–0.37° + 0.02°·√height); Fajr rounded down, the rest to the nearest minute; printed on the ministry’s clock (GMT+1 until 17 September 2026, then GMT).',
    countries: ['MA'],
    parameters: {
      fajrAngle: 19,
      ishaAngle: 17,
      asrShadow: 1,
      dhuhrAfterTransitMinutes: 5,
      sunriseMarginMinutes: -1.0,
      maghribMarginMinutes: 1.8,
      refractionArcmin: 34,
      asrRefraction: 'Sæmundsson from the true altitude at noon, Bennett under the apparent altitude at Asr (Meeus 16.4, 16.3)',
      sunSemidiameter: 'by the sun’s distance that day',
      horizonDip: 'per city and per side, fitted (Place.dipDeg, Place.dipMaghribDeg); else 0.32° + 0.025°·√height east, 0.37° + 0.021°·√height west',
      rounding: 'Fajr down to the minute, the rest to the nearest',
      sun: 'Meeus, apparent, with the full nutation; chapter-28 equation of time; iterated at each prayer',
    },
    sources: [{ title: 'Ministry of Habous and Islamic Affairs — horaires des prières', url: 'https://www.habous.gov.ma/' }],
    spec: 'docs/methods.md#morocco',
  },
});

export const places = morocco.places;
