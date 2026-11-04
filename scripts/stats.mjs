#!/usr/bin/env node
/**
 * How much the library is used: npm downloads, and requests to the public
 * API — counts per day, nothing else. Written to docs/stats.json (the
 * history, kept), docs/stats.svg (the chart) and the README's usage block.
 *
 *   node scripts/stats.mjs                      # fetch, merge, write
 *   node scripts/stats.mjs --offline            # rewrite the chart and README from docs/stats.json
 *
 * npm: the registry's public download counts (api.npmjs.org; every
 * install counts, CI and mirrors included). The API: Cloudflare's own
 * request counts for the worker (its GraphQL analytics; needs
 * CLOUDFLARE_API_TOKEN with "Account Analytics: Read" and
 * CLOUDFLARE_ACCOUNT_ID). Neither says who: no addresses, no queries, no
 * places — the API itself logs nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'docs', 'stats.json');
const SVG = path.join(ROOT, 'docs', 'stats.svg');
const README = path.join(ROOT, 'README.md');
const PACKAGE = 'mihrab-methods';
const WORKER = 'mihrab-methods';
const OFFLINE = process.argv.includes('--offline');

const day = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => day(new Date(Date.parse(`${s}T00:00:00Z`) + n * 864e5));
const today = process.env.TODAY ?? day(new Date());
const yesterday = addDays(today, -1); // a day is counted once it is over

async function get(url, init) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return await res.json();
      if (res.status < 500 && res.status !== 429) throw Object.assign(new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`), { final: true });
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (e.final || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 5000 * attempt));
    }
  }
}

/** npm's daily downloads since the first publish (the range API answers at most 18 months at a time). */
async function npmDaily(since) {
  const out = {};
  let from = since;
  while (from <= yesterday) {
    const to = [addDays(from, 500), yesterday].sort()[0];
    const r = await get(`https://api.npmjs.org/downloads/range/${from}:${to}/${PACKAGE}`);
    for (const d of r.downloads ?? []) out[d.day] = d.downloads;
    from = addDays(to, 1);
  }
  return out;
}

/** The worker's requests and errors per day, from Cloudflare's analytics (the last 30 days; older days are kept from before). */
async function apiDaily() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) return null;
  const query = `query($account: String!, $from: Date!, $to: Date!) {
    viewer { accounts(filter: { accountTag: $account }) {
      workersInvocationsAdaptive(limit: 1000, filter: { scriptName: "${WORKER}", date_geq: $from, date_leq: $to }) {
        sum { requests errors }
        dimensions { date }
      }
    } }
  }`;
  const r = await get('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { account, from: addDays(yesterday, -29), to: yesterday } }),
  });
  if (r.errors?.length) throw new Error(`Cloudflare: ${r.errors.map((e) => e.message).join('; ')}`);
  const out = {};
  for (const row of r.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptive ?? []) {
    const d = row.dimensions.date;
    out[d] = { requests: (out[d]?.requests ?? 0) + row.sum.requests, errors: (out[d]?.errors ?? 0) + row.sum.errors };
  }
  return out;
}

const sum = (daily, from, to = yesterday, pick = (v) => v) =>
  Object.entries(daily).reduce((n, [d, v]) => (d >= from && d <= to ? n + pick(v) : n), 0);
const int = (n) => n.toLocaleString('en-US');

/** Weekly totals (weeks ending on `yesterday`), the last `weeks` of them. */
function weekly(daily, weeks, pick = (v) => v) {
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = addDays(yesterday, -7 * w);
    out.push({ end, n: sum(daily, addDays(end, -6), end, pick) });
  }
  return out;
}

