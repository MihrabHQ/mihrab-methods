/**
 * Kazakhstan — the Spiritual Administration of Muslims of Kazakhstan: its
 * cities, each at the coordinates the Administration computes it at.
 */
import cities from '../data/generated/kazakhstanCities.js';
import corrections from '../data/generated/kazakhstanCorrections.js';
import certification from '../data/generated/kazakhstanCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'kazakhstan' as const;
/** The whole country keeps UTC+5 (since 1 March 2024), and the Administration prints every place on it. */
const TZ = 'Asia/Almaty';

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'KZ', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const kazakhstan = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.kazakhstan,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Kazakhstan — Spiritual Administration of Muslims of Kazakhstan',
    method:
      'A short series for the sun, each time computed once from a fixed first guess of its hour; Fajr and Isha at 15°, capped at a quarter of the night from sunrise and sunset; sunrise and sunset at −0.833°; Asr at two shadow lengths (Hanafi); a margin of 3 minutes (5 from 48° N) before sunrise, after the transit, on Asr and on Maghrib after sunset; every time rounded to the nearest minute.',
    countries: ['KZ'],
    parameters: {
      fajrAngle: 15,
      ishaAngle: 15,
      sunriseAltitude: -0.833,
      asrShadow: 2,
      highLatitude: 'a quarter of the night, where the angle is further or not reached',
      marginMinutes: '3; 5 from 48° N — sunrise earlier, Dhuhr, Asr and Maghrib later',
      rounding: 'to the nearest minute',
      sun: 'low-precision series (mean elements linear in time, two terms of the equation of the centre), not iterated',
    },
    sources: [{ title: 'Spiritual Administration of Muslims of Kazakhstan — намаз уақыттары', url: 'https://namaz.muftyat.kz/' }],
    spec: 'docs/methods.md#kazakhstan',
  },
});

export const places = kazakhstan.places;
