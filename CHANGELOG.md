# Changelog

Each method has a **revision** (`src/methods/revisions.ts`), raised whenever
a change to it, or to the points it computes its places at, changes what it
prints. A correction list is written for one revision, and an app applies a
list only to the revision it computes. This file says what each revision
changed in the output. Package versions follow semver for the API; a
revision bump is at least a minor version.

## Unreleased

- **Türkiye Takvimi: 740 districts.** The calendar's cities for Türkiye's
  districts join the 81 province centres, each at the point and with the
  temkin its year shows. Nothing changes for the centres; the revision
  stays 1.

## 1.3.1 — 2026-11-11

- **Diyanet's tables for Cuba keep the clock they are printed in.** Cuba
  put its return to winter time off from November 2026 to November 2027;
  the tables were printed before that. The 14 Cuban places now carry the
  table's own clock, so the printed times are the table's whichever
  edition of the time-zone database a machine has. The instants do not
  change, nor the revision.
No method changed; no revision raised.

## 1.3.0 — 2026-11-11

- **Türkiye Takvimi, revision 1: a sixth method.** The calendar's own
  method (namazvakti.com) for Türkiye's 81 province centres, each at the
  point and with the temkin its published year shows: `mihrab-methods/turkiyetakvimi`,
  authority `turkiyetakvimi`, `Place.temkin`. Fajr is the calendar's Sabâh.
  Nothing changes for the other methods; `certification.json` gains an
  entry and `data/corrections/turkiyetakvimi.json` is new. In every port
  too.

## 1.2.1 — 2026-11-11

