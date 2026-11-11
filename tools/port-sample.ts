/**
 * A wide sample for checking a port, in the shape of test/vectors.json: up
 * to 150 places of each authority, 40 dates each through four years, with
 * the times the library gives. Written where the argument says and never
 * committed — test/vectors.json is the sample the repository keeps.
 *
 *   npm run port-sample -- /tmp/port-sample.json
 *   python3 ports/python/test_vectors.py /tmp/port-sample.json
 *
 * The places and dates are the same on every run. A port that reads its
 * clock from another edition of the time-zone database than this runtime's
 * can differ on a zone whose rules changed between the two.
 */
import fs from 'node:fs';
import { AUTHORITIES, methodInfo, placesOf, timesFor } from '../src/index.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: npm run port-sample -- <file>');
  process.exit(1);
}

let seed = 12345;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const cases: object[] = [];
for (const a of AUTHORITIES) {
  const all = placesOf(a);
  for (let i = 0; i < Math.min(all.length, 150); i++) {
    const place = all[Math.floor(random() * all.length) % all.length];
    for (let j = 0; j < 40; j++) {
      const date = new Date(Date.UTC(2024, 0, 1) + Math.floor(random() * 1461) * 86_400_000).toISOString().slice(0, 10);
      const t = timesFor(place, date);
      const p: Record<string, unknown> = { id: place.id, lat: place.lat, lon: place.lon, tz: place.tz };
      for (const k of ['dipDeg', 'dipMaghribDeg', 'highland', 'twilightDip', 'afternoon', 'ishaDeg', 'clock', 'prayerPoints', 'temkin'] as const) if (place[k] !== undefined) p[k] = place[k];
      cases.push({
        place: p,
        date,
        clock: t.clock,
        printed: t.times && Object.fromEntries(Object.entries(t.times).map(([k, v]) => [k, v.printed])),
        instants: t.times && Object.fromEntries(Object.entries(t.times).map(([k, v]) => [k, v.instant.toISOString()])),
      });
    }
  }
}
fs.writeFileSync(file, JSON.stringify({ revisions: Object.fromEntries(AUTHORITIES.map(a => [a, methodInfo(a).revision])), cases }));
console.log(`${cases.length} cases → ${file}`);
