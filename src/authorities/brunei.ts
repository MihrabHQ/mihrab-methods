/**
 * Brunei — the Ministry of Religious Affairs: its four districts. The
 * Ministry prints one table, computed at Bandar Seri Begawan, and gives the
 * districts as whole minutes on it; a district's point here carries those
 * minutes in its longitude (a quarter of a degree west of the capital's to
 * the minute), which is what the method reads.
 */
import districts from '../data/generated/bruneiDistricts.js';
import corrections from '../data/generated/bruneiCorrections.js';
import certification from '../data/generated/bruneiCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'brunei' as const;
const TZ = 'Asia/Brunei';

function buildPlaces(): Place[] {
  return districts.map(c => {
    const key = String(c.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: c.name, country: 'BN', lat: c.lat, lon: c.lon, tz: TZ };
  });
}

export const brunei = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.brunei,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Brunei — Ministry of Religious Affairs',
    method:
      'One table for the country, computed at Bandar Seri Begawan with Meeus’s apparent sun taken once for the day at 0h UT; Fajr at 20°, Isha at 18°; sunrise and Maghrib with the sun’s centre 0.833° below the horizon; Dhuhr 1.06 minutes after the transit; Asr at one shadow length; every time rounded to the nearest minute; a district adds its whole minutes (Tutong 1, Belait 3).',
    countries: ['BN'],
    parameters: {
      fajrAngle: 20,
      ishaAngle: 18,
      sunriseAltitude: -0.833,
      asrShadow: 1,
      dhuhrAfterTransitMinutes: 1.06,
      districtMinutes: 'Tutong 1, Belait 3; Brunei-Muara and Temburong none',
      rounding: 'to the nearest minute',
      sun: 'Meeus’s apparent sun at 0h UT of the date, for every time of the day',
    },
    sources: [{ title: 'Kementerian Hal Ehwal Ugama — Waktu Sembahyang', url: 'https://www.mora.gov.bn/SitePages/WaktuSembahyang.aspx' }],
    spec: 'docs/methods.md#brunei',
  },
});

export const places = brunei.places;
