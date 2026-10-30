/**
 * Checks every method against its authority's tables and writes
 * certification.json: a method is certified only when every time of every
 * table it is checked against is on the printed minute (0 off). Sweden is
 * checked against Islamiska Förbundet's timetables and, when present,
 * Diyanet's own.
 *
 *   npm run certify                    # every method
 *   npm run certify -- morocco         # some: the others keep their entries
 *
 * With authorities named, only their entries are checked and rewritten; the
 * rest of the record stays as it is. That is how a scheduled check that
 * finds a method still on every printed minute moves its date forward
 * without checking every other table again. Each check's figures are
 * printed as `npm run verify` prints them.
 *
 * Needs the reference timetables (MIHRAB_TABLES); it refuses to run
 * without them rather than write a certification of nothing. Each entry
 * names the correction list it certifies (its dates and size): apps read
 * this file to tell their users when a newer list is out, or when an
 * authority's newest tables are not yet certified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AUTHORITIES, type Authority, type Certification, type CheckRecord } from '../src/core/types.js';
import { METHOD_REVISION } from '../src/methods/revisions.js';
import { placesOf } from '../src/index.js';
import { checkAuthority, report, TABLES, type CheckRun, type Result } from './verify.js';

const FILE = path.join(__dirname, '..', 'certification.json');

/** The correction list's dates and size (`data/corrections/<authority>.json`). */
function correctionsOf(a: Authority): Certification['corrections'] {
  const f = path.join(__dirname, '..', 'data', 'corrections', `${a}.json`);
  if (!fs.existsSync(f)) return undefined;
  const text = fs.readFileSync(f, 'utf8');
  const list = JSON.parse(text) as { from: string; to: string; points: Record<string, string[]> };
  // The hash is of the file as published, so an app can check what it downloads (`fetchLatestCorrections`).
  return { from: list.from, to: list.to, entries: Object.values(list.points).reduce((n, e) => n + e.length, 0), sha256: createHash('sha256').update(text).digest('hex') };
}

function record(r: Result): CheckRecord {
  return {
    tables: r.name,
    places: r.places,
    times: r.times,
    off: r.times - r.exact,
    offWithoutCorrections: r.times - r.exactAlone,
    from: r.from,
    to: r.to,
    ...(r.misplaced.length || r.sourceFaults || r.copiedRows
      ? { setAside: { misplaced: r.misplaced, sourceFaults: r.sourceFaults, copiedRows: r.copiedRows } }
      : {}),
  };
}

// The runs named on the command line, as authorities ('sweden-diyanet' is part of Sweden's entry).
const asked = process.argv.slice(2).filter(a => !a.startsWith('--')).map(a => (a === 'sweden-diyanet' ? 'sweden' : a));
for (const a of asked) {
  if (!(AUTHORITIES as readonly string[]).includes(a)) {
    console.error(`Unknown authority: ${a}. Nothing written.`);
    process.exit(2);
  }
}
const only = asked.length ? new Set(asked) : null;
const previous: Record<string, Certification> =
  only && fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, Certification>) : {};

const out: Record<string, Certification> = {};
const checkedAt = new Date().toISOString().slice(0, 10);
for (const a of AUTHORITIES as readonly Authority[]) {
  if (only && !only.has(a)) {
    if (!previous[a]) {
      console.error(`certification.json has no entry for ${a} to keep — run \`npm run certify\` for every method. Nothing written.`);
      process.exit(1);
    }
    out[a] = previous[a];
    continue;
  }
  const runs: CheckRun[] = a === 'sweden' ? ['sweden', 'sweden-diyanet'] : [a];
  const checks: CheckRecord[] = [];
  for (const run of runs) {
    const r = checkAuthority(run);
    if (!r || !r.times) {
      if (run === 'sweden-diyanet') continue; // optional: Diyanet's own Swedish timetables, when present
      console.error(`No tables for ${run} under ${TABLES} — set MIHRAB_TABLES. Nothing written.`);
      process.exit(1);
    }
    console.log(report(r).join('\n'));
    checks.push(record(r));
  }
  const certified = checks.length > 0 && checks.every(c => c.times > 0 && c.off === 0);
  // `places`: how many places the library offers for the authority — what an app can show, beside what was checked.
  out[a] = { certified, checkedAt, places: placesOf(a).length, checks, corrections: correctionsOf(a), revision: METHOD_REVISION[a] };
  const summary = checks.map(c => `${c.tables}: ${c.off} of ${c.times} off`).join('; ');
  console.log(`${certified ? 'CERTIFIED  ' : 'uncertified'} ${a} — ${summary}`);
}
fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`\nWritten ${path.relative(process.cwd(), FILE)}`);
