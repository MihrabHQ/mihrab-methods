/** The library gives the vectors it published (test/vectors.json, `npm run vectors`). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { methodInfo, placeById, timesFor, type Authority } from '../src/index.js';

type Case = { place: { id: string }; date: string; clock: object; printed: Record<string, string> | null; instants: Record<string, string> | null };
const v = JSON.parse(fs.readFileSync(path.join(__dirname, 'vectors.json'), 'utf8')) as { revisions: Record<string, number>; cases: Case[] };

test('the vectors are for the revisions this build computes', () => {
  for (const [a, r] of Object.entries(v.revisions)) assert.equal(methodInfo(a as Authority).revision, r, `${a}: run npm run vectors after a revision`);
});

test('every vector is what the library gives today', () => {
  assert.ok(v.cases.length >= 50 && v.cases.length <= 120, `${v.cases.length} cases: a sample, not a timetable`);
  for (const c of v.cases) {
    const place = placeById(c.place.id);
    assert.ok(place, c.place.id);
    const t = timesFor(place, c.date);
    assert.deepEqual(t.clock, c.clock, `${c.place.id} ${c.date}: clock`);
    assert.deepEqual(t.times && Object.fromEntries(Object.entries(t.times).map(([k, x]) => [k, x.printed])), c.printed, `${c.place.id} ${c.date}`);
    assert.deepEqual(t.times && Object.fromEntries(Object.entries(t.times).map(([k, x]) => [k, x.instant.toISOString()])), c.instants, `${c.place.id} ${c.date}: instants`);
  }
});
