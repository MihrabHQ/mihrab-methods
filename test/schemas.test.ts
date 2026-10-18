/** The published files fit the schemas they are published with. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { AUTHORITIES } from '../src/index.js';

const ROOT = path.join(__dirname, '..');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const ajv = new Ajv2020({ allErrors: true });

test('certification.json fits schemas/certification.schema.json', () => {
  const validate = ajv.compile(read('schemas/certification.schema.json'));
  assert.ok(validate(read('certification.json')), JSON.stringify(validate.errors, null, 1));
});

test('every correction list fits schemas/corrections.schema.json', () => {
  const validate = ajv.compile(read('schemas/corrections.schema.json'));
  for (const a of AUTHORITIES) assert.ok(validate(read(`data/corrections/${a}.json`)), `${a}: ${JSON.stringify(validate.errors, null, 1)}`);
  assert.ok(!validate({ from: '2026-01-01', to: '2026-02-01', points: { '1.0,2.0': ['2026-01-01 fajr +2'] } }));
});
