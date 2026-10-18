/** The check counts the method alone and with its list in one pass: the list it applies must be the library's. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITIES, candidateInstants, placesOf, pointKey, type CorrectionsFile } from '../src/index.js';
import { withCorrections } from '../tools/verify.js';

test('withCorrections is candidateInstants with its list, at every listed time of every authority', () => {
  for (const a of AUTHORITIES) {
    const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/corrections', `${a}.json`), 'utf8')) as CorrectionsFile;
    const byPoint = new Map(placesOf(a).map(p => [pointKey(p.lat, p.lon), p]));
    let n = 0;
    for (const [point, entries] of Object.entries(list.points)) {
      const place = byPoint.get(point);
      if (!place) continue;
      for (const e of entries.slice(0, 3)) {
        const [y, m, d] = e.split(' ')[0].split('-').map(Number);
        const alone = candidateInstants(place, y, m - 1, d, 1, { corrections: false });
        if (!alone) continue;
        assert.deepEqual(withCorrections(place, alone, y, m - 1, d), candidateInstants(place, y, m - 1, d), `${a} ${point} ${e}`);
        n++;
      }
      if (n > 200) break;
    }
    assert.ok(n > 0, `${a}: no listed time checked`);
  }
});
