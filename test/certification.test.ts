/**
 * A method may be used only when it is on the printed minute for every time
 * of its authority's tables: timesFor refuses the rest, and a certified one
 * must still be 0 off against the tables here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORITIES,
  candidateTimes,
  certificationOf,
  isCertified,
  placesOf,
  timesFor,
  UncertifiedMethodError,
} from '../src/index';
import { checkAuthority } from '../src/verify';

for (const a of AUTHORITIES) {
  const place = placesOf(a)[0];

  test(`${a}: timesFor ${isCertified(a) ? 'serves the certified method' : 'refuses the uncertified method'}`, () => {
    if (isCertified(a)) {
      assert.deepEqual(timesFor(place, 2026, 9, 15), candidateTimes(place, 2026, 9, 15));
    } else {
      assert.throws(() => timesFor(place, 2026, 9, 15), (e: unknown) => e instanceof UncertifiedMethodError && e.authority === a);
    }
  });

  test(`${a}: candidateTimes runs, certified or not`, () => {
    const t = candidateTimes(place, 2026, 9, 15);
    assert.ok(t && Number.isFinite(t.fajr.getTime()) && t.fajr < t.isha);
  });

  test(`${a}: a certification means 0 off against every table checked`, t => {
    const c = certificationOf(a);
    if (!c?.certified) {
      t.skip('not certified');
      return;
    }
    assert.ok(isCertified(a), 'the record says certified but its checks do not');
    const runs = a === 'sweden' ? (['sweden', 'diyanet'] as const) : ([a] as const);
    for (const run of runs) {
      const r = checkAuthority(run);
      if (!r) continue; // tables not here; the record stands as written
      assert.equal(r.times - r.exact, 0, `${r.name}: ${r.times - r.exact} of ${r.times} off — run npm run certify`);
    }
  });
}
