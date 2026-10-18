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
import { AUTHORITY_NAMES, AUTHORITY_ORDER, fillBlock, fillFigures, figures, int, longDate, namedFigures, pct, span } from './figures.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const cert = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification.json'), 'utf8'));
const { by, total } = figures(cert);
const named = namedFigures(cert, 'en');

function table() {
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
    `${int(total.certified)} of ${int(total.authorities)} methods certified; ${int(total.off)} of ${int(total.times)} times off the printed minute. Last checked ${longDate(total.checkedAt)}. Generated from [\`certification.json\`](certification.json) by \`scripts/readme.mjs\`.`,
  ].join('\n');
}

/** A flat badge, drawn here so the README needs no badge service. */
function badge() {
  const left = 'certified';
  const right = `${total.certified}/${total.authorities} methods · ${int(total.off)} of ${named['total.timesCompact']} off`;
  const w = s => Math.round(s.length * 6.4 + 12);
  const lw = w(left), rw = w(right);
  const colour = total.certified === total.authorities && total.off === 0 ? '#2e7d4f' : '#b0601a';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + rw}" height="20" role="img" aria-label="${left}: ${right}">
<title>${left}: ${right}</title>
<rect width="${lw}" height="20" rx="3" fill="#555"/><rect x="${lw}" width="${rw}" height="20" rx="3" fill="${colour}"/><rect x="${lw}" width="4" height="20" fill="${colour}"/>
<g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
<text x="${lw / 2}" y="14">${left}</text><text x="${lw + rw / 2}" y="14">${right}</text>
</g>
</svg>
`;
}

const outputs = new Map();
const docs = ['README.md', ...fs.readdirSync(path.join(ROOT, 'docs')).filter(f => f.endsWith('.md')).map(f => `docs/${f}`), 'CONTRIBUTING.md'];
for (const rel of docs) {
  const f = path.join(ROOT, rel);
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  text = fillFigures(text, named, rel);
  if (text.includes('<!-- certification-table:start -->')) text = fillBlock(text, 'certification-table', table(), rel);
  outputs.set(rel, text);
}
outputs.set('docs/certification.svg', badge());

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
