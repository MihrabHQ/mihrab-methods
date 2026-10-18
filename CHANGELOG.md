# Changelog

Each method has a **revision** (`src/methods/revisions.ts`), raised whenever
a change to it, or to the points it computes its places at, changes what it
prints. A correction list is written for one revision, and an app applies a
list only to the revision it computes. This file says what each revision
changed in the output. Package versions follow semver for the API; a
revision bump is at least a minor version.

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
- `docs/methods.md` (the methods in words and formulas) and
  `test/vectors.json` (64 cases) for ports; `npm run serve`, a small HTTP
  server; a CI workflow; this changelog.

### Method revisions

| Authority | Revision | Since | What it prints |
|---|---|---|---|
| sweden | 1 | 2026-10-15 | Diyanet's Congress method as its Swedish tables realise it (`sweden.ts`), with the 270-entry list; certified 2024–2027 |
| diyanet | 1 | 2026-10-16 | The same, Isha by country, a point per prayer per year in Türkiye, tables on their own clocks; 8 291 places; certified 2024–2027 |
| morocco | 1 | 2026-10-15 | Habous's method with per-city horizons and the ministry's clock; certified 27 Aug → 11 Nov 2026 |
| algeria | 1 | 2026-10-15 | The ministry's NOAA-based method, rounding up; certified 1 Oct 2026 → 5 Jun 2027 |
| indonesia | 1 | 2026-10-15 | Kemenag's method with margins and the highland class, Karawang's afternoon point; certified 7 Oct → 31 Dec 2026 |
