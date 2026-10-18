/**
 * Keeping an app current without a release: the repository publishes
 * `certification.json` and the correction lists it certifies, and an app
 * that computes a method's revision can take any newer list certified for
 * that revision. This is the check done right — the revision, the list's
 * identity, and its SHA-256 as the certification names it.
 */
import { authorityData } from './registry.js';
import { isCorrectionsFile } from './correctionList.js';
import type { Authority, Certification, CorrectionsFile } from './types.js';

/** Where the feed lives. A tagged release (`.../v1.2.0/...`) can replace `main` for a pinned address. */
export const DEFAULT_FEED_URL = 'https://raw.githubusercontent.com/MihrabHQ/mihrab-methods/main';

export type FetchOptions = {
  authority: Authority;
  /** The revision this build computes; default: the loaded method's. */
  revision?: number;
  /** The feed's base URL (default `DEFAULT_FEED_URL`): `<base>/certification.json`, `<base>/data/corrections/<authority>.json`. */
  baseUrl?: string;
  /** The fetch to use (default: the global one). */
  fetch?: typeof fetch;
  /** SHA-256 of a UTF-8 string as lowercase hex; default: WebCrypto where there is one, else a built-in digest. */
  sha256?: (text: string) => Promise<string>;
  /** Put a newer list in force in this process (default true). */
  apply?: boolean;
};

export type ListSummary = { from: string; to: string; entries: number };

export type FetchResult =
  /** The certification names the list this build already has (or an older one). */
  | { status: 'current'; have: ListSummary; certified: boolean }
  /** A newer list for this revision: its contents, and whether the hash matched (or could not be checked). */
  | { status: 'updated'; list: CorrectionsFile; summary: ListSummary; integrity: 'verified' | 'unchecked'; applied: boolean }
  /** The method itself has moved on: its lists no longer fit this build, which should be updated. */
  | { status: 'method-moved'; remoteRevision: number; have: ListSummary }
  /** The authority has published tables the method is not yet certified on: keep the list in force. */
  | { status: 'uncertified'; have: ListSummary }
  /** Something did not add up (a list not matching what the certification names, a bad hash): nothing taken. */
  | { status: 'rejected'; reason: string; have: ListSummary };

export function summarize(list: CorrectionsFile): ListSummary {
  return { from: list.from, to: list.to, entries: Object.values(list.points).reduce((n, e) => n + e.length, 0) };
}

const same = (a: ListSummary, b: ListSummary) => a.from === b.from && a.to === b.to && a.entries === b.entries;

/**
 * SHA-256 as lowercase hex. WebCrypto where the runtime has it (browsers,
 * Node 18+, Deno, Bun); elsewhere — Hermes in React Native has none — the
 * plain-JavaScript digest below. No `node:crypto` import: a bundler for a
 * phone or a browser fails on the import itself, used or not.
 */
async function defaultSha256(text: string): Promise<string> {
  const bytes = utf8(text);
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    try {
      const buf = await subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
      return hex(new Uint8Array(buf));
    } catch {
      /* a subtle that refuses (an insecure context): the digest below */
    }
  }
  return hex(sha256(bytes));
}

const hex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

/** UTF-8 bytes of a string, without TextEncoder (not every runtime has it). */
export function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d < 0xe000) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 (FIPS 180-4) of bytes. */
export function sha256(data: Uint8Array): Uint8Array {
  const bitLen = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  view.setUint32(padded.length - 4, bitLen >>> 0);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
  }
  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) ov.setUint32(i * 4, h[i]);
  return out;
}

/** Put a list in force for the process — one verified by `fetchLatestCorrections`, or restored from the app's own storage. */
export function applyCorrections(authority: Authority, list: CorrectionsFile, revision: number): boolean {
  const data = authorityData(authority);
  if (revision !== data.revision || !isCorrectionsFile(list)) return false;
  const now = data.corrections.coverage();
  if (list.to < now.to) return false;
  data.corrections.replace(list);
  return true;
}

export async function fetchLatestCorrections(opts: FetchOptions): Promise<FetchResult> {
  const data = authorityData(opts.authority);
  const have: ListSummary = { ...data.corrections.coverage(), entries: data.corrections.entries() };
  const revision = opts.revision ?? data.revision;
  const base = (opts.baseUrl ?? DEFAULT_FEED_URL).replace(/\/+$/, '');
  const doFetch = opts.fetch ?? globalThis.fetch;
  if (!doFetch) return { status: 'rejected', reason: 'no fetch available', have };

  const certRes = await doFetch(`${base}/certification.json`);
  if (!certRes.ok) return { status: 'rejected', reason: `certification.json: HTTP ${certRes.status}`, have };
  const cert = (await certRes.json()) as Partial<Record<Authority, Certification>>;
  const entry = cert?.[opts.authority];
  if (!entry || typeof entry !== 'object' || typeof entry.certified !== 'boolean') {
    return { status: 'rejected', reason: `certification.json has no entry for ${opts.authority}`, have };
  }
  if (typeof entry.revision === 'number' && entry.revision > revision) {
    return { status: 'method-moved', remoteRevision: entry.revision, have };
  }
  if (!entry.certified) return { status: 'uncertified', have };
  if (entry.revision !== revision) return { status: 'rejected', reason: `certified for revision ${entry.revision}, this build computes ${revision}`, have };
  const named = entry.corrections;
  if (!named || typeof named.from !== 'string' || typeof named.to !== 'string' || typeof named.entries !== 'number') {
    return { status: 'rejected', reason: 'the certification names no correction list', have };
  }
  if (same(have, named) || named.to < have.to) return { status: 'current', have, certified: true };

  const listRes = await doFetch(`${base}/data/corrections/${opts.authority}.json`);
  if (!listRes.ok) return { status: 'rejected', reason: `${opts.authority}.json: HTTP ${listRes.status}`, have };
  const text = await listRes.text();
  let list: unknown;
  try {
    list = JSON.parse(text);
  } catch {
    return { status: 'rejected', reason: 'the list is not JSON', have };
  }
  if (!isCorrectionsFile(list)) return { status: 'rejected', reason: 'the list does not have the shape of one', have };
  const summary = summarize(list);
  if (!same(summary, named)) return { status: 'rejected', reason: 'the list is not the one the certification names', have };

  // A certification without a hash (one written before 1.0.0) is taken on its identity alone.
  let integrity: 'verified' | 'unchecked' = 'unchecked';
  if (named.sha256) {
    const hash = opts.sha256 ? await opts.sha256(text) : await defaultSha256(text);
    if (hash.toLowerCase() !== named.sha256.toLowerCase()) return { status: 'rejected', reason: 'the list’s SHA-256 is not the one the certification names', have };
    integrity = 'verified';
  }
  const applied = opts.apply === false ? false : applyCorrections(opts.authority, list, revision);
  return { status: 'updated', list, summary, integrity, applied };
}
