#!/usr/bin/env node
/**
 * How much the library is used: npm downloads, and requests to the public
 * API — counts per day, nothing else. Written to docs/stats.json (the
 * history, kept), docs/stats.svg (the chart, shown at the top of the
 * README) and the README's usage block (the table).
 *
 *   node scripts/stats.mjs                      # fetch, merge, write
 *   node scripts/stats.mjs --offline            # rewrite the chart and README from docs/stats.json
 *
 * PyPI: the Python port's downloads, from pypistats.org (mirrors left out).
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
// A day is counted once it is over. Offline, the counts end where the
// history does: a rewrite on a later day must not claim days it never read.
const kept = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;
const yesterday = OFFLINE && kept?.updated ? kept.updated : addDays(today, -1);

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

/**
 * PyPI's daily downloads of the Python port, mirrors left out (pypistats.org,
 * which serves PyPI's public download log; it answers the last 180 days, and
 * older days are kept from before). Null when it cannot be read.
 */
async function pypiDaily() {
  const r = await get(`https://pypistats.org/api/packages/${PACKAGE}/overall?mirrors=false`);
  const out = {};
  for (const row of r.data ?? []) if (row.category === 'without_mirrors' && row.date <= yesterday) out[row.date] = row.downloads;
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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const short = (d) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** A round step for the scale's lines: 1, 2 or 5 times a power of ten, about `n` of them up to `max`. */
function niceStep(max, n = 3) {
  const raw = max / n;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
}

/**
 * Three stacked panels on one time axis — npm downloads, PyPI downloads and
 * API requests, a bar a day from the first release (the last 120 days at most), with the
 * last seven days' total and the whole total over each.
 *
 * A day, not a week: the counts are a few weeks old, and four weekly bars
 * said less than the days do. The panels share their dates, so a day sits
 * at the same place in both. One day far above the rest — the first
 * release's 628, mirrors fetching the new package — would flatten every
 * other day to a line, so the scale stops a little over the next highest
 * day and that one bar is drawn broken, its count written over it.
 */
function chart(stats) {
  const W = 760, left = 4, right = 44, plotW = W - left - right;
  const panelH = 160, head = 40, plotH = 82, foot = 26;
  const firstDay = [stats.npm.daily, stats.pypi?.daily ?? {}, stats.api?.daily ?? {}].flatMap((d) => Object.keys(d)).sort()[0] ?? yesterday;
  const from = [firstDay, addDays(yesterday, -119)].sort().at(-1);
  const days = [];
  for (let d = from; d <= yesterday; d = addDays(d, 1)) days.push(d);
  const slot = plotW / Math.max(days.length, 14);
  const bar = Math.max(1, Math.min(slot - (slot > 6 ? 2 : 1), 22));
  const x = (i) => left + i * slot + (slot - bar) / 2;

  const panels = [
    { title: 'npm downloads a day', unit: 'downloads', cls: 'n', daily: stats.npm.daily, pick: (v) => v },
    { title: 'PyPI downloads a day', unit: 'downloads', cls: 'y', daily: stats.pypi?.daily ?? null, pick: (v) => v, absent: 'not counted yet' },
    { title: 'API requests a day', unit: 'requests', cls: 'p', daily: stats.api?.daily ?? null, pick: (v) => v.requests, absent: 'not deployed yet' },
  ];
  const parts = [];
  panels.forEach((p, k) => {
    const y0 = k * panelH;
    const base = y0 + head + plotH;
    parts.push(`<text x="${left}" y="${y0 + 16}" class="t">${p.title}</text>`);
    if (!p.daily || !Object.keys(p.daily).length) {
      parts.push(`<text x="${left}" y="${y0 + head + plotH / 2}" class="m">${p.daily ? 'none yet' : p.absent}</text>`);
      return;
    }
    const counts = days.map((d) => (d in p.daily ? p.pick(p.daily[d]) : null));
    const week = sum(p.daily, addDays(yesterday, -6), yesterday, p.pick);
    const all = sum(p.daily, '0000-00-00', yesterday, p.pick);
    parts.push(`<text x="${W - right}" y="${y0 + 16}" class="s" text-anchor="end"><tspan class="v">${int(week)}</tspan> in the last 7 days · <tspan class="v">${int(all)}</tspan> in all</text>`);

    // The scale: up to the highest day, or — with one day far over the
    // rest — a little over the next highest, that one bar broken.
    const sorted = counts.filter((n) => n != null).sort((a, b) => b - a);
    const [top, second = 0] = sorted;
    const broken = top > 0 && second > 0 && top > 3 * second;
    const step = niceStep(broken ? second * 1.15 : top || 1);
    const max = Math.max(step, Math.ceil((broken ? second * 1.15 : top || 1) / step) * step);
    const y = (n) => base - Math.min(1, n / max) * plotH;
    for (let v = step; v <= max + 1e-9; v += step) {
      parts.push(`<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${W - right}" y2="${y(v).toFixed(1)}" class="g"/>`);
      parts.push(`<text x="${W - right + 6}" y="${(y(v) + 4).toFixed(1)}" class="m">${int(v)}</text>`);
    }
    parts.push(`<line x1="${left}" y1="${base + 0.5}" x2="${W - right}" y2="${base + 0.5}" class="a"/>`);
    parts.push(`<text x="${W - right + 6}" y="${base + 4}" class="m">0</text>`);
    counts.forEach((n, i) => {
      if (n == null) return;
      const h = n === 0 ? 0 : Math.max(1.5, base - y(n));
      const title = `<title>${short(days[i])}: ${int(n)} ${p.unit}</title>`;
      if (h > 0) parts.push(`<rect x="${x(i).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bar.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(2, bar / 3).toFixed(1)}" class="${p.cls}">${title}</rect>`);
      if (broken && n === top) {
        // The break: a gap across the bar under its top, and the count.
        const by = base - plotH + 10;
        parts.push(`<path d="M${(x(i) - 2).toFixed(1)} ${by + 3} l${bar + 4} -5 v4 l${-(bar + 4)} 5z" class="b"/>`);
        parts.push(`<text x="${(x(i) + bar / 2).toFixed(1)}" y="${base - plotH - 4}" class="v" text-anchor="middle">${int(n)}</text>`);
      }
    });
    // The highest day otherwise: its count over its bar.
    if (!broken && top > 0) {
      const i = counts.indexOf(top);
      parts.push(`<text x="${(x(i) + bar / 2).toFixed(1)}" y="${(y(top) - 5).toFixed(1)}" class="v" text-anchor="middle">${int(top)}</text>`);
    }
    // Before the first day counted (the API went live later): said, not blank.
    const firstCounted = counts.findIndex((n) => n != null);
    if (firstCounted > 3) {
      parts.push(`<text x="${(left + firstCounted * slot / 2).toFixed(1)}" y="${base - 8}" class="m" text-anchor="middle">not live yet</text>`);
    }
    // The dates: each Monday, as many as fit.
    const every = Math.max(1, Math.ceil(52 / (slot * 7)));
    let n = 0;
    days.forEach((d, i) => {
      if (new Date(`${d}T00:00:00Z`).getUTCDay() !== 1) return;
      if (n++ % every) return;
      parts.push(`<line x1="${(left + i * slot).toFixed(1)}" y1="${base}" x2="${(left + i * slot).toFixed(1)}" y2="${base + 4}" class="a"/>`);
      parts.push(`<text x="${(left + i * slot).toFixed(1)}" y="${base + 17}" class="m">${short(d)}</text>`);
    });
  });
  // The last panel's dates are the bottom of the picture.
  const H = (panels.length - 1) * panelH + head + plotH + foot;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`Usage, a day: npm downloads, PyPI downloads and API requests, to ${yesterday}`)}">
