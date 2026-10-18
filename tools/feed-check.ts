/**
 * The live feed, as an installed app reads it, and the published package.
 *
 *   npm run feed-check
 *
 * Reads certification.json and every correction list from the feed
 * (FEED_URL, default the raw files on main) and checks that each:
 * fits its schema, is the list the certification names (dates, entries,
 * SHA-256), and is taken by `fetchLatestCorrections` the way an app built
 * from this checkout would take it. Then compares the version on npm with
 * this checkout's. Exit 1 when the feed is wrong: an app would refuse a
 * list, or fall back to the method alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import { AUTHORITIES, fetchLatestCorrections } from '../src/index.js';
import { DEFAULT_FEED_URL } from '../src/core/fetchLatest.js';

const ROOT = path.join(__dirname, '..');
const BASE = (process.env.FEED_URL ?? DEFAULT_FEED_URL).replace(/\/+$/, '');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const ajv = new Ajv2020({ allErrors: true });
const certSchema = ajv.compile(read('schemas/certification.schema.json'));
const listSchema = ajv.compile(read('schemas/corrections.schema.json'));

async function get(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt >= 3) throw new Error(`${url}: ${(e as Error).message}`);
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
  }
}

async function main(): Promise<number> {
  const rows: string[] = [];
  const problems: string[] = [];
  const cert = JSON.parse(await get(`${BASE}/certification.json`));
  if (!certSchema(cert)) problems.push(`certification.json does not fit its schema: ${ajv.errorsText(certSchema.errors)}`);

  for (const a of AUTHORITIES) {
    const entry = cert[a];
    const issues: string[] = [];
    let line = '';
    if (!entry) issues.push('no entry in certification.json');
    else {
      if (!entry.certified) issues.push('not certified: apps fall back to the method alone');
      const named = entry.corrections;
      const text = await get(`${BASE}/data/corrections/${a}.json`);
      const list = JSON.parse(text);
      if (!listSchema(list)) issues.push(`the list does not fit its schema: ${ajv.errorsText(listSchema.errors)}`);
      const entries = Object.values(list.points as Record<string, string[]>).reduce((n, e) => n + e.length, 0);
      if (named) {
        if (named.from !== list.from || named.to !== list.to || named.entries !== entries) {
          issues.push(`the list (${list.from} → ${list.to}, ${entries}) is not the one certified (${named.from} → ${named.to}, ${named.entries})`);
        }
        const hash = createHash('sha256').update(text, 'utf8').digest('hex');
        if (named.sha256 && named.sha256.toLowerCase() !== hash) issues.push('SHA-256 differs from the certification');
      } else issues.push('the certification names no correction list');
      // What an app built from this checkout does with the feed.
      const taken = await fetchLatestCorrections({ authority: a, baseUrl: BASE, apply: false });
      if (taken.status !== 'current' && taken.status !== 'updated') {
        issues.push(`an app would get "${taken.status}"${'reason' in taken ? `: ${taken.reason}` : ''}`);
      }
      line = `revision ${entry.revision} · certified through ${entry.corrections?.to ?? '—'} · ${entries} corrections · app: ${taken.status}`;
    }
    rows.push(`| ${issues.length ? '❌' : '✅'} | ${a} | ${line} | ${issues.join('; ')} |`);
    problems.push(...issues.map(i => `${a}: ${i}`));
  }

  // The package: what `npm install mihrab-methods` gives, against this checkout.
  const local = read('package.json').version as string;
  let npmLine: string;
  try {
    const latest = JSON.parse(await get('https://registry.npmjs.org/mihrab-methods'))['dist-tags'].latest as string;
    npmLine = latest === local ? `npm latest is ${latest}, as on main` : `npm latest is ${latest}; main says ${local} (not yet published)`;
  } catch (e) {
    npmLine = `could not read npm: ${(e as Error).message}`;
    problems.push(npmLine);
  }

  const text = [
    '## The live feed',
    '',
    `${BASE}`,
    '',
    '| | Authority | | |',
    '|---|---|---|---|',
    ...rows,
    '',
    npmLine,
    '',
  ].join('\n');
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
  if (problems.length) {
    console.error(problems.map(p => `✗ ${p}`).join('\n'));
    return 1;
  }
  return 0;
}

main().then(
  code => process.exit(code),
  e => {
    console.error((e as Error).message);
    process.exit(1);
  },
);
