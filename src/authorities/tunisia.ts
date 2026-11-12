/**
 * Tunisia — Institut National de la Météorologie: the places its times are published for, each at the point
 * they are computed at.
 */
import list from '../data/generated/tunisiaPlaces.js';
import corrections from '../data/generated/tunisiaCorrections.js';
import certification from '../data/generated/tunisiaCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'tunisia' as const;
const TZ = 'Africa/Tunis';

function buildPlaces(): Place[] {
  return list.map(p => {
    const key = String(p.id);
    return {
      authority: AUTHORITY,
      id: `${AUTHORITY}:${key}`,
      key,
      name: p.name,
      country: 'TN',
      lat: p.lat,
      lon: p.lon,
      tz: TZ,
      dipDeg: p.dip,
      dipMaghribDeg: p.dipSunset,
    };
  });
}

export const tunisia = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.tunisia,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    "name": "Tunisia — Institut National de la Météorologie",
    "method": "Meeus’s apparent sun. Dhuhr seven minutes after the transit and Asr (one shadow length, plain geometry) on the sun of 0 h UT; Fajr and Isha at 18° and sunset at 0.8333°, the sun at each time’s own moment, the horizon lowered by the place’s allowance; Maghrib two minutes after sunset; the nearest minute. No sunrise is given: the one here mirrors the sunset and is not checked.",
    "countries": [
      "TN"
    ],
    "parameters": {
      "fajrAngle": 18,
      "ishaAngle": 18,
      "sunsetAltitude": -0.8333,
      "horizon": "lowered by the place’s allowance (its height’s dip, 0.06° to 0.88°)",
      "dhuhrMinutes": 7,
      "maghribMinutes": 2,
      "asrShadow": 1,
      "asr": "plain geometry on the sun of 0 h UT",
      "rounding": "to the nearest minute",
      "sun": "Meeus, apparent; the day’s (0 h UT) for Dhuhr and Asr, iterated for the others",
      "notPrinted": "sunrise"
    },
    "sources": [
      {
        "title": "Institut National de la Météorologie — Horaires des prières",
        "url": "https://www.meteo.tn/fr/heures-prieres"
      }
    ],
    "spec": "docs/methods.md#tunisia"
  },
});

export const places = tunisia.places;