- **Diyanet: 186 more places.** Places Diyanet lists that had not been
  placed are now in the list, each at the point its table is computed at
  (61 on a clock of their table's own), with their entries in the
  correction list. Nothing changes for the places already there, and the
  revision stays 1.
- **Ports.** The five methods in Python, Swift, Kotlin and Dart under
  `ports/`, each with no dependencies beyond its standard library and each
  held to `test/vectors.json` on every push. Nothing changes in what the
  library prints.

## 1.2.0 — 2026-11-11

- **Indonesia, revision 2.** Two things change in the output, each by a
  fraction of a second, which moves a printed minute on about one time in
  three hundred:
  - **The sun is taken without ΔT**, as the ministry's program takes it:
    Universal Time for the ephemeris' own time. Every time of the day comes
    about a fifth of a second earlier.
  - **Each regency is computed at the ministry's own coordinates** for it,
    not at a point fitted to its table. Karawang's second point for the
    afternoon is gone with its fitted point; Pekajang is where the
    ministry's program puts it (0.8° N).

  Revision 1's points were fitted to October–December 2026 and hid the
  missing ΔT inside those months: a minute off once in 3,200 times there,
  once in 300 on January 2027. Revision 2 has nothing fitted and is the
  same on every month: 234 corrections over the 362,934 times where
  revision 1 needed 405.
- `preciseApparentSun(d, deltaTSeconds?)` takes the ΔT to use (as before
  when left out).

## 1.1.0 — 2026-11-04

- **Morocco, revision 2.** The method was fitted on the ministry's autumn
  tables alone; read against its pages of 2014–2025 from the Internet
  Archive (Rabat, Figuig, Tangier, Casablanca, Laayoune and others, every
  month) it drifted a tenth of a minute by late November and more towards
  the solstices. Three things change in the output:
  - **Asr** is computed on the apparent sun — the gnomon's noon shadow from
    the refracted noon altitude, and the moment the refracted sun casts it
    plus one length — instead of the true sun at the event. Up to 0.3 min
    later in winter, a few seconds in summer.
  - **Sunrise and Maghrib**: the ministry's allowance is an angle on the
    horizon, not minutes; the fixed margins fall from −2.85/+3.7 min to
    −1/+1.8 and every city's horizon allowance rises by about 0.3°. The
    same minute in autumn; up to 0.2 min earlier sunrise and later Maghrib
    near the solstices.
  - **Every city's point** refitted on the 96 days of 2026 under the new
    rule (and on the archive's 2023–2025 pages where it has them); the
    unlisted city's allowance becomes `0.32° + 0.025°·√height` east and
    `0.37° + 0.021°·√height` west.
  The method alone now gives the ministry's printed minute for 99.88 % of
  its 2026 tables (114 off of 94,350; was 98.07 %, 1,820 off, over the
  same days) and 99.3 % of the archive's 2023–2026 pages, every month of
  the year; the rest are within a second or two of a minute's edge.
  New correction list; apps on revision 1 keep theirs and are told to
  update.

- **Diyanet, Winnipeg (9078):** the table's own clock, read off the table
  (CST in winter, CDT in summer, as Diyanet prints it). Manitoba moves to
  permanent UTC−5 from 1 November 2026 (tzdata 2026e); Diyanet's tables for
  Winnipeg still fall back that day. The place used `America/Winnipeg`, so a
  runtime with tzdata 2026e printed its winters an hour later than the
  table (1,128 times, all of them ±60 min) while one with older zone data
  matched it — the same method, certified or not by the machine it ran on.
  Like Alberta's and British Columbia's places, Winnipeg now prints on the
  clock its table keeps, on every runtime. The instants are unchanged.

## 1.0.2 — 2026-10-18

No method changed.

- `certification.json` records, for each check, how many times the method
  alone leaves off the printed minute (`offWithoutCorrections`), so that
  figure is generated rather than typed.
- Every figure in the README and docs is generated from `certification.json`
  (`scripts/readme.mjs`, checked in CI), with a certification badge drawn
  from it.
- The README is short; the depth moved to `docs/` (usage, feed, status,
  Diyanet, legal) with nothing dropped. `CONTRIBUTING.md` ("100 % or
  nothing") and a "Times differ from my mosque" issue form.

## 1.0.1 — 2026-10-18

No method changed; every time is as in 1.0.0.

- Runs in React Native and in browser bundles: `fetchLatestCorrections`
  no longer imports `node:crypto` (a bundler for a phone or a browser
  fails on the import itself); without WebCrypto (Hermes) it uses a
  built-in SHA-256.
- A zone's offset is read from its wall clock rather than from
  `timeZoneName: 'longOffset'`, which not every runtime supports — where
  it is missing the offset would have been silently wrong. Checked equal
  to the old reading for every zone the places use on every day of
  2023–2028.
- Places are frozen: a caller moving one would have moved the
  corrections looked up for it, for everyone.
- README: the Stockholm example's Fajr (05:09) and the data sizes.

## 1.0.0 — 2026-10-18

The first published package. No method changed: every revision stays at 1,
every certification and every correction list is as before, and the files
apps read from `main` (`certification.json`, `data/corrections/*.json`) keep
their shape — `certification.json` gains `corrections.sha256`.

- Installable: `npm install mihrab-methods`, CommonJS and ESM with types,
  one entry point per authority (`mihrab-methods/indonesia` carries only
  Indonesia's data), `mihrab-methods/locate` for the country at a point and
  the authority it prays by, `mihrab-methods/core` with no data.
- Dates: `timesFor(place, '2026-10-15')` or `{ year, month, day }` with
  January = 1. The old `(place, year, month0, day)` call is refused with a
  message.
- Output: each prayer as `{ instant, printed }`, with the day's `clock`
  (zone or the table's own offset), `status`, `certifiedFrom`,
  `certifiedUntil` and `revision`.
- A status instead of a throw outside the certified dates
  (`'method-only'`); `{ strict: true }` for the old behaviour. An
  uncertified method still throws.
- `timesForRange`, `methodInfo`, `placeById`, `nearestPlace`, `Place.id`
  and `Place.country`.
- `fetchLatestCorrections` and `applyCorrections`: the update check with
  the revision, the list's identity and its SHA-256; JSON Schemas for
  `certification.json` and the lists.
- Licence: MPL-2.0 (was AGPL-3.0-or-later), so any app can use the
  library while changes to its files stay public.
- `docs/methods.md` (the methods in words and formulas) and
  `test/vectors.json` for ports; `npm run serve`, a small HTTP
  server; a CI workflow; this changelog.

### Method revisions

Every method is at revision 1 since its first certification (2026-10-15 for
Sweden, Morocco, Algeria and Indonesia; Diyanet worldwide 2026-10-16). The
figures each was certified with are in `certification.json` at the tag.
