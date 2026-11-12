/**
 * mihrab-methods/standard: the calculated day for a point no authority
 * here publishes for — and that it never passes for an authority's.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { STANDARD_CONVENTION_IDS, STANDARD_CONVENTIONS, standardConventionFor, standardTimes } from '../src/standard.js';
import { tehranTimes } from '../src/methods/tehran.js';
import { uaeTimes } from '../src/methods/uae.js';
import { handle, respond } from '../src/server.js';
import '../src/index.js';

const PARIS = { lat: 48.8566, lon: 2.3522, tz: 'Europe/Paris' };
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

test('a day is six times in order, printed in the zone given, and says it is calculated', () => {
  const day = standardTimes({ ...PARIS, date: '2026-10-15' });
  assert.equal(day.status, 'calculated');
  assert.equal(day.convention, 'mwl');
  assert.equal(day.date, '2026-10-15');
  assert.deepEqual(day.clock, { zone: 'Europe/Paris', offsetMinutes: 120, label: 'Europe/Paris' });
  assert.equal(day.asrShadow, 1);
  const t = day.times!;
  const m = (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(k => minutes(t[k].printed));
  assert.deepEqual(m, [...m].sort((a, b) => a - b));
  // the transit at 2.35° E in mid-October: about 13:36 on Paris's summer clock
  assert.ok(Math.abs(m[2] - (13 * 60 + 36)) <= 2, t.dhuhr.printed);
  // the day is as long before the transit as after it, to a couple of minutes
  assert.ok(Math.abs(m[2] - m[1] - (m[4] - m[2])) <= 3);
  // on whole minutes
  for (const k of Object.keys(t) as (keyof typeof t)[]) assert.equal(t[k].instant.getTime() % 60_000, 0);
  // in winter the same zone is an hour less
  assert.equal(standardTimes({ ...PARIS, date: '2026-12-15' }).clock.offsetMinutes, 60);
});

test('the same sun as the methods: where an authority’s rule is a plain angle, the standard time at that angle is its time', () => {
  // Karachi's 18° Fajr and Isha are the Emirates' own, without a zone's margins
  const uae = uaeTimes(24.45, 54.38, 2026, 5, 10, 0, 1, 0, 0)!;
  const std = standardTimes({ lat: 24.45, lon: 54.38, date: '2026-06-10', tz: 'Asia/Dubai', convention: 'karachi' }).times!;
  assert.equal(std.fajr.instant.getTime(), uae.fajr.getTime());
  assert.equal(std.isha.instant.getTime(), uae.isha.getTime());
  // sunrise at 0.8333° and Dhuhr at the transit are the Tehran Institute's too
  const tehran = tehranTimes(35.69, 51.39, 2026, 2, 21)!;
  const there = standardTimes({ lat: 35.69, lon: 51.39, date: '2026-03-21', tz: 'Asia/Tehran' }).times!;
  assert.equal(there.sunrise.instant.getTime(), tehran.sunrise.getTime());
  assert.equal(there.dhuhr.instant.getTime(), tehran.dhuhr.getTime());
  assert.equal(there.asr.instant.getTime(), tehran.asr.getTime());
});

test('the conventions differ as their angles do, and the Hanafi Asr is the later one', () => {
  assert.deepEqual([...STANDARD_CONVENTION_IDS].sort(), ['egypt', 'isna', 'karachi', 'mwl', 'ummalqura']);
  const at = (convention: (typeof STANDARD_CONVENTION_IDS)[number]) => standardTimes({ ...PARIS, date: '2026-10-15', convention }).times!;
  // a shallower Fajr angle is a later Fajr; a shallower Isha an earlier one
  assert.ok(at('isna').fajr.instant > at('mwl').fajr.instant);
  assert.ok(at('egypt').fajr.instant < at('mwl').fajr.instant);
  assert.ok(at('isna').isha.instant < at('mwl').isha.instant);
  // Umm al-Qura's Isha: ninety minutes after Maghrib
  const uq = at('ummalqura');
  assert.equal(uq.isha.instant.getTime() - uq.maghrib.instant.getTime(), STANDARD_CONVENTIONS.ummalqura.ishaMinutes! * 60_000);
  // everything but the twilights is the same sun
  for (const k of ['sunrise', 'dhuhr', 'asr', 'maghrib'] as const) assert.equal(at('isna')[k].printed, at('mwl')[k].printed);
  const hanafi = standardTimes({ ...PARIS, date: '2026-10-15', asr: 'hanafi' });
  assert.equal(hanafi.asrShadow, 2);
  assert.ok(hanafi.times!.asr.instant > at('mwl').asr.instant);
});

test('a point east of the date’s own noon, and a night without twilight', () => {
  // Sydney: the local day's Fajr is on the previous UTC date, and is still that civil day's
  const sydney = standardTimes({ lat: -33.87, lon: 151.21, date: '2026-10-15', tz: 'Australia/Sydney' });
  assert.equal(sydney.clock.offsetMinutes, 660);
  assert.ok(minutes(sydney.times!.fajr.printed) < minutes(sydney.times!.dhuhr.printed));
  assert.ok(sydney.times!.fajr.instant.toISOString().startsWith('2026-10-14'));
  // Stockholm at midsummer: no 18° twilight, so no times — not invented ones
  assert.equal(standardTimes({ lat: 59.33, lon: 18.07, date: '2026-06-21', tz: 'Europe/Stockholm' }).times, null);
});

test('the zone is the caller’s, and what is asked wrongly is refused', () => {
  assert.throws(() => standardTimes({ lat: 48.86, lon: 2.35, date: '2026-10-15' } as never), /tz/);
  assert.throws(() => standardTimes({ ...PARIS, tz: 'Mars/Olympus', date: '2026-10-15' }), /tz/);
  assert.throws(() => standardTimes({ ...PARIS, date: '2026-02-30' }), RangeError);
  assert.throws(() => standardTimes({ ...PARIS, date: '15/10/2026' }), TypeError);
  assert.throws(() => standardTimes({ ...PARIS, lat: 91, date: '2026-10-15' }), RangeError);
  assert.throws(() => standardTimes({ ...PARIS, date: '2026-10-15', convention: 'mine' as never }), /convention/);
  assert.equal(standardConventionFor('SA'), 'ummalqura');
  assert.equal(standardConventionFor('PK'), 'karachi');
  assert.equal(standardConventionFor('FR'), 'mwl');
  assert.equal(standardConventionFor(null), 'mwl');
});

test('the API: fallback=standard answers where no authority does, only when asked, and never for an authority’s own point', () => {
  const url = (q: string) => new URL(`https://x${q}`);
  // Paris: no authority here publishes for it
  assert.equal(respond(url('/v1/times?lat=48.8566&lng=2.3522&date=2026-10-15')).status, 404);
  assert.equal(respond(url('/v1/times?lat=48.8566&lng=2.3522&date=2026-10-15&fallback=standard')).status, 400); // no tz
  const r = handle(url('/v1/times?lat=48.8566&lng=2.3522&date=2026-10-15&fallback=standard&tz=Europe/Paris')) as Record<string, unknown>;
  assert.equal(r.status, 'calculated');
  assert.equal(r.fallback, 'standard');
  assert.equal(r.authorityFrom, 'none');
  assert.equal(r.place, null);
  assert.equal(r.convention, 'mwl');
  assert.equal((r.times as Record<string, { printed: string }>).dhuhr.printed, standardTimes({ ...PARIS, date: '2026-10-15' }).times!.dhuhr.printed);
  // a convention by name, the Hanafi Asr, a range
  const k = handle(url('/v1/times?lat=48.8566&lng=2.3522&date=2026-10-15&fallback=standard&tz=Europe/Paris&convention=isna&asr=hanafi')) as Record<string, unknown>;
  assert.equal(k.convention, 'isna');
  assert.equal(k.asrShadow, 2);
  const range = handle(url('/v1/times?lat=48.8566&lng=2.3522&from=2026-10-01&to=2026-10-03&fallback=standard&tz=Europe/Paris')) as { days: { date: string; status: string }[] };
  assert.deepEqual(range.days.map(d => d.date), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.ok(range.days.every(d => d.status === 'calculated'));
  assert.equal(respond(url('/v1/times?lat=48.8566&lng=2.3522&fallback=standard&tz=Europe/Paris&convention=mine')).status, 400);
  assert.equal(respond(url('/v1/times?lat=48.8566&lng=2.3522&fallback=other&tz=Europe/Paris')).status, 400);
  // Algiers has its authority: the fallback changes nothing there
  const algiers = handle(url('/v1/times?lat=36.75&lng=3.06&date=2026-10-15&fallback=standard&tz=Africa/Algiers')) as Record<string, unknown>;
  assert.equal(algiers.authority, 'algeria');
  assert.notEqual(algiers.status, 'calculated');
  // …and an authority named for a point it has no place near is still a 404: the caller asked for that authority
  assert.equal(respond(url('/v1/times?authority=algeria&lat=48.8566&lng=2.3522&maxKm=50&fallback=standard&tz=Europe/Paris')).status, 404);
});
