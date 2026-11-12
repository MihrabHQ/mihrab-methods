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
  // Winnipeg: Diyanet's table still falls back on 1 November 2026, where
  // tzdata 2026e keeps Manitoba on UTC−5 — the table's clock, on every runtime.
  const winnipeg = placeById('diyanet:9078')!;
  assert.equal(timesFor(winnipeg, '2026-12-15').clock.offsetMinutes, -360);
  assert.equal(timesFor(winnipeg, '2026-07-15').clock.offsetMinutes, -300);
  assert.equal(timesFor(winnipeg, '2027-01-15').clock.offsetMinutes, -360);
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
    // Kazakhstan's method needs no corrections: its list is empty, and still names its span.
    assert.ok((a === 'kazakhstan' ? i.corrections.entries === 0 : i.corrections.entries > 0) && i.corrections.from <= i.corrections.to);
  }
  assert.ok(methodInfo('diyanet').countries.length > 150);
});

test('each time says what it stands on, and the answer says which Asr it carries', () => {
  // a day and a time the correction list moves, read from the list itself
  const cov = methodInfo('morocco').corrections;
  const place = placesOf('morocco')[0];
  let corrected = 0, table = 0;
  for (const day of timesForRange(place, cov.from, cov.to)) {
    assert.equal(day.asrShadow, 1);
    for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
      const b = day.times![k].basis;
      assert.ok(b === 'table' || b === 'corrected', `${day.date} ${k}: ${b}`);
      if (b === 'corrected') {
        corrected++;
        // without the list the same time is a minute away
        const bare = candidateTimes(place, day.date, { corrections: false }).times![k];
        assert.equal(Math.abs(bare.instant.getTime() - day.times![k].instant.getTime()), 60_000);
        assert.equal(bare.basis, 'method');
      } else table++;
    }
  }
  assert.ok(corrected > 0 && table > corrected);
  // outside the certified span: the method alone
  assert.equal(timesFor(place, '2041-03-01').times!.fajr.basis, 'method');
  // the Asr the timetable does not print is unchecked, on an otherwise certified day
  const other = timesFor(place, cov.from, { asr: 'hanafi' });
  assert.equal(other.asrShadow, 2);
  assert.equal(other.times!.asr.basis, 'unchecked');
  assert.notEqual(other.times!.dhuhr.basis, 'unchecked');
  assert.deepEqual(timesFor(place, cov.from, { asrShadow: 2 }), other); // the older spelling
});

test('where the timetable prints the Hanafi Asr, printed and hanafi are one, and shafii is the other', () => {
  for (const a of ['wifaq', 'banuri'] as const) {
    const place = placesOf(a)[0];
    const date = methodInfo(a).corrections.from;
    const printed = timesFor(place, date);
    assert.equal(printed.asrShadow, 2, a);
    assert.deepEqual(timesFor(place, date, { asr: 'hanafi' }), printed, a);
    assert.deepEqual(timesFor(place, date, { asrShadow: 2 }), printed, a);
    const shafii = timesFor(place, date, { asr: 'shafii' });
    assert.equal(shafii.asrShadow, 1, a);
    assert.equal(shafii.times!.asr.basis, 'unchecked', a);
    assert.ok(shafii.times!.asr.instant < printed.times!.asr.instant, a);
  }
  // Tatarstan's method has the one Asr its timetable prints: that is what comes back, and the answer says so.
  const kazan = placesOf('tatarstan')[0];
  const day = timesFor(kazan, methodInfo('tatarstan').corrections.from, { asr: 'shafii' });
  assert.equal(day.asrShadow, 2);
  assert.notEqual(day.times!.asr.basis, 'unchecked');
});