/** Two small bar charts side by side: npm downloads and API requests a week, the last 26 weeks. */
function chart(stats) {
  const W = 760, H = 190, pad = 34, gap = 40, panel = (W - gap) / 2;
  // From the first week with a count (the first release), at most the last 26.
  const weeksSince = (daily) => {
    const first = Object.keys(daily).sort()[0];
    return first ? Math.min(26, Math.max(1, Math.ceil((Date.parse(yesterday) - Date.parse(first) + 864e5) / (7 * 864e5)))) : 0;
  };
  const panels = [
    { title: 'npm downloads a week', color: '#2f7d68', data: weekly(stats.npm.daily, weeksSince(stats.npm.daily)) },
    { title: 'API requests a week', color: '#3f6fb5', data: stats.api ? weekly(stats.api.daily, weeksSince(stats.api.daily), (v) => v.requests) : [] },
  ];
  const parts = [];
  panels.forEach((p, i) => {
    const x0 = i * (panel + gap);
    parts.push(`<text x="${x0}" y="16" class="t">${p.title}</text>`);
    if (!p.data.length || p.data.every((d) => d.n === 0)) {
      parts.push(`<text x="${x0}" y="${H / 2 + 10}" class="m">${i === 1 && !stats.api ? 'not deployed yet' : 'none yet'}</text>`);
      return;
    }
    const max = Math.max(...p.data.map((d) => d.n), 1);
    const bw = (panel - 8) / Math.max(p.data.length, 8);
    const right = x0 + bw * p.data.length;
    const base = H - pad;
    p.data.forEach((d, j) => {
      const h = Math.round((d.n / max) * (base - 36));
      parts.push(`<rect x="${(x0 + j * bw + 1).toFixed(1)}" y="${base - h}" width="${(bw - 2).toFixed(1)}" height="${Math.max(h, d.n ? 1 : 0)}" rx="1.5" fill="${p.color}"><title>week to ${d.end}: ${int(d.n)}</title></rect>`);
    });
    parts.push(`<line x1="${x0}" y1="${base + 0.5}" x2="${right.toFixed(1)}" y2="${base + 0.5}" class="a"/>`);
    parts.push(`<text x="${x0}" y="${base + 18}" class="m">${addDays(p.data[0].end, -6)}</text>`);
    parts.push(`<text x="${right.toFixed(1)}" y="${base + 18}" class="m" text-anchor="end">${p.data.at(-1).end}</text>`);
    parts.push(`<text x="${x0 + panel - 8}" y="16" class="m" text-anchor="end">highest ${int(max)}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Usage: npm downloads and API requests a week">
<style>.t{font:600 13px system-ui,-apple-system,Segoe UI,sans-serif;fill:#57606a}.m{font:11px system-ui,-apple-system,Segoe UI,sans-serif;fill:#6e7781}.a{stroke:#8c959f;stroke-opacity:.5}@media (prefers-color-scheme:dark){.t{fill:#c9d1d9}.m{fill:#8b949e}}</style>
${parts.join('\n')}
</svg>
`;
}

function block(stats) {
  const n = stats.npm.daily;
  const rows = [
    '| | Last 7 days | Last 30 days | Since the first release |',
    '|---|---:|---:|---:|',
    `| npm downloads | ${int(sum(n, addDays(yesterday, -6)))} | ${int(sum(n, addDays(yesterday, -29)))} | ${int(sum(n, '0000-00-00'))} |`,
  ];
  if (stats.api) {
    const a = stats.api.daily, r = (v) => v.requests;
    rows.push(`| API requests | ${int(sum(a, addDays(yesterday, -6), yesterday, r))} | ${int(sum(a, addDays(yesterday, -29), yesterday, r))} | ${int(sum(a, '0000-00-00', yesterday, r))} (since ${Object.keys(a).sort()[0] ?? '—'}) |`);
  } else {
    rows.push('| API requests | — | — | not deployed yet |');
  }
  return [
    '![Usage: npm downloads and API requests a week](docs/stats.svg)',
    '',
    ...rows,
    '',
    `Counts only, to ${yesterday}, updated weekly (\`scripts/stats.mjs\`, history in [docs/stats.json](docs/stats.json)): npm's public download counts — every install counts, CI and mirrors included — and Cloudflare's request counts for the API. No addresses, queries or places are recorded anywhere.`,
  ].join('\n');
}

function fillReadme(stats) {
  const text = fs.readFileSync(README, 'utf8');
  const start = '<!-- usage:start -->', end = '<!-- usage:end -->';
  const i = text.indexOf(start), j = text.indexOf(end);
  if (i < 0 || j < 0) throw new Error('README.md has no usage block (<!-- usage:start --> … <!-- usage:end -->)');
  fs.writeFileSync(README, `${text.slice(0, i + start.length)}\n${block(stats)}\n${text.slice(j)}`);
}

async function main() {
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { npm: { daily: {} }, api: null };
  let stats = old;
  if (!OFFLINE) {
    const first = process.env.NPM_SINCE ?? '2026-10-18'; // the first release
    const npm = await npmDaily(first);
    let api = old.api;
    try {
      const fresh = await apiDaily();
      if (fresh) api = { daily: { ...(old.api?.daily ?? {}), ...fresh } };
    } catch (e) {
      // The chart keeps the days it has; the next run fills the rest (Cloudflare keeps 30 days).
      console.warn(`::warning::API counts not read: ${e.message}`);
    }
    stats = { updated: yesterday, npm: { daily: { ...old.npm.daily, ...npm } }, api };
    stats.npm.daily = Object.fromEntries(Object.entries(stats.npm.daily).sort());
    if (stats.api) stats.api.daily = Object.fromEntries(Object.entries(stats.api.daily).sort());
    fs.writeFileSync(FILE, JSON.stringify(stats, null, 1) + '\n');
  }
  fs.writeFileSync(SVG, chart(stats));
  fillReadme(stats);
  const n = stats.npm.daily;
  console.log(`npm: ${int(sum(n, addDays(yesterday, -6)))} downloads in the last 7 days, ${int(sum(n, '0000-00-00'))} in all`);
  console.log(stats.api ? `API: ${int(sum(stats.api.daily, addDays(yesterday, -6), yesterday, (v) => v.requests))} requests in the last 7 days` : 'API: not deployed yet (no Cloudflare secrets)');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
