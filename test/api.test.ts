/**
 * The library's calls: dates with January = 1, the printed minute on the
 * table's clock, a status instead of a throw, ranges, lookup by id and by
 * distance.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORITIES,
  candidateTimes,
  certifiedSpan,
  isCertified,
  methodInfo,
  nearestPlace,
  placeById,
  placesOf,
  timesFor,
  timesForRange,
  UncertifiedMethodError,
  parseCivilDate,
} from '../src/index.js';
import { tableClock } from '../tools/verify.js';

test('a civil date is an ISO string or { year, month, day } with January = 1; nothing else', () => {
  assert.deepEqual(parseCivilDate('2026-10-15'), { year: 2026, month0: 9, day: 15, iso: '2026-10-15' });
  assert.deepEqual(parseCivilDate({ year: 2026, month: 1, day: 1 }), { year: 2026, month0: 0, day: 1, iso: '2026-01-01' });
  assert.throws(() => parseCivilDate('2026-13-01'), RangeError);
  assert.throws(() => parseCivilDate('2026-02-30'), RangeError);
  assert.throws(() => parseCivilDate({ year: 2026, month: 0, day: 1 }), RangeError);
  assert.throws(() => parseCivilDate('15/10/2026'), TypeError);
  // the old call, with months from 0, is refused with a message rather than taken as a date
  assert.throws(() => (timesFor as unknown as (p: unknown, y: number, m: number, d: number) => void)(placesOf('algeria')[0], 2026, 9, 15), /no longer the call/);
});

test('every place has a stable id and a country, and placeById finds it', () => {
  for (const a of AUTHORITIES) {
    const seen = new Set<string>();
    for (const p of placesOf(a)) {
      assert.equal(p.id, `${a}:${p.key}`);
      assert.ok(!seen.has(p.id), `${p.id} twice`);
      seen.add(p.id);
      assert.match(p.country, /^[A-Z]{2}$/, `${p.id}: country ${p.country}`);
      assert.equal(placeById(p.id), p);
    }
  }
  assert.equal(placeById('algeria:no-such'), null);
  assert.equal(placeById('nonsense'), null);
  assert.equal(placesOf('diyanet').find(p => p.key === '9146')?.country, 'TR'); // Adana
  assert.equal(placesOf('diyanet').find(p => p.name === 'BIRMINGHAM' && p.tz === 'America/Chicago')?.country, 'US');
});

test('nearestPlace finds the table for a location', () => {
  const algiers = nearestPlace('algeria', 36.7538, 3.0588)!;
  assert.equal(algiers.place.name, 'Algiers');
  assert.ok(algiers.distanceKm < 5);
  const stockholm = nearestPlace('sweden', 59.3293, 18.0686)!;
  assert.equal(stockholm.place.name, 'Stockholm');
  assert.equal(nearestPlace('sweden', 59.3293, 18.0686, { maxKm: 1 }), null);
  assert.equal(nearestPlace('sweden', NaN, 18), null);
  const istanbul = nearestPlace('diyanet', 41.0082, 28.9784)!;
  assert.equal(istanbul.place.country, 'TR');
  assert.ok(istanbul.place.prayerPoints, 'a Turkish district computes each prayer at its own point');
});

test('timesFor: the printed minute is the instant on the table’s clock, the clock the check uses', () => {
  // the days the clocks change, Morocco's own clock, Alberta's table that keeps summer time
  const cases: [string, string][] = [
    ['sweden:stockholm', '2026-03-29'],
    ['sweden:stockholm', '2026-10-25'],
    ['sweden:kiruna', '2026-06-21'],
    ['morocco:1', '2026-09-16'],
    ['morocco:1', '2026-09-17'],
    ['morocco:1', '2026-10-20'],
    ['algeria:1', '2026-12-01'],
    ['indonesia:1', '2026-10-20'],
    ['diyanet:9146', '2026-03-29'],
  ];
  for (const [id, date] of cases) {
    const place = placeById(id)!;
    const t = timesFor(place, date);
    assert.ok(t.times, `${id} ${date}`);
    for (const [k, v] of Object.entries(t.times)) {
      const m = tableClock(place, date, v.instant);
      assert.equal(v.printed, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, `${id} ${date} ${k}`);
    }
  }
  const calgary = placesOf('diyanet').find(p => p.clock && p.name === 'CALGARY');
  if (calgary) {
    const t = timesFor(calgary, '2026-12-15');
    assert.equal(t.clock.zone, null);
    assert.match(t.clock.label, /^UTC[+-]\d\d:\d\d$/);
  }
  const rabat = timesFor(placeById('morocco:1')!, '2026-10-20');
  assert.deepEqual(rabat.clock, { zone: null, offsetMinutes: 0, label: 'UTC+00:00' });
  const algiers = timesFor(placeById('algeria:1')!, '2026-10-20');
  assert.deepEqual(algiers.clock, { zone: 'Africa/Algiers', offsetMinutes: 60, label: 'Africa/Algiers' });
});

test('timesFor: a status, not a throw, outside the certified span; strict throws; uncertified always throws', () => {
  for (const a of AUTHORITIES) {
    if (!isCertified(a)) continue;
    const place = placesOf(a)[0];
    const span = certifiedSpan(a)!;
    const inside = timesFor(place, span.to);
    assert.equal(inside.status, 'certified');
    assert.equal(inside.certifiedFrom, span.from);
    assert.equal(inside.certifiedUntil, span.to);
    assert.equal(inside.revision, methodInfo(a).revision);
    const beyond = timesFor(place, '2031-01-01');
    assert.equal(beyond.status, 'method-only');
    assert.ok(beyond.times, 'the method alone still answers');
    assert.throws(() => timesFor(place, '2031-01-01', { strict: true }), (e: unknown) => e instanceof UncertifiedMethodError && e.date === '2031-01-01');
    // candidateTimes says the same status, and runs without the list
    assert.equal(candidateTimes(place, '2031-01-01').status, 'method-only');
    assert.deepEqual(candidateTimes(place, span.to).times, inside.times);
  }
  assert.throws(() => timesFor({ ...placesOf('algeria')[0], authority: 'nonesuch' as 'algeria' }, '2026-10-15'), /not loaded/);
});

test('the Hanafi Asr is later, and the correction list leaves it alone', () => {
  const place = placeById('algeria:1')!;
  const std = timesFor(place, '2026-10-15').times!;
  const hanafi = timesFor(place, '2026-10-15', { asrShadow: 2 }).times!;
  assert.ok(hanafi.asr.instant > std.asr.instant);
  assert.equal(hanafi.fajr.printed, std.fajr.printed);
});

test('timesForRange is timesFor for every day, both ends inclusive', () => {
  const place = placeById('indonesia:1')!;
  const days = timesForRange(place, '2026-10-30', { year: 2026, month: 11, day: 2 });
  assert.deepEqual(days.map(d => d.date), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(days[0], timesFor(place, '2026-10-30'));
  assert.throws(() => timesForRange(place, '2026-11-02', '2026-10-30'), RangeError);
  assert.equal(timesForRange(place, '2026-10-30', '2026-10-30').length, 1);
});

test('methodInfo describes each method', () => {
  for (const a of AUTHORITIES) {
    const i = methodInfo(a);
    assert.equal(i.authority, a);
    assert.ok(i.name && i.method && i.spec);
    assert.ok(i.countries.length > 0 && i.countries.every(c => /^[A-Z]{2}$/.test(c)));
    assert.ok(i.places > 0);
    assert.ok(i.sources.every(s => /^https:\/\//.test(s.url)));
    assert.ok(typeof i.parameters.fajrAngle === 'number');
    assert.equal(i.certified, isCertified(a));
    assert.ok(i.corrections.entries > 0 && i.corrections.from <= i.corrections.to);
  }
  assert.ok(methodInfo('diyanet').countries.length > 150);
});
