/**
 * Which methods may be used: only those on the authority's printed minute
 * for every time of its tables. `npm run certify` (src/certify.ts) runs the
 * check and writes the result to certification.json; this reads it.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Authority } from './places';

export type CheckRecord = {
  /** The tables checked: Islamiska Förbundet's or Diyanet's own for Sweden, the authority's for the rest. */
  tables: string;
  places: number;
  times: number;
  /** Times not on the printed minute. Certified only at 0. */
  off: number;
  from: string;
  to: string;
  /** What the check set aside as the source's fault, not the method's: listed so it can be judged. */
  setAside?: { misplaced: string[]; sourceFaults: number; copiedRows: number };
};

export type Certification = {
  certified: boolean;
  checkedAt: string;
  checks: CheckRecord[];
};

const FILE = path.join(__dirname, '..', 'certification.json');

let cache: Partial<Record<Authority, Certification>> | null = null;

function read(): Partial<Record<Authority, Certification>> {
  if (!cache) {
    try {
      cache = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Partial<Record<Authority, Certification>>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

export function certificationOf(authority: Authority): Certification | null {
  return read()[authority] ?? null;
}

/**
 * Certified: every check of the authority's tables has every time on the
 * printed minute (and checked something). The flag alone is not trusted.
 */
export function isCertified(authority: Authority): boolean {
  const c = certificationOf(authority);
  return !!c && c.certified && c.checks.length > 0 && c.checks.every(k => k.times > 0 && k.off === 0);
}

/** Tests: read the file again. */
export function _reloadCertificationForTests(): void {
  cache = null;
}
