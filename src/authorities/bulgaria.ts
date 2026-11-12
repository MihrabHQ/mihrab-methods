/**
 * Bulgaria — the Grand Mufti's Office: Sofia and the towns its timetable
 * gives. The Office prints one table, computed at Sofia, and gives each
 * other town as whole minutes on it; a town's point here carries those
 * minutes in its longitude (a quarter of a degree from Sofia's to the
 * minute), which is what the method reads, and towns with the same minutes
 * are told apart by a thousandth of a degree of latitude, which it does not
 * read. The points are not where the towns are.
 */
import towns from '../data/generated/bulgariaTowns.js';
import corrections from '../data/generated/bulgariaCorrections.js';
import certification from '../data/generated/bulgariaCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'bulgaria' as const;
const TZ = 'Europe/Sofia';

function buildPlaces(): Place[] {
  return towns.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'BG', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const bulgaria = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.bulgaria,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Bulgaria — Grand Mufti’s Office',
    method:
      'One table, computed for Sofia with the sun taken once a day, at 11h UT of the day before: Meeus’s apparent sun, one declination and one equation of time for the day; Fajr at 18°, Isha at 17°, sunrise and Maghrib at −0.8333°, Asr at one shadow length; Fajr a minute earlier, sunrise 7 earlier, Dhuhr 5 later, Asr 4 later, Maghrib 7 later; the nearest minute. Each other town is Sofia’s table plus its whole minutes.',
    countries: ['BG'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 17,
      sunriseAltitude: -0.8333,
      asrShadow: 1,
      sun: 'Meeus’s apparent sun, taken once for the whole day at 11h UT of the day before; no time iterated to its own moment',
      marginMinutes: 'Fajr 1 minute earlier; sunrise 7 earlier, Dhuhr 5 later, Asr 4 later, Maghrib 7 later; Isha none',
      towns: 'the reference town’s table plus the town’s whole minutes',
      rounding: 'to the nearest minute',
    },
    sources: [{ title: 'Главно мюфтийство — Времена за намаз', url: 'https://www.grandmufti.bg/bg/home/vremena-za-namaz.html' }],
    spec: 'docs/methods.md#bulgaria',
  },
});

export const places = bulgaria.places;
