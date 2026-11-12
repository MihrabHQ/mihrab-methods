/**
 * Pakistan — Jamia Uloom-ul-Islamia, Banuri Town (Karachi): the cities of
 * Pakistan its prayer-times page lists, each at the point its times are
 * computed at.
 */
import cities from '../data/generated/banuriCities.js';
import corrections from '../data/generated/banuriCorrections.js';
import certification from '../data/generated/banuriCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'banuri' as const;
/** Pakistan keeps UTC+5 all year. */
const TZ = 'Asia/Karachi';

function buildPlaces(): Place[] {
  return cities.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'PK', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const banuri = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.banuri,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Pakistan — Jamia Uloom-ul-Islamia, Banuri Town (University of Islamic Sciences, Karachi)',
    method:
      'Kazakhstan’s sun and arithmetic (a short series for the sun, each time computed once from a fixed first guess of its hour); Fajr and Isha at 18°, sunrise and sunset at −0.833°, the zenith at the transit, Asr at two shadow lengths (Hanafi); no margins; the nearest minute.',
    countries: ['PK'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 18,
      sunriseAltitude: -0.833,
      asrShadow: 2,
      dhuhr: 'the zenith (zawal), the sun’s transit, as the page prints it',
      marginMinutes: 'none',
      rounding: 'to the nearest minute',
      sun: 'low-precision series (mean elements linear in time, two terms of the equation of the centre), not iterated',
    },
    sources: [{ title: 'جامعہ علوم اسلامیہ علامہ بنوری ٹاؤن — نماز کے اوقات', url: 'https://www.banuri.edu.pk/namaz-times' }],
    spec: 'docs/methods.md#pakistan-jamia-banuri-town',
  },
});

export const places = banuri.places;
