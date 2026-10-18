/**
 * Keeping current: a newer list is taken only for this revision, only as the
 * certification names it, only with its hash.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fetchLatestCorrections, methodInfo, timesFor, placeById, type CorrectionsFile } from '../src/index.js';

const ROOT = path.join(__dirname, '..');
const cert = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification.json'), 'utf8'));
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

/** A feed: certification.json and the lists, served from memory. */
function feed(files: Record<string, string>): typeof fetch {
  return (async (url: string | URL | Request) => {
    const u = String(url);
    const body = files[u.replace('https://feed.test/', '')];
    return new Response(body ?? 'not found', { status: body === undefined ? 404 : 200 });
  }) as typeof fetch;
}

const base = 'https://feed.test';

test('current: the certification names the list this build has', async () => {
  const r = await fetchLatestCorrections({ authority: 'algeria', baseUrl: base, fetch: feed({ 'certification.json': JSON.stringify(cert) }) });
  assert.equal(r.status, 'current');
});

test('updated: a newer list for this revision, matching the certification and its hash, is taken and put in force', async () => {
  const have = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/corrections/algeria.json'), 'utf8')) as CorrectionsFile;
  const place = placeById('algeria:1')!;
  const before = timesFor(place, '2027-07-01');
  assert.equal(before.status, 'method-only');
  // a list a month longer, moving one more time: Algiers's Fajr on 1 July 2027
  const newer: CorrectionsFile = { ...have, to: '2027-07-05', points: { ...have.points } };
  const key = `${place.lat.toFixed(3)},${place.lon.toFixed(3)}`;
  newer.points[key] = [...(newer.points[key] ?? []), '2027-07-01 fajr +1'];
  const text = JSON.stringify(newer);
  const entries = Object.values(newer.points).reduce((n, e) => n + e.length, 0);
  const c = { ...cert, algeria: { ...cert.algeria, corrections: { from: newer.from, to: newer.to, entries, sha256: sha(text) } } };
  const r = await fetchLatestCorrections({
    authority: 'algeria',
    baseUrl: base,
    fetch: feed({ 'certification.json': JSON.stringify(c), 'data/corrections/algeria.json': text }),
  });
  assert.equal(r.status, 'updated');
  if (r.status !== 'updated') return;
  assert.equal(r.integrity, 'verified');
  assert.equal(r.applied, true);
  assert.deepEqual(methodInfo('algeria').corrections, { from: newer.from, to: newer.to, entries });
  const after = timesFor(place, '2027-07-01');
  assert.equal(after.times!.fajr.instant.getTime() - before.times!.fajr.instant.getTime(), 60_000, 'the new entry moves the minute');
  // the list in force is not touched by a list that fails its checks
  const bad = await fetchLatestCorrections({
    authority: 'algeria',
    baseUrl: base,
    fetch: feed({ 'certification.json': JSON.stringify(c), 'data/corrections/algeria.json': text.replace('+1"]', '-1"]') }),
  });
  assert.equal(bad.status, 'current'); // same identity as what is now in force: nothing to do
});

test('rejected: a list that is not the one the certification names, or whose hash differs', async () => {
  const have = fs.readFileSync(path.join(ROOT, 'data/corrections/morocco.json'), 'utf8');
  const named = { ...cert.morocco.corrections, to: '2026-12-31', entries: cert.morocco.corrections.entries + 1 };
  const c = { ...cert, morocco: { ...cert.morocco, corrections: named } };
  const r = await fetchLatestCorrections({ authority: 'morocco', baseUrl: base, fetch: feed({ 'certification.json': JSON.stringify(c), 'data/corrections/morocco.json': have }) });
  assert.equal(r.status, 'rejected');
  const list = JSON.parse(have) as CorrectionsFile;
  const longer = JSON.stringify({ ...list, to: '2026-12-31', points: { ...list.points, '0.000,0.000': ['2026-12-01 fajr +1'] } });
  const c2 = { ...cert, morocco: { ...cert.morocco, corrections: { ...named, sha256: 'deadbeef' } } };
  const r2 = await fetchLatestCorrections({ authority: 'morocco', baseUrl: base, fetch: feed({ 'certification.json': JSON.stringify(c2), 'data/corrections/morocco.json': longer }) });
  assert.equal(r2.status, 'rejected');
  assert.match((r2 as { reason: string }).reason, /SHA-256/);
  assert.equal(methodInfo('morocco').corrections.to, list.to, 'nothing taken');
});

test('method-moved and uncertified leave the list in force', async () => {
  const moved = { ...cert, indonesia: { ...cert.indonesia, revision: cert.indonesia.revision + 1 } };
  const r = await fetchLatestCorrections({ authority: 'indonesia', baseUrl: base, fetch: feed({ 'certification.json': JSON.stringify(moved) }) });
  assert.equal(r.status, 'method-moved');
  const un = { ...cert, indonesia: { ...cert.indonesia, certified: false } };
  const r2 = await fetchLatestCorrections({ authority: 'indonesia', baseUrl: base, fetch: feed({ 'certification.json': JSON.stringify(un) }) });
  assert.equal(r2.status, 'uncertified');
  const r3 = await fetchLatestCorrections({ authority: 'indonesia', baseUrl: base, fetch: feed({}) });
  assert.equal(r3.status, 'rejected');
});

test('the built-in SHA-256 is the standard one (the digest a runtime without WebCrypto uses)', async () => {
  const { sha256, utf8 } = await import('../src/core/fetchLatest.js');
  const hexOf = (b: Uint8Array) => Buffer.from(b).toString('hex');
  for (const text of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'ٱللَّهِ — 😀', fs.readFileSync(path.join(ROOT, 'data/corrections/diyanet.json'), 'utf8')]) {
    assert.equal(hexOf(sha256(utf8(text))), sha(text), JSON.stringify(text.slice(0, 20)));
  }
});

test('places are frozen: no caller can move another’s', () => {
  const p = placeById('algeria:1')!;
  assert.throws(() => {
    (p as { lat: number }).lat = 0;
  }, TypeError);
});
