/**
 * Checks every method against its authority's tables and writes
 * certification.json: a method is certified only when every time of every
 * table it is checked against is on the printed minute (0 off). Sweden is
 * checked against Islamiska Förbundet's timetables and, when present,
 * Diyanet's own.
 *
 *   npm run certify
 *
 * Needs the reference timetables (MIHRAB_TABLES); it refuses to run
 * without them rather than write a certification of nothing. Each entry
 * names the correction list it certifies (its dates and size): apps read
 * this file to tell their users when a newer list is out, or when an
 * authority's newest tables are not yet certified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITIES, type Authority } from './places';
import type { Certification, CheckRecord } from './certification';
import { METHOD_REVISION } from './methods/revisions';
import { checkAuthority, TABLES, type CheckRun, type Result } from './verify';

const FILE = path.join(__dirname, '..', 'certification.json');

/** The correction list's dates and size (`data/corrections/<authority>.json`). */
function correctionsOf(a: Authority): Certification['corrections'] {
  const f = path.join(__dirname, '..', 'data', 'corrections', `${a}.json`);
  if (!fs.existsSync(f)) return undefined;
  const list = JSON.parse(fs.readFileSync(f, 'utf8')) as { from: string; to: string; points: Record<string, string[]> };
  return { from: list.from, to: list.to, entries: Object.values(list.points).reduce((n, e) => n + e.length, 0) };
}

function record(r: Result): CheckRecord {
  return {
    tables: r.name,
    places: r.places,
    times: r.times,
    off: r.times - r.exact,
    from: r.from,
    to: r.to,
    ...(r.misplaced.length || r.sourceFaults || r.copiedRows
      ? { setAside: { misplaced: r.misplaced, sourceFaults: r.sourceFaults, copiedRows: r.copiedRows } }
      : {}),
  };
}

const out: Record<string, Certification> = {};
const checkedAt = new Date().toISOString().slice(0, 10);
for (const a of AUTHORITIES as readonly Authority[]) {
  const runs: CheckRun[] = a === 'sweden' ? ['sweden', 'sweden-diyanet'] : [a];
  const checks: CheckRecord[] = [];
  for (const run of runs) {
    const r = checkAuthority(run);
    if (!r || !r.times) {
      if (run === 'sweden-diyanet') continue; // optional: Diyanet's own Swedish timetables, when present
      console.error(`No tables for ${run} under ${TABLES} — set MIHRAB_TABLES. Nothing written.`);
      process.exit(1);
    }
    checks.push(record(r));
  }
  const certified = checks.length > 0 && checks.every(c => c.times > 0 && c.off === 0);
  out[a] = { certified, checkedAt, checks, corrections: correctionsOf(a), revision: METHOD_REVISION[a] };
  const summary = checks.map(c => `${c.tables}: ${c.off} of ${c.times} off`).join('; ');
  console.log(`${certified ? 'CERTIFIED  ' : 'uncertified'} ${a} — ${summary}`);
}
fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
console.log(`\nWritten ${path.relative(process.cwd(), FILE)}`);
