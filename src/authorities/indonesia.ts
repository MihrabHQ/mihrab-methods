/**
 * Indonesia — Kemenag: every regency and city, at the point its table is
 * computed at, in the zone it is printed in.
 */
import regencies from '../data/generated/kemenagPlaces.js';
import points from '../data/generated/kemenagMethodPoints.js';
import corrections from '../data/generated/indonesiaCorrections.js';
import certification from '../data/generated/indonesiaCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'indonesia' as const;

/** Indonesia prints each regency in its own zone; the province says which. */
const WITA = new Set([
  'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara', 'Bali',
  'Nusa Tenggara Barat', 'Nusa Tenggara Timur', 'Sulawesi Barat', 'Sulawesi Selatan',
  'Sulawesi Tengah', 'Sulawesi Tenggara', 'Sulawesi Utara', 'Gorontalo',
]);
const WIT = new Set(['Maluku', 'Maluku Utara', 'Papua', 'Papua Barat']);
export function indonesiaZone(province: string): string {
  if (WIT.has(province)) return 'Asia/Jayapura';
  if (WITA.has(province)) return 'Asia/Makassar';
  return 'Asia/Jakarta';
}

function buildPlaces(): Place[] {
  return regencies.map(c => {
    const key = String(c.id);
    const province = /\(([^)]*)\)\s*$/.exec(c.nameEn ?? '')?.[1] ?? '';
    const p = points[key];
    return {
      authority: AUTHORITY,
      id: `${AUTHORITY}:${key}`,
      key,
      name: c.nameEn ?? c.name,
      country: 'ID',
      lat: p?.[0] ?? c.lat,
      lon: p?.[1] ?? c.lon,
      tz: indonesiaZone(province),
      highland: p ? (p[2] & 1) !== 0 : false,
      twilightDip: p ? (p[2] & 2) !== 0 : false,
      ...(p && p.length >= 5 ? { afternoon: [p[3], p[4]] as const } : {}),
    };
  });
}

export const indonesia = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.indonesia,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Indonesia — Kemenag (Ministry of Religious Affairs)',
    method:
      'The precise apparent sun (VSOP87, as JPL’s to a tenth of a second) taken at each prayer’s own moment; Fajr 20°, Isha 18°; sunrise and Maghrib at −1° (−2° in the highland class); Asr when the shadow is its length plus the noon shadow, the noon shadow from the declination at 00:00 UT; every time rounded up after a margin of two minutes (three for Dhuhr, minus three for sunrise).',
    countries: ['ID'],
    parameters: {
      fajrAngle: 20,
      ishaAngle: 18,
      sunriseAltitude: '−1°, or −2° in the highland class (Place.highland); the highland degree on Fajr and Isha too where Place.twilightDip',
      asrShadow: 1,
      asrNoonShadow: 'from the declination at 00:00 UT of the day',
      'margin.fajr': 2,
      'margin.sunrise': -3,
      'margin.dhuhr': 3,
      'margin.asr': 2,
      'margin.maghrib': 2,
      'margin.isha': 2,
      rounding: 'up to the minute, after the margin',
      sun: 'VSOP87 apparent sun (src/sun/preciseSun.ts), iterated at each prayer',
    },
    sources: [{ title: 'Kemenag — Jadwal Shalat', url: 'https://bimasislam.kemenag.go.id/jadwalshalat' }],
    spec: 'docs/methods.md#indonesia',
  },
});

export const places = indonesia.places;
