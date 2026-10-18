/**
 * Diyanet — Türkiye's districts (a point per prayer per year) and its
 * places worldwide, each at the point Diyanet computes it, in the zone its
 * table is printed in, with Isha's angle for its country.
 */
import world from '../data/generated/diyanetWorldPoints.js';
import turkey from '../data/generated/diyanetTurkeyPoints.js';
import countries from '../data/generated/diyanetCountries.js';
import corrections from '../data/generated/diyanetCorrections.js';
import certification from '../data/generated/diyanetCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'diyanet' as const;

/** Diyanet's own country numbers → ISO 3166-1 alpha-2 (Northern Cyprus is 'CY'). */
export function diyanetCountry(id: string): { name: string; iso: string } {
  return countries[id] ?? { name: `Country ${id}`, iso: 'ZZ' };
}

function buildPlaces(): Place[] {
  const out: Place[] = Object.entries(world).map(([iid, v]) => ({
    authority: AUTHORITY,
    id: `${AUTHORITY}:${iid}`,
    key: iid,
    name: v.name,
    country: diyanetCountry(v.country).iso,
    lat: v.lat,
    lon: v.lon,
    tz: v.tz,
    ishaDeg: v.ishaDeg,
    ...(v.clock ? { clock: v.clock } : {}),
  }));
  // Türkiye's districts (and Northern Cyprus's), with a point per prayer per year
  for (const [iid, v] of Object.entries(turkey)) {
    const base = v.years['2026'] ?? Object.values(v.years)[0];
    out.push({
      authority: AUTHORITY,
      id: `${AUTHORITY}:${iid}`,
      key: iid,
      name: v.name,
      country: v.country === '1' ? 'CY' : 'TR',
      lat: base[1][0],
      lon: base[1][1],
      tz: v.country === '1' ? 'Asia/Nicosia' : 'Europe/Istanbul',
      ishaDeg: 17,
      prayerPoints: v.years,
    });
  }
  return out;
}

const places = buildPlaces();

export const diyanet = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.diyanet,
  places,
  corrections,
  certification,
  description: {
    name: 'Diyanet — Türkiye and worldwide',
    method:
      'The Congress method as Diyanet computes it (see Sweden), with Isha at 16° in most of Europe, Russia, Central Asia, China and North America and 17° elsewhere; in Türkiye and Northern Cyprus each prayer at a point of its own per district and year; tables printed on their own clocks where Diyanet keeps one.',
    countries: [...new Set(places.map(p => p.country))].sort(),
    parameters: {
      fajrAngle: 18,
      ishaAngle: '16 or 17, by country (Place.ishaDeg)',
      sunriseAltitude: -0.833,
      asrShadow: 1,
      'temkin.sunrise': -7,
      'temkin.dhuhr': 5,
      'temkin.asr': 4,
      'temkin.maghrib': 7,
      minimumDayMinutes: 300,
      minimumNightMinutes: 300,
      transitionBandMinutes: 20,
      highLatitudeRule: 'the Congress’s, worked at 16° whatever the printed Isha angle; midsummer is the takdir’s day where its true Isha falls later than the carried share',
      rounding: 'to the nearest minute, after the method’s own temkin',
      coordinatePrecision: '0.001°',
    },
    sources: [
      { title: 'Diyanet — Namaz Vakitleri', url: 'https://namazvakti.diyanet.gov.tr/' },
      { title: 'Diyanet — the Congress’s criteria (Tespit Kriterleri)', url: 'https://awqatsalah.com/' },
    ],
    spec: 'docs/methods.md#sweden-and-diyanet',
  },
});

export { places };
