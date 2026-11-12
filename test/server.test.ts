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

test('a point with no authority named: the point’s own, its nearest place, and how far', () => {
  const r = get('/v1/times?lat=30.04&lng=31.24&date=2026-11-20'); // Cairo
  assert.equal(r.status, 200);
  assert.equal(r.json.authority, 'egypt');
  assert.equal(r.json.authorityFrom, 'location');
  assert.ok(r.json.distanceKm < 30);
  assert.equal(get('/v1/times?authority=egypt&lat=30.04&lng=31.24&date=2026-11-20').json.authorityFrom, 'request');
  assert.equal(get('/v1/times?place=algeria:27&date=2026-11-20').json.distanceKm, undefined);
  // Berlin: Diyanet lists it, but is not Germany's authority — the caller has to name it.
  const none = get('/v1/times?lat=52.52&lng=13.405');
  assert.equal(none.status, 404);
  assert.match(none.json.error, /authority=/);
  assert.equal(get('/v1/times?authority=diyanet&lat=52.52&lng=13.405&date=2026-11-20').status, 200);
  // maxKm: far from every listed place is said, not served from the nearest regardless.
  assert.equal(get('/v1/times?lat=23.0&lng=25.5&maxKm=50').status, 404); // the Gilf Kebir
  const at = get('/v1/authority?lat=36.75&lng=3.06').json;
  assert.equal(at.authority, 'algeria');
  assert.equal(at.place.id, get('/v1/nearest?lat=36.75&lng=3.06').json.place.id);
});

test('every route is described, and the description on file is the one served', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { ROUTE_SPECS } = await import('../src/openapi.js');
  const served = get('/openapi.json').json;
  const onFile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'openapi.json'), 'utf8'));
  assert.deepEqual(onFile, served, 'docs/openapi.json is stale: npm run openapi');
  assert.deepEqual(Object.keys(served.paths), ROUTE_SPECS.map(r => r.path));
  for (const r of ROUTE_SPECS) {
    assert.equal(get(r.example).status, 200, r.example);
    // each example asks only what the route declares
    const declared: string[] = r.params.map(p => p.name);
    for (const k of new URL(r.example, 'http://api.test').searchParams.keys()) assert.ok(declared.includes(k), `${r.path}: ${k}`);
  }
  for (const [p, item] of Object.entries<{ get: { responses: Record<string, { content: { 'application/json': { schema: { $ref: string } } } }> } }>(served.paths)) {
    for (const res of Object.values(item.get.responses)) assert.ok(res.content['application/json'].schema.$ref.split('/').pop()! in served.components.schemas, p);
  }
});

test('asr by name, and what each time stands on', () => {
  const r = get('/v1/times?place=algeria:27&date=2026-10-15&asr=hanafi').json;
  assert.equal(r.asrShadow, 2);
  assert.equal(r.times.asr.basis, 'unchecked');
  assert.ok(['table', 'corrected'].includes(r.times.fajr.basis));
  assert.deepEqual(get('/v1/times?place=algeria:27&date=2026-10-15&asr=2').json, r);
  assert.equal(get('/v1/times?place=algeria:27&date=2026-10-15').json.asrShadow, 1);
  assert.equal(get('/v1/times?place=algeria:27&asr=maliki').status, 400);
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
  const entries = ['index', 'sweden', 'diyanet', 'morocco', 'algeria', 'indonesia', 'turkiyetakvimi', 'kazakhstan', 'egypt', 'brunei', 'qatar', 'kuwait', 'jordan', 'tatarstan', 'cdum', 'albania', 'bulgaria', 'banuri', 'uae', 'tehran', 'wifaq'].map(n => `./src/${n}.ts`);
  const authorities = fs
    .readdirSync(path.join(root, 'src', 'authorities'))
    .filter(f => f.endsWith('.ts'))
    .map(f => `./src/authorities/${f}`);
  for (const f of [...entries, ...authorities]) assert.ok(covered(f), `${f} is not in sideEffects`);
});
