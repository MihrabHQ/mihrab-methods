/**
 * Sweden — Diyanet's Congress method, as Islamiska Förbundet's timetables
 * print it: the towns at the points Diyanet computes them.
 */
import coords from '../data/generated/swedenPlaces.js';
import corrections from '../data/generated/swedenCorrections.js';
import certification from '../data/generated/swedenCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import { citySlug } from './slug.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'sweden' as const;

function buildPlaces(): Place[] {
  return Object.entries(coords).map(([name, c]) => {
    const key = citySlug(name);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name, country: 'SE', lat: c.lat, lon: c.lng, tz: 'Europe/Stockholm' };
  });
}

export const sweden = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.sweden,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Sweden — Diyanet’s method, as used by Islamiska Förbundet',
    method:
      'The International Prayer Times Congress method (Istanbul, 2021) as Diyanet computes it: true Fajr at 18° and Isha at 16°, with the night’s share carried through the summer gap, five-hour floors on the day and the night, and gradual transitions; the sun taken once a day from Meeus’s mean elements.',
    countries: ['SE'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 16,
      sunriseAltitude: -0.833,
      asrShadow: 1,
      'temkin.sunrise': -7,
      'temkin.dhuhr': 5,
      'temkin.asr': 4,
      'temkin.maghrib': 7,
      minimumDayMinutes: 300,
      minimumNightMinutes: 300,
      transitionBandMinutes: 20,
      highLatitudeRule: 'the share of the night carried from the last day the 18° dawn formed; Fajr’s share scaled by 18/16',
      rounding: 'to the nearest minute, after the method’s own temkin',
      coordinatePrecision: '0.001°',
    },
    sources: [
      { title: 'Islamiska Förbundet i Sverige — bönetider', url: 'https://www.islamiskaforbundet.se/' },
      { title: 'Diyanet — Namaz Vakitleri', url: 'https://namazvakti.diyanet.gov.tr/' },
      { title: 'Diyanet — the Congress’s criteria (Tespit Kriterleri)', url: 'https://awqatsalah.com/' },
    ],
    spec: 'docs/methods.md#sweden-and-diyanet',
  },
});

export const places = sweden.places;
