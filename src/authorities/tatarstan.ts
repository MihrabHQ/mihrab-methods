/**
 * Tatarstan — the Spiritual Administration of Muslims of the Republic of
 * Tatarstan: the places of its yearly timetable, each with the point and
 * the small horizon allowance its times are computed with.
 */
import list from '../data/generated/tatarstanPlaces.js';
import corrections from '../data/generated/tatarstanCorrections.js';
import certification from '../data/generated/tatarstanCertification.js';
import { METHOD_REVISION } from '../methods/revisions.js';
import { registerAuthority } from '../core/registry.js';
import type { Place } from '../core/types.js';

const AUTHORITY = 'tatarstan' as const;
const TZ = 'Europe/Moscow';

function buildPlaces(): Place[] {
  return list.map(p => {
    const key = String(p.id);
    return { authority: AUTHORITY, id: `${AUTHORITY}:${key}`, key, name: p.name, country: 'RU', lat: p.lat, lon: p.lon, tz: TZ, dipDeg: p.dip };
  });
}

export const tatarstan = registerAuthority({
  authority: AUTHORITY,
  revision: METHOD_REVISION.tatarstan,
  places: buildPlaces(),
  corrections,
  certification,
  description: {
    name: 'Tatarstan — Spiritual Administration of Muslims of the Republic of Tatarstan',
    method:
      'Meeus’s apparent sun at each time’s own moment; the dawn (the end of sahur) at 18°, rounded down; sunrise and Maghrib with the sun’s centre 0.8333° below the horizon and the place’s small allowance, the zenith at the transit, Asr at two shadow lengths on the apparent sun, Isha at 15°, each rounded up; on the days the sun does not reach 18° the dawn is 121 minutes before sunrise and Isha 90 minutes after Maghrib. The mosques’ own morning time (91 minutes before sunrise) and fixed-clock Dhuhr are printed in the timetable and not computed here.',
    countries: ['RU'],
    parameters: {
      fajrAngle: 18,
      ishaAngle: 15,
      sunriseAltitude: -0.8333,
      asrShadow: 2,
      asr: 'on the apparent sun: the noon shadow from the refracted noon altitude',
      dhuhr: 'the zenith column (the sun’s transit), not the mosques’ fixed clock time',
      whiteNights: 'where the 18° twilight does not form: dawn = sunrise − 121 min, Isha = Maghrib + 90 min',
      rounding: 'the dawn down, every other time up',
      sun: 'Meeus’s apparent sun at each time’s own moment',
    },
    sources: [{ title: 'Духовное управление мусульман Республики Татарстан — Намаз вакытлары', url: 'https://dumrt.ru/help-info/prayertime/' }],
    spec: 'docs/methods.md#tatarstan',
  },
});

export const places = tatarstan.places;
