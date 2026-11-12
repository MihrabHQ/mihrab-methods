/**
 * United Kingdom — Wifaqul Ulama (Britain): the towns it prints a yearly
 * timetable for, each at the point its times are computed at.
 */
import towns from '../data/generated/wifaqTowns.js';
import corrections from '../data/generated/wifaqCorrections.js';
import certification from '../data/generated/wifaqCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'wifaq' as const;
/** Jersey and Ireland keep London's clock. */
const TZ = 'Europe/London';

function buildPlaces(): Place[] {
  return towns.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: c.country, lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const wifaq = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.wifaq,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'United Kingdom — Wifaqul Ulama (Britain)',
    method:
      'Meeus’s apparent sun, iterated; Fajr at 18° (the middle of the night where the sun does not reach it); sunrise at −0.8333°; Zuhr four minutes after the transit; Asr at two shadow lengths (Hanafi), the noon shadow from the declination near 0h UT; Maghrib five minutes after sunset; Isha at 15° or a seventh of the night after sunset, whichever is earlier; the nearest minute.',
    countries: ['GB', 'JE', 'IE'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 15,
      ishaNightShare: 'one seventh of sunset to the next sunrise, where earlier than 15° or where 15° is not reached',
      sunriseAltitude: -0.8333,
      asrShadow: 2,
      dhuhr: 'four minutes after the sun’s transit',
      maghrib: 'five minutes after sunset',
      perpetualTwilight: 'Fajr at the middle of that date’s sunset and the previous day’s sunrise, twelve hours earlier',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun, declination and equation of time iterated at each time',
    },
    sources: [{ title: 'Wifaqul Ulama (Britain) — Salah Times and Timetables', url: 'https://www.wifaqululama.co.uk/salahtimes/' }],
    spec: 'docs/methods.md#united-kingdom-wifaqul-ulama',
  },
});

export const places = wifaq.places;
