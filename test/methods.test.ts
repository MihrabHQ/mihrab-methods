/**
 * Each method against its authority's tables, held at where it stands today
 * (October 2026). A change that makes one worse fails here; a change that
 * makes one better should raise its bar.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkAuthority } from '../src/verify';
import { preciseApparentSun } from '../src/index';

const bars: [Parameters<typeof checkAuthority>[0], number][] = [
  ['indonesia', 0.9996], // 99.965 %
  ['algeria', 0.9936], // 99.366 %
  ['morocco', 0.9855], // 98.571 %
  ['sweden', 0.9995], // 99.961 % — Islamiska Förbundet's timetables; Diyanet's own below
  ['diyanet', 0.9998], // 99.981 %
];

for (const [authority, bar] of bars) {
  test(`${authority}: the printed minute for at least ${(bar * 100).toFixed(2)} %, never a minute further`, t => {
    const r = checkAuthority(authority);
    if (!r) {
      t.skip('no reference timetables (MIHRAB_TABLES)');
      return;
    }
    assert.ok(r.times > 1000, `only ${r.times} times`);
    assert.ok(r.exact / r.times >= bar, `${((100 * r.exact) / r.times).toFixed(3)} % exact`);
    assert.equal(r.worst, 1);
  });
}

test('the precise sun is JPL’s to 0.15 s and an arc-second', () => {
  // D (days from 2000-01-01 12:00 UT), declination (°), equation of time (min), from DE421.
  const jpl: [number, number, number][] = [
    [9575.0, -0.0454883434908054, -7.4364288221537045],
    [9667.5, 23.43752131340835, -1.7079926404766623],
    [9803.0, -15.150946137213822, 16.447035014610623],
    [9902.75, -14.086343915337608, -14.19625937251004],
  ];
  for (const [d, dec, eot] of jpl) {
    const s = preciseApparentSun(d);
    assert.ok(Math.abs((s.dec * 180) / Math.PI - dec) * 3600 < 1);
    assert.ok(Math.abs(s.eot - eot) * 60 < 0.15);
  }
});
