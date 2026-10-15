import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { METHOD_REVISION } from '../src/methods/revisions';

const cert = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'certification.json'), 'utf8')) as Record<
  string,
  { revision?: number; corrections?: { from: string; to: string; entries: number } }
>;

test('certification.json names the method revision and the correction list it certifies', () => {
  for (const [a, rev] of Object.entries(METHOD_REVISION)) {
    assert.equal(cert[a]?.revision, rev, `${a}: certify again after raising its revision`);
    const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'corrections', `${a}.json`), 'utf8')) as {
      from: string;
      to: string;
      points: Record<string, string[]>;
    };
    const entries = Object.values(list.points).reduce((n, e) => n + e.length, 0);
    assert.deepEqual(cert[a]?.corrections, { from: list.from, to: list.to, entries }, `${a}: certify again after renewing its list`);
  }
});
