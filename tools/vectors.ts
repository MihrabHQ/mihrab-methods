/**
 * Writes test/vectors.json: a small set of places and dates with the times
 * the library gives, for a port in another language to check itself against.
 * Deliberately small — a few places per authority, a few dates each — so it
 * is a sample, not a timetable. `npm run vectors`; then `npm test` holds the
 * library to it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITIES, certifiedSpan, methodInfo, placesOf, timesFor, type Place } from '../src/index.js';

const FILE = path.join(__dirname, '..', 'test', 'vectors.json');
/** A few places, spread through each list; Türkiye's districts and the world for Diyanet. */
const PICK: Record<string, string[]> = {
  sweden: ['sweden:stockholm', 'sweden:kiruna', 'sweden:malmo'],
  diyanet: ['diyanet:9146', 'diyanet:9541', 'diyanet:8574', 'diyanet:11186'],
  morocco: ['morocco:1', 'morocco:60', 'morocco:150'],
  algeria: ['algeria:1', 'algeria:27', 'algeria:60'],
  indonesia: ['indonesia:1', 'indonesia:200', 'indonesia:500'],
};

function dates(from: string, to: string): string[] {
  const a = Date.parse(from), b = Date.parse(to);
  // four dates across the span, the ends included
  return [0, 1 / 3, 2 / 3, 1].map(f => new Date(a + Math.round(((b - a) * f) / 86_400_000) * 86_400_000).toISOString().slice(0, 10));
}

const out = {
  note: 'A sample for ports to check against, not a timetable: the times mihrab-methods gives at these places on these dates, with the clock they are printed in. Regenerate with `npm run vectors` after a method revision.',
  revisions: Object.fromEntries(AUTHORITIES.map(a => [a, methodInfo(a).revision])),
  cases: [] as object[],
};
for (const a of AUTHORITIES) {
  const span = certifiedSpan(a);
  if (!span) continue;
  const byId = new Map(placesOf(a).map(p => [p.id, p]));
  for (const id of PICK[a]) {
    const place = byId.get(id) ?? placesOf(a)[0];
    for (const date of dates(span.from, span.to)) {
      const t = timesFor(place, date);
      const p: Partial<Place> = { id: place.id, name: place.name, lat: place.lat, lon: place.lon, tz: place.tz };
      for (const k of ['dipDeg', 'dipMaghribDeg', 'highland', 'twilightDip', 'afternoon', 'ishaDeg', 'clock'] as const) if (place[k] !== undefined) (p as Record<string, unknown>)[k] = place[k];
      if (place.prayerPoints) (p as Record<string, unknown>).prayerPoints = { [date.slice(0, 4)]: place.prayerPoints[date.slice(0, 4)] ?? Object.values(place.prayerPoints)[0] };
      out.cases.push({
        place: p,
        date,
        clock: t.clock,
        printed: t.times && Object.fromEntries(Object.entries(t.times).map(([k, v]) => [k, v.printed])),
        instants: t.times && Object.fromEntries(Object.entries(t.times).map(([k, v]) => [k, v.instant.toISOString()])),
      });
    }
  }
}
fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n');
console.log(`${out.cases.length} cases → ${path.relative(process.cwd(), FILE)}`);