<style>
text{font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.t{font-size:13px;font-weight:600;fill:#1f2328}.s{font-size:12px;fill:#59636e}.v{font-size:12px;font-weight:600;fill:#1f2328}
.m{font-size:11px;fill:#59636e}.a{stroke:#8c959f}.g{stroke:#8c959f;stroke-opacity:.25}
.n{fill:#2f7d68}.y{fill:#b5803f}.p{fill:#3f6fb5}.b{fill:#ffffff}
@media (prefers-color-scheme:dark){.t,.v{fill:#e6edf3}.s,.m{fill:#9198a1}.a{stroke:#656c76}.g{stroke:#656c76;stroke-opacity:.4}.n{fill:#3fa58a}.y{fill:#d9a55b}.p{fill:#5b8fd9}.b{fill:#0d1117}}
</style>
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
  if (stats.pypi && Object.keys(stats.pypi.daily).length) {
    const y = stats.pypi.daily;
    rows.push(`| PyPI downloads | ${int(sum(y, addDays(yesterday, -6)))} | ${int(sum(y, addDays(yesterday, -29)))} | ${int(sum(y, '0000-00-00'))} (since ${Object.keys(y).sort()[0]}) |`);
  } else {
    rows.push('| PyPI downloads | — | — | not counted yet |');
  }
  if (stats.api) {
    const a = stats.api.daily, r = (v) => v.requests;
    rows.push(`| API requests | ${int(sum(a, addDays(yesterday, -6), yesterday, r))} | ${int(sum(a, addDays(yesterday, -29), yesterday, r))} | ${int(sum(a, '0000-00-00', yesterday, r))} (since ${Object.keys(a).sort()[0] ?? '—'}) |`);
  } else {
    rows.push('| API requests | — | — | not deployed yet |');
  }
  return [
    // The chart itself is at the top of the README, over the install line.
    ...rows,
    '',
    `Counts only, to ${yesterday}, updated weekly (\`scripts/stats.mjs\`, history in [docs/stats.json](docs/stats.json)): npm's public download counts — every install counts, CI and mirrors included — PyPI's for the [Python port](https://pypi.org/project/mihrab-methods/) (pypistats.org, mirrors left out), and Cloudflare's request counts for the API. No addresses, queries or places are recorded anywhere.`,
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
  const old = kept ?? { npm: { daily: {} }, pypi: null, api: null };
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
    let pypi = old.pypi ?? null;
    try {
      pypi = { daily: { ...(old.pypi?.daily ?? {}), ...(await pypiDaily()) } };
    } catch (e) {
      // The chart keeps the days it has; the next run fills the rest (180 days are answered).
      console.warn(`::warning::PyPI counts not read: ${e.message}`);
    }
    stats = { updated: yesterday, npm: { daily: { ...old.npm.daily, ...npm } }, pypi, api };
    stats.npm.daily = Object.fromEntries(Object.entries(stats.npm.daily).sort());
    if (stats.pypi) stats.pypi.daily = Object.fromEntries(Object.entries(stats.pypi.daily).sort());
    if (stats.api) stats.api.daily = Object.fromEntries(Object.entries(stats.api.daily).sort());
    fs.writeFileSync(FILE, JSON.stringify(stats, null, 1) + '\n');
  }
  fs.writeFileSync(SVG, chart(stats));
  fillReadme(stats);
  const n = stats.npm.daily;
  console.log(`npm: ${int(sum(n, addDays(yesterday, -6)))} downloads in the last 7 days, ${int(sum(n, '0000-00-00'))} in all`);
  console.log(stats.pypi ? `PyPI: ${int(sum(stats.pypi.daily, addDays(yesterday, -6)))} downloads in the last 7 days, ${int(sum(stats.pypi.daily, '0000-00-00'))} in all` : 'PyPI: not counted yet');
  console.log(stats.api ? `API: ${int(sum(stats.api.daily, addDays(yesterday, -6), yesterday, (v) => v.requests))} requests in the last 7 days` : 'API: not deployed yet (no Cloudflare secrets)');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
