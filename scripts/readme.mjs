#!/usr/bin/env node
/**
 * Writes the figures into the README and docs from certification.json:
 * the certification table, the badge (docs/certification.svg), and every
 * inline `<!--fig:KEY-->…<!--/fig-->`. `--check` exits 1 when a file is not
 * what the record says, so CI catches a hand edit or a stale table.
 *
 *   node scripts/readme.mjs
 *   node scripts/readme.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AUTHORITY_NAMES, AUTHORITY_ORDER, badgeSvg, fillBlock, fillFigures, figures, int, longDate, namedFigures, pct, span } from './figures.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const cert = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification.json'), 'utf8'));
const { by, total } = figures(cert);
const named = namedFigures(cert, 'en');

function table(base = '') {
  const rows = [
    '| Authority | Tables matched | Places | Times checked | Off the printed minute | By the method alone | Correction entries | Checked over |',
    '|---|---|---:|---:|---:|---:|---:|---|',
  ];
  for (const id of AUTHORITY_ORDER) {
    const a = by[id];
    a.checks.forEach((c, i) => {
      rows.push(
        [
          i === 0 ? `**${AUTHORITY_NAMES[id].short}**${a.certified ? '' : ' (not certified)'}` : '',
          c.tables.replace(/^[^—]*— /, ''),
          int(c.places),
          int(c.times),
          `**${int(c.off)}**`,
          `${pct(c.times - c.offAlone, c.times)} %`,
          i === 0 ? int(a.corrections) : '',
          span(c.from, c.to),
        ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'),
      );
    });
  }
  return [
    ...rows,
    '',
    `${int(total.certified)} of ${int(total.authorities)} methods certified; ${int(total.off)} of ${int(total.times)} times off the printed minute. Last checked ${longDate(total.checkedAt)}. Generated from [\`certification.json\`](${base}certification.json) by \`scripts/readme.mjs\`.`,
  ].join('\n');
}

const outputs = new Map();
const docs = ['README.md', ...fs.readdirSync(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md')).map(f => `docs/${f}`), 'CONTRIBUTING.md'];
for (const rel of docs) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  text = fillFigures(text, named, rel);
  if (text.includes('<!-- certification-table:start -->')) text = fillBlock(text, 'certification-table', table(rel.startsWith('docs/') ? '../' : ''), rel);
  outputs.set(rel, text);
}
outputs.set('docs/certification.svg', badgeSvg(cert));

let stale = 0;
for (const [rel, text] of outputs) {
  const f = path.join(ROOT, rel);
  const have = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (have === text) continue;
  if (CHECK) {
    console.error(`${rel} is not what certification.json says — run node scripts/readme.mjs`);
    stale++;
  } else {
    fs.writeFileSync(f, text);
    console.log(`wrote ${rel}`);
  }
}
if (stale) process.exit(1);
