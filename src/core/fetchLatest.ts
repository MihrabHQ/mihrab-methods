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
  /** SHA-256 of a UTF-8 string as lowercase hex; default: WebCrypto, else node:crypto, else the hash is not checked. */
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

async function defaultSha256(text: string): Promise<string | null> {
  const bytes = new TextEncoder().encode(text);
  const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (subtle) {
    const buf = await subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  try {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(bytes).digest('hex');
  } catch {
    return null;
  }
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

  let integrity: 'verified' | 'unchecked' = 'unchecked';
  if (named.sha256) {
    const hash = opts.sha256 ? await opts.sha256(text) : await defaultSha256(text);
    if (hash !== null) {
      if (hash.toLowerCase() !== named.sha256.toLowerCase()) return { status: 'rejected', reason: 'the list’s SHA-256 is not the one the certification names', have };
      integrity = 'verified';
    }
  }
  const applied = opts.apply === false ? false : applyCorrections(opts.authority, list, revision);
  return { status: 'updated', list, summary, integrity, applied };
}
