/**
 * Albania — the Muslim Community of Albania: Tirana and the towns its
 * calendar gives, in Albania and among its neighbours. The Community prints
 * one table, computed at Tirana, and gives each other town as whole minutes
 * on it; a town's point here carries those minutes in its longitude (a
 * quarter of a degree from Tirana's to the minute), which is what the
 * method reads, and towns with the same minutes are told apart by a
 * thousandth of a degree of latitude, which it does not read. The points
 * are not where the towns are.
 */
import towns from '../data/generated/albaniaTowns.js';
import corrections from '../data/generated/albaniaCorrections.js';
import certification from '../data/generated/albaniaCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'albania' as const;

function buildPlaces(): Place[] {
  return towns.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: c.country, lat: c.lat, lon: c.lon, tz: c.tz };
  });
}

export const albania = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.albania,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Albania — Muslim Community of Albania (KMSH)',
    method:
      'One table a year, computed for Tirana (41°20′ N, 19°49′ E) with the sun taken once a day, at 0h UT of the date: Meeus’s apparent sun, one declination and one equation of time for the day; Fajr (the calendar’s Imsak) at 18°, Isha at 17°, sunrise and Maghrib at −0.8333°, Asr at one shadow length; sunrise 7 minutes earlier, Dhuhr 5 later, Asr 4 later, Maghrib 7 later; the nearest minute. Each other town is Tirana’s table plus its whole minutes.',
    countries: ['AL', 'XK', 'MK', 'ME', 'RS'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 17,
      sunriseAltitude: -0.8333,
      asrShadow: 1,
      sun: 'Meeus’s apparent sun, taken once for the whole day at 0h UT of the date; no time iterated to its own moment',
      marginMinutes: 'Fajr none; sunrise 7 earlier, Dhuhr 5 later, Asr 4 later, Maghrib 7 later; Isha none',
      towns: 'the reference town’s table plus the town’s whole minutes',
      rounding: 'to the nearest minute',
    },
    sources: [{ title: 'Komuniteti Mysliman i Shqipërisë — Kalendari i vitit', url: 'https://www.kmsh.al/' }],
    spec: 'docs/methods.md#albania',
  },
});

export const places = albania.places;
