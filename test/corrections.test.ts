/**
 * Sweden's correction list: a minute either way, on dates it covers, at the
 * points the method is computed at — and it is what takes the method to the
 * tables' minute, not a change to the method.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { candidateTimes, placesOf, swedenCorrectionsCoverage, timesFor, isCertified, UncertifiedMethodError } from '../src/index';
import { CORRECTIONS_FILE, pointKey, type SwedenCorrections } from '../src/methods/swedenCorrections';

const list = JSON.parse(fs.readFileSync(CORRECTIONS_FILE, 'utf8')) as SwedenCorrections;

test('every correction is one minute, one prayer, one date inside the covered span', () => {
  const re = /^(\d{4}-\d{2}-\d{2}) (fajr|sunrise|dhuhr|asr|maghrib|isha) ([+-]1)$/;
  let n = 0;
  for (const [point, entries] of Object.entries(list.points)) {
    assert.match(point, /^-?\d+\.\d{3},-?\d+\.\d{3}$/);
    assert.equal(new Set(entries.map(e => e.split(' ').slice(0, 2).join(' '))).size, entries.length, `${point}: a time corrected twice`);
    for (const e of entries) {
      const m = re.exec(e);
      assert.ok(m, `${point}: ${e}`);
      assert.ok(m![1] >= list.from && m![1] <= list.to, `${point}: ${e} outside ${list.from}..${list.to}`);
      n++;
    }
  }
  // a few hundred over four years: the list mends the rounding, it does not stand in for the method
  assert.ok(n < 600, `${n} corrections`);
  assert.deepEqual(swedenCorrectionsCoverage(), { from: list.from, to: list.to });
});

test('a correction moves exactly its time by its minute', () => {
  const [point, entries] = Object.entries(list.points)[0];
  const [date, key, step] = entries[0].split(' ');
  const [lat, lon] = point.split(',').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  const place = { authority: 'sweden' as const, key: 'x', name: 'x', lat, lon, tz: 'Europe/Stockholm' };
  const raw = candidateTimes(place, y, m - 1, d, 1, { corrections: false })!;
  const fixed = candidateTimes(place, y, m - 1, d)!;
  for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
    const delta = (fixed[k].getTime() - raw[k].getTime()) / 60_000;
    assert.equal(delta, k === key ? Number(step) : 0, `${k}`);
  }
  assert.equal(pointKey(lat, lon), point);
});

test('Sweden is served only over the dates it was certified on', () => {
  if (!isCertified('sweden')) return;
  const stockholm = placesOf('sweden').find(p => p.name === 'Stockholm')!;
  assert.ok(timesFor(stockholm, 2026, 9, 15));
  assert.throws(() => timesFor(stockholm, 2031, 0, 1), (e: unknown) => e instanceof UncertifiedMethodError && e.date === '2031-01-01');
});
