# mihrab-methods

[![npm](https://img.shields.io/npm/v/mihrab-methods)](https://www.npmjs.com/package/mihrab-methods)
[![checks](https://github.com/MihrabHQ/mihrab-methods/actions/workflows/ci.yml/badge.svg)](https://github.com/MihrabHQ/mihrab-methods/actions/workflows/ci.yml)
[![certification](docs/certification.svg)](#how-verification-works)

**Prayer times that match the published timetable to the printed minute.**
Each national authority's own calculation method, worked out again from its
published times and checked day by day against its timetables: <!--fig:total.off-->0<!--/fig--> of
<!--fig:total.times-->71,896,761<!--/fig--> times off the printed minute. Free for any app, site or
mosque to use.

```sh
npm install mihrab-methods
```

```ts
import { nearestPlace, timesFor } from 'mihrab-methods/diyanet'; // one authority's data, or 'mihrab-methods' for all

const { place } = nearestPlace('diyanet', 41.01, 28.98)!;  // Istanbul's district
const day = timesFor(place, '2026-10-15');                  // or { year: 2026, month: 10, day: 15 }
day.status;          // 'certified': inside the dates the method was checked over
day.clock.label;     // 'Europe/Istanbul': the clock the table prints the day in
day.times!.fajr;     // { instant: Date, printed: 'HH:MM' } — show printed, schedule on instant
day.certifiedUntil;  // the last date checked; past it, status is 'method-only'
```

The full API, the HTTP server and the per-authority imports are in
[docs/usage.md](docs/usage.md).

## What is certified

<!-- certification-table:start -->
| Authority | Tables matched | Places | Times checked | Off the printed minute | By the method alone | Correction entries | Checked over |
|---|---|---:|---:|---:|---:|---:|---|
| **Sweden** | Islamiska Förbundet’s tables | 107 | 59,640 | **0** | 99.966 % | 270 | 11 Oct 2026 → 19 Nov 2027 |
|  | Diyanet’s own tables | 159 | 1,393,794 | **0** | 99.981 % |  | 1 Jan 2024 → 31 Dec 2027 |
| **Diyanet** | its tables worldwide | 8,132 | 69,999,603 | **0** | 99.986 % | 9,118 | 1 Jan 2024 → 31 Dec 2027 |
| **Morocco** | Habous | 164 | 75,768 | **0** | 99.122 % | 665 | 27 Aug 2026 → 11 Nov 2026 |
| **Algeria** | Ministry of Religious Affairs | 68 | 101,184 | **0** | 99.365 % | 642 | 1 Oct 2026 → 5 Jun 2027 |
| **Indonesia** | Kemenag | 517 | 266,772 | **0** | 99.968 % | 84 | 7 Oct 2026 → 31 Dec 2026 |

5 of 5 methods certified; 0 of 71,896,761 times off the printed minute. Last checked 18 October 2026. Generated from [`certification.json`](certification.json) by `scripts/readme.mjs`.
<!-- certification-table:end -->

"By the method alone" is the formula without its correction list. The list
holds the few times the authority's own program puts a fraction of a second
on the other side of a minute's rounding point: a point, a date, a prayer, a
minute either way. Why that can be used freely is in
[docs/legal.md](docs/legal.md); what each method still leaves out is in
[docs/status.md](docs/status.md).

## How verification works

1. **The tables.** For each authority, its own published timetables for
   every place it lists, every day it has published. They are not part of
   this repository and are not redistributed; the check reads them from
   `MIHRAB_TABLES`.
2. **The check.** [`tools/verify.ts`](tools/verify.ts) computes every place on
   every day and compares each of the six times with the printed minute, on
   the clock the table prints that day in. Days the table itself gets wrong
   (another town's times under a name, a previous year's rows) are set aside
   and listed in the record, so each can be judged.
3. **The record.** [`tools/certify.ts`](tools/certify.ts) writes
   [`certification.json`](certification.json): per authority, the tables
   checked, the times, how many are off with and without the correction
   list, the dates, the method's revision and the list's SHA-256.
4. **The gate.** A method is certified only at **0** off. `timesFor` refuses
   an uncertified method, and says `'method-only'` for a date past the
   checked span. Every number on this page, on the Mihrab website and in its
   store listings is generated from that record (`scripts/readme.mjs`).

Times that differ from your mosque's?
[Open a report](https://github.com/MihrabHQ/mihrab-methods/issues/new?template=times-differ.yml)
with the city, the date, the prayer and the printed time.

## Keeping an app current

The record and the correction lists are a feed: an app that computes a
method's revision can take any newer list certified for that revision, with
no release.

```ts
import { fetchLatestCorrections } from 'mihrab-methods/morocco';
const r = await fetchLatestCorrections({ authority: 'morocco' });
// 'current' | 'updated' | 'method-moved' (update the app) | 'uncertified' | 'rejected'
```

It takes a list only for the revision the build computes, only when it is
the list the record names, and only when its SHA-256 matches. Schemas, tags
as fixed addresses and the details: [docs/feed.md](docs/feed.md).

## More

| | |
|---|---|
| [docs/usage.md](docs/usage.md) | The API, the entry points, the HTTP server, this repository's commands and layout |
| [docs/methods.md](docs/methods.md) | Each method in words and formulas, for ports to other languages; `test/vectors.json` to check one |
| [docs/status.md](docs/status.md) | Per method: what is certified, what was set aside, what is not yet covered |
| [docs/diyanet.md](docs/diyanet.md) | What Diyanet's worldwide tables add: Isha by country, midsummer, Türkiye's points, tables on their own clocks |
| [docs/feed.md](docs/feed.md) | `certification.json` and the lists as a feed: schemas, hashes, revisions, tags |
| [docs/legal.md](docs/legal.md) | Formulas and correction lists: why this can be used freely |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Adding an authority: 100 % or nothing |
| [CHANGELOG.md](CHANGELOG.md) | Each version, and what each method revision changed in the output |

The Mihrab app computes these methods on the phone; a method that improves
here goes back as the same file in Mihrab's `src/providers/`.

Mihrab and this library are independent: not affiliated with, endorsed by
or speaking for any of the authorities whose published timetables they
match.

## Licence

[MPL-2.0](LICENSE). Use the library in any app, open or closed, on a phone
or on a server; what the licence asks is that changes to *these files* — a
method fitted closer to its table, a corrected point — are published under
the same terms, so an improvement to a method reaches everyone. The Mihrab
app stays AGPL-3.0 and includes this library as the MPL allows. Versions
before 1.0.0 were AGPL-3.0-or-later.
