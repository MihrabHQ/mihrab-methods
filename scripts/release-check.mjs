#!/usr/bin/env node
/**
 * Does npm need a new release? Compares the package this checkout packs with
 * the one on npm, and says so — with the version bump and the reasons.
 *
 *   node scripts/release-check.mjs            # after `npm run build`
 *   node scripts/release-check.mjs --json     # for the release workflow
 *
 * A release is needed when:
 *
 *   - **the package's content changed** — the code, a method, a place, a
 *     correction list, the schemas, the docs it ships — anything but the
 *     certification record's dates (the check records a new date every day
 *     it finds every time on its minute; that alone is not a release, the
 *     live feed carries it), the README and the version; or
 *   - **the certified span on npm runs out within SPAN_DAYS** (30) while
 *     main's reaches further: past its span the published package answers
 *     `method-only` for a date main certifies.
 *
 * The bump: minor when a method's revision moved (CHANGELOG: a revision
 * bump is at least a minor version) or the package exports something new;
 * patch otherwise. Never major: an incompatible change is a person's.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPAN_DAYS = Number(process.env.SPAN_DAYS ?? 30);
const today = process.env.TODAY ?? new Date().toISOString().slice(0, 10);
const asJson = process.argv.includes('--json');

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** Every file of a packed tarball, unpacked under dir/package. */
function unpack(tgz, dir) {
  fs.mkdirSync(dir, { recursive: true });
  run('tar', ['-xzf', tgz, '-C', dir]);
  const base = path.join(dir, 'package');
  const files = new Map();
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f);
      else files.set(path.relative(base, f).split(path.sep).join('/'), fs.readFileSync(f, 'utf8'));
    }
  };
  walk(base);
  return files;
}

/** The record's dates, which the daily check moves, taken out: what is left is what a release would change. */
const IGNORED = f => f === 'README.md' || f === 'package.json' || f === 'certification.json' || /Certification\.(js|cjs|d\.ts)$/.test(f);

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'release-check-'));
  // Each into its own folder: while the version is not yet bumped, both tarballs have the same name.
  const mineDir = path.join(tmp, 'mine-tgz'), theirsDir = path.join(tmp, 'theirs-tgz');
  fs.mkdirSync(mineDir); fs.mkdirSync(theirsDir);
  const local = path.join(mineDir, run('npm', ['pack', '--silent', '--ignore-scripts', '--pack-destination', mineDir], ROOT).split('\n').pop());
  let published;
  let version;
  try {
    version = run('npm', ['view', 'mihrab-methods', 'version'], tmp);
    published = path.join(theirsDir, run('npm', ['pack', '--silent', `mihrab-methods@${version}`, '--pack-destination', theirsDir], tmp).split('\n').pop());
  } catch (e) {
    return { release: true, bump: 'minor', published: null, reasons: ['nothing on npm yet'] };
  }
  const mine = unpack(local, path.join(tmp, 'mine'));
  const theirs = unpack(published, path.join(tmp, 'theirs'));
  const reasons = [];

  // The content.
  const changed = [];
  for (const f of new Set([...mine.keys(), ...theirs.keys()])) {
    if (IGNORED(f)) continue;
    if (mine.get(f) !== theirs.get(f)) changed.push(f);
  }
  if (changed.length) {
    const groups = {};
    for (const f of changed) {
      const g = f.startsWith('data/corrections/') ? 'correction lists' : f.startsWith('dist/') ? 'the library' : f.startsWith('schemas/') ? 'schemas' : f.startsWith('docs/') ? 'docs' : 'other';
      (groups[g] ??= []).push(f);
    }
    for (const [g, fs_] of Object.entries(groups)) reasons.push(`${g} changed (${fs_.length} file${fs_.length > 1 ? 's' : ''}: ${fs_.slice(0, 4).join(', ')}${fs_.length > 4 ? ', …' : ''})`);
  }

  // The certified span, and the revisions.
  const certMine = JSON.parse(mine.get('certification.json') ?? '{}');
  const certTheirs = JSON.parse(theirs.get('certification.json') ?? '{}');
  const until = c => (c?.checks?.length ? c.checks.map(k => k.to).sort()[0] : null);
  const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
  let minor = false;
  for (const a of Object.keys(certMine)) {
    const m = certMine[a], t = certTheirs[a];
    if (!t) { reasons.push(`${a}: a new method`); minor = true; continue; }
    if (m.revision !== t.revision) { reasons.push(`${a}: revision ${t.revision} → ${m.revision}`); minor = true; }
    const um = until(m), ut = until(t);
    if (m.certified && um && ut && um > ut && ut < addDays(today, SPAN_DAYS)) {
      reasons.push(`${a}: npm's certified span ends ${ut}${ut < today ? ' (past)' : ''}; main's reaches ${um}`);
    }
  }

  // New entry points or exports are a minor version.
  const pm = JSON.parse(mine.get('package.json')), pt = JSON.parse(theirs.get('package.json'));
  const newExports = Object.keys(pm.exports ?? {}).filter(k => !(k in (pt.exports ?? {})));
  if (newExports.length) { reasons.push(`new entry points: ${newExports.join(', ')}`); minor = true; }
  const removed = Object.keys(pt.exports ?? {}).filter(k => !(k in (pm.exports ?? {})));
  if (removed.length) {
    // Taking an entry point away breaks someone: never automatic.
    return { release: false, blocked: true, published: version, reasons: [`entry points removed (${removed.join(', ')}): a major version, a person's decision`] };
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  return { release: reasons.length > 0, bump: minor ? 'minor' : 'patch', published: version, reasons };
}

const verdict = main();
if (asJson) console.log(JSON.stringify(verdict));
else {
  console.log(verdict.release ? `A release is needed (${verdict.bump}; npm has ${verdict.published}):` : verdict.blocked ? 'Held for a person:' : `npm (${verdict.published}) is current.`);
  for (const r of verdict.reasons) console.log(`  - ${r}`);
}
