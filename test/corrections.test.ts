/**
 * Sweden's correction list: a minute either way, on dates it covers, at the
 * points the method is computed at — and it is what takes the method to the
 * tables' minute, not a change to the method.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { candidateInstants, methodInfo, placesOf, pointKey, timesFor, isCertified, UncertifiedMethodError, type CorrectionsFile } from '../src/index.js';

const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'corrections', 'sweden.json'), 'utf8')) as CorrectionsFile;

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
  assert.deepEqual(methodInfo('sweden').corrections, { from: list.from, to: list.to, entries: n });
});

test('a correction moves exactly its time by its minute', () => {
  const [point, entries] = Object.entries(list.points)[0];
  const [date, key, step] = entries[0].split(' ');
  const [lat, lon] = point.split(',').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  const place = { authority: 'sweden' as const, id: 'sweden:x', key: 'x', name: 'x', country: 'SE', lat, lon, tz: 'Europe/Stockholm' };
  const raw = candidateInstants(place, y, m - 1, d, 1, { corrections: false })!;
  const fixed = candidateInstants(place, y, m - 1, d)!;
  for (const k of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
    const delta = (fixed[k].getTime() - raw[k].getTime()) / 60_000;
    assert.equal(delta, k === key ? Number(step) : 0, `${k}`);
  }
  assert.equal(pointKey(lat, lon), point);
});

test('Sweden is served only over the dates it was certified on', () => {
  if (!isCertified('sweden')) return;
  const stockholm = placesOf('sweden').find(p => p.name === 'Stockholm')!;
  assert.equal(timesFor(stockholm, '2026-10-15').status, 'certified');
  assert.equal(timesFor(stockholm, '2031-01-01').status, 'method-only');
  assert.throws(() => timesFor(stockholm, '2031-01-01', { strict: true }), (e: unknown) => e instanceof UncertifiedMethodError && e.date === '2031-01-01');
});
