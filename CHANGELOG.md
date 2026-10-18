# Changelog

Each method has a **revision** (`src/methods/revisions.ts`), raised whenever
a change to it, or to the points it computes its places at, changes what it
prints. A correction list is written for one revision, and an app applies a
list only to the revision it computes. This file says what each revision
changed in the output. Package versions follow semver for the API; a
revision bump is at least a minor version.

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
