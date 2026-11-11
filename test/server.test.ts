// The HTTP API's handler (src/server.ts), as both servers send it — no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { respond } from '../src/server.js';

const get = (path: string) => {
  const r = respond(new URL(path, 'http://api.test'));
  return { ...r, json: JSON.parse(r.body) };
};

test('the root lists the routes and each method', () => {
  const r = get('/');
  assert.equal(r.status, 200);
  assert.ok(r.json.routes.length >= 5);
  assert.deepEqual(r.json.methods.map((m: { authority: string }) => m.authority), r.json.authorities);
});

test('a day at a point: the nearest place, the printed minutes, the method’s revision', () => {
  const r = get('/v1/times?authority=morocco&lat=34.02&lng=-6.84&date=2026-11-20');
  assert.equal(r.status, 200);
  assert.equal(r.json.place.id, 'morocco:1');
  assert.match(r.json.times.fajr.printed, /^\d\d:\d\d$/);
  assert.equal(typeof r.json.revision, 'number');
  assert.equal(r.headers['access-control-allow-origin'], '*');
  assert.match(r.headers['cache-control'], /max-age/);
});

test('a range of days by place id', () => {
  const r = get('/v1/times?place=algeria:27&from=2026-10-01&to=2026-10-03');
  assert.equal(r.status, 200);
  assert.equal(r.json.days.length, 3);
});

test('errors are JSON with the right status, and never cached', () => {
  assert.equal(get('/v1/times?authority=nowhere&lat=1&lng=1').status, 400);
  assert.equal(get('/v1/times?authority=algeria&lat=x&lng=3').status, 400);
  assert.equal(get('/v1/times?place=algeria:999999').status, 404);
  const r = get('/v1/nope');
  assert.equal(r.status, 404);
  assert.match(r.json.error, /routes/);
  assert.equal(r.headers['cache-control'], 'no-store');
});

test('strict refuses a date outside the certified span', () => {
  assert.equal(get('/v1/times?authority=morocco&lat=34.02&lng=-6.84&date=2031-01-01&strict=1').status, 422);
  assert.equal(get('/v1/times?authority=morocco&lat=34.02&lng=-6.84&date=2031-01-01').json.status, 'method-only');
});

test('the Worker keeps the authorities: their files are marked as having side effects', async () => {
  // api/worker.ts bundles src/, not dist/. A file the package's
  // `sideEffects` does not list is taken as pure, so the bundler drops a
  // bare `import './authorities/morocco.js'` — and the API answered every
  // request with "the morocco method is not loaded" (a 500).
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.join(__dirname, '..');
  const listed: string[] = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).sideEffects;
  const covered = (file: string) =>
    listed.some(p => new RegExp('^' + p.replace(/[.]/g, '\\.').replace(/\*/g, '[^/]+') + '$').test(file));
  const entries = ['index', 'sweden', 'diyanet', 'morocco', 'algeria', 'indonesia', 'turkiyetakvimi', 'kazakhstan', 'egypt', 'brunei', 'qatar', 'kuwait'].map(n => `./src/${n}.ts`);
  const authorities = fs
    .readdirSync(path.join(root, 'src', 'authorities'))
    .filter(f => f.endsWith('.ts'))
    .map(f => `./src/authorities/${f}`);
  for (const f of [...entries, ...authorities]) assert.ok(covered(f), `${f} is not in sideEffects`);
});
