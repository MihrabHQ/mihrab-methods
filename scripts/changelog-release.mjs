#!/usr/bin/env node
/**
 * Turns CHANGELOG.md's "Unreleased" section into the release's, and opens a
 * new, empty one. With nothing written under "Unreleased" (a release made
 * only because the lists or the certified span moved on), it says that.
 *
 *   node scripts/changelog-release.mjs 1.1.0 2026-11-04 "reason; reason"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md');
const [version, date, reasons = ''] = process.argv.slice(2);
if (!/^\d+\.\d+\.\d+$/.test(version ?? '') || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
  console.error('usage: changelog-release.mjs <version> <YYYY-MM-DD> [reasons]');
  process.exit(2);
}
const PLACEHOLDER = 'No method changed; no revision raised.';
const text = fs.readFileSync(FILE, 'utf8');
const start = text.indexOf('## Unreleased');
if (start < 0) throw new Error('no "## Unreleased" in CHANGELOG.md');
const after = text.indexOf('\n## ', start + 1);
const body = text.slice(start + '## Unreleased'.length, after < 0 ? undefined : after).trim();
const empty = !body || body === PLACEHOLDER;
const released = empty
  ? `${PLACEHOLDER} The correction lists and the certification record as of ${date}${reasons ? ` (${reasons})` : ''}.`
  : body;
const out =
  text.slice(0, start) +
  `## Unreleased\n\n${PLACEHOLDER}\n\n## ${version} — ${date}\n\n${released}\n` +
  (after < 0 ? '' : text.slice(after));
fs.writeFileSync(FILE, out);
console.log(`CHANGELOG.md: ${version} — ${date}${empty ? ' (data only)' : ''}`);
