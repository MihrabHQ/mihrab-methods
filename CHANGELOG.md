# Changelog

Each method has a **revision** (`src/methods/revisions.ts`), raised whenever
a change to it, or to the points it computes its places at, changes what it
prints. A correction list is written for one revision, and an app applies a
list only to the revision it computes. This file says what each revision
changed in the output. Package versions follow semver for the API; a
revision bump is at least a minor version.

## Unreleased

- **Algeria south of the equator: Asr takes the noon shadow's length.** The
  Ministry's method signs the noon shadow, which is right in Algeria and
  wrong where the Sun passes north of the zenith: computed for a point
  south of the equator, Asr fell at Dhuhr or hours early. There the method
  now takes the shadow's length, as every other method does. No listed
  place is south of the equator, so nothing the method prints for Algeria
  changes and its revision stays; in every port.

No method changed; no revision raised.

## 1.20.0 — 2026-11-12

- **The API answers a point without being told the authority.**
  `/v1/times?lat=&lng=` (and `/v1/nearest`) with no `authority` use the one
  the point belongs to, and say so: `authorityFrom` (`location` or
  `request`) and `distanceKm`, the distance to the place whose times these
  are; `maxKm=` refuses beyond a distance. Where no authority here
  publishes for the point the answer is 404. `/v1/authority` gains `place`
  and `distanceKm`. Everything an answer had before is unchanged.
- **`defaultAuthorityFor` knows every authority.** It answered for Sweden,
  Morocco, Algeria, Indonesia and Türkiye only; now also Kazakhstan, Egypt,
  Brunei, Qatar, Kuwait, Jordan, Albania, Bulgaria, Pakistan, the Emirates
  and Iran by the country's outline, and Tatarstan's, the Central
  Muftiate's and Wifaqul Ulama's by the nearest place they list.
  `data/locate/countryOutlines.json` gains those countries and their
  neighbours' border strips (`scripts/outlines.py`).
- **The API is described**: OpenAPI 3.1 at `/openapi.json` and in
  `docs/openapi.json`, written from the table the handler dispatches on
  (`src/openapi.ts`), and its address and terms of use are in the README.

No method changed; no revision raised.

## 1.19.0 — 2026-11-12

- **The United Kingdom, revision 1: a twentieth method.** Wifaqul Ulama
  (Britain)'s yearly timetables for eighty-one towns: `mihrab-methods/wifaq`,
  authority `wifaq`. Fajr at 18°, Zuhr four minutes after the transit,
  Maghrib five after sunset, Isha at 15° or a seventh of the night, the
  Hanafi Asr, and its own rule for Fajr in the summer twilight
  (`docs/methods.md`). With its correction list the method matches the
  published timetable of every town over the certified span
  (`docs/status.md`). `certification.json` gains a `wifaq` entry and
  `data/corrections/wifaq.json` is new. In every port (`wifaq_minutes` /
  `wifaqMinutes`, `REVISIONS` with `wifaq: 1`). No other method's output
  changes.

## 1.18.0 — 2026-11-12

- **Iran, revision 1: a nineteenth method.** The Institute of Geophysics
  of the University of Tehran, for the thirty-one province capitals its
  Calendar Center prints a sheet for: `mihrab-methods/tehran`, authority
  `tehran`. A plain program — Fajr at 17.7°, sunrise at −0.8333°, Dhuhr at
  the transit, Maghrib at 4.5°, the nearest minute (`docs/methods.md`). With
  its correction list the method matches the published sheets of every
  capital over the certified span, in the four times they print of the
  six; Asr and Isha (one shadow length, 14°) are not printed and not
  certified (`docs/status.md`). `certification.json` gains a `tehran` entry
  and `data/corrections/tehran.json` is new. In every port
  (`tehran_minutes` / `tehranMinutes`, `REVISIONS` with `tehran: 1`).
  `tehranSunsetAndMidnight` (TypeScript) gives the sheets' sunset and
  midnight. No other method's output changes.
No method changed; no revision raised.

## 1.17.0 — 2026-11-12

- **The United Arab Emirates, revision 1: an eighteenth method.** The
  prayer times of the General Authority of Islamic Affairs, Endowments and
  Zakat for its forty-one zones: `mihrab-methods/uae`, authority `uae`.
  Jordan's kind of program with the Authority's figures — 18° and 18°, a
  horizon allowance a zone, a morning margin a zone, Dhuhr two minutes
  after the transit, Asr on the apparent sun with the noon shadow taken at
  Dhuhr (`docs/methods.md`). With its correction
  list the method matches the published timetable of every zone over the
  certified span; Dubai's three zones lean on the list more than the others
  (`docs/status.md`). `certification.json` gains a `uae` entry and
  `data/corrections/uae.json` is new. In every port (`uae_minutes` /
  `uaeMinutes`, `REVISIONS` with `uae: 1`). No other method's output
  changes.

## 1.16.0 — 2026-11-12

- **Pakistan's Jamia Banuri Town, revision 1: a seventeenth method.** The
  prayer times of Jamia Uloom-ul-Islamia, Banuri Town (Karachi) for a
  hundred cities of Pakistan: `mihrab-methods/banuri`, authority `banuri`.
  Kazakhstan's sun and arithmetic with Fajr and Isha at 18°, the zenith as
  Dhuhr, the Hanafi Asr, no margins and the nearest minute
  (`docs/methods.md`). With its correction list the method matches the
  published timetable of every city over the certified span
  (`docs/status.md`). `certification.json` gains a `banuri` entry and
  `data/corrections/banuri.json` is new. In every port (`banuri_minutes` /
  `banuriMinutes`, `REVISIONS` with `banuri: 1`). No other method's output
  changes.
No method changed; no revision raised.

## 1.15.0 — 2026-11-12

No method changed; no revision raised. The correction lists and the certification record as of 2026-11-12 (correction lists changed (2 files: data/corrections/albania.json, data/corrections/bulgaria.json); the library changed (58 files: dist/cjs/albania.d.ts, dist/cjs/albania.js, dist/cjs/authorities/albania.d.ts, dist/cjs/authorities/albania.js, …); docs changed (1 file: docs/methods.md); schemas changed (1 file: schemas/certification.schema.json); albania: a new method; bulgaria: a new method; new entry points: ./albania, ./bulgaria).

## 1.14.0 — 2026-11-12

- **Albania and Bulgaria, revision 1 each: a fifteenth and a sixteenth
  method.** The Muslim Community of Albania's calendar (Tirana and
  twenty-one towns of Albania and its neighbours: `mihrab-methods/albania`)
  and the Grand Mufti's Office of Bulgaria's timetable (Sofia and
  forty-seven towns: `mihrab-methods/bulgaria`). Each is one town's table
  with the sun taken once for the whole day — at 0h UT of the date for
  Tirana, at 11h UT of the day before for Sofia — Fajr at 18°, Isha at 17°,
  the old temkin on sunrise, Dhuhr, Asr and Maghrib, and every other town
  as whole minutes on it (`docs/methods.md`, `src/methods/townTable.ts`).
  With its correction list each matches the published timetable of every
  town over the certified span (`docs/status.md`). `certification.json`
  gains `albania` and `bulgaria`, and `data/corrections/albania.json` and
  `bulgaria.json` are new. In every port (`albania_minutes`,
  `bulgaria_minutes` / `albaniaMinutes`, `bulgariaMinutes`, `REVISIONS`
  with both at 1). No other method's output changes.

## 1.13.0 — 2026-11-11

- **Russia's Central Muftiate, revision 1: a fourteenth method.** The
  Central Spiritual Administration of Muslims of Russia's timetables for
  eighteen cities: `mihrab-methods/cdum`, authority `cdum`. Kazakhstan's
  sun and arithmetic with Fajr at 18°, Isha at 17°, Asr at two shadow
  lengths and a margin of 2 minutes on every time; and where the twilight
  does not form, the 45th parallel's share of the night
  (`docs/methods.md`). With its correction list the method matches the
  published timetable of every city over the certified span
  (`docs/status.md`). `certification.json` gains a `cdum` entry and
  `data/corrections/cdum.json` is new. In every port (`cdum_minutes` /
  `cdumMinutes`, `REVISIONS` with `cdum: 1`). No other method's output
  changes.

## 1.12.0 — 2026-11-11

- **Tatarstan, revision 1: a thirteenth method.** The Spiritual
  Administration of Muslims of the Republic of Tatarstan's timetable for
  forty-four places: `mihrab-methods/tatarstan`, authority `tatarstan`.
  The dawn at 18° rounded down; sunrise, the zenith, Asr at two shadow
  lengths on the apparent sun, Maghrib and Isha at 15°, each rounded up;
  and where the 18° twilight does not form, the dawn 121 minutes before
  sunrise and Isha 90 after Maghrib (`docs/methods.md`). With its
  correction list the method matches the published timetable of every
  place over the certified span (`docs/status.md`). `certification.json`
  gains a `tatarstan` entry and `data/corrections/tatarstan.json` is new.
  In every port (`tatarstan_minutes` / `tatarstanMinutes`, `REVISIONS` with
  `tatarstan: 1`). No other method's output changes.

## 1.11.0 — 2026-11-11

- **Jordan, revision 1: a twelfth method.** The Ministry of Awqaf, Islamic
  Affairs and Holy Places' times for its seventeen zones, Jerusalem among
  them: `mihrab-methods/jordan`, authority `jordan`. Each zone at its own
  point, from Meeus's apparent sun: Fajr and Isha at 18°, sunrise and
  Maghrib with the upper limb on the horizon lowered by the zone's horizon
  allowance east and west, Asr on the apparent sun, every time rounded to
  the nearest minute (`docs/methods.md`). With its correction list the
  method matches the published timetable of every zone over the certified
  span (`docs/status.md`). `Place` gains `fajrMinutes`, a zone's margin on
  Fajr. `certification.json` gains a `jordan` entry and
  `data/corrections/jordan.json` is new. In every port (`jordan_minutes` /
  `jordanMinutes`, `REVISIONS` with `jordan: 1`). No other method's output
  changes.

## 1.10.0 — 2026-11-11

- **Kuwait, revision 1: an eleventh method.** The Ministry of Awqaf and
  Islamic Affairs' table for Kuwait City and 45 areas:
  `mihrab-methods/kuwait`, authority `kuwait`. One table, the same every
  year — each day's times are those of that day of 1978 at Kuwait City,
  from Meeus's apparent sun: Fajr at 18°, Isha at 17.5°, Asr at one shadow
  length, every time rounded to the nearest minute — and an area adds its
  whole minutes (`docs/methods.md`). With its correction list the method
  matches the published timetable of every area over the certified span
  (`docs/status.md`). `certification.json` gains a `kuwait` entry and
  `data/corrections/kuwait.json` is new. In every port (`kuwait_minutes` /
  `kuwaitMinutes`, `REVISIONS` with `kuwait: 1`). No other method's output
  changes.

## 1.9.0 — 2026-11-11

- **Morocco, revision 3.** The points of 112 of the 164 cities move a
  little — at most 0.014° of latitude and 0.01° of horizon — refitted on
  the ministry's summer pages of 2022 together with the 2026 tables;
  revision 2's were fitted on autumn alone, the season that shows a city's
  latitude least. A time moves by a minute on the days the two points round
  differently, mostly in summer; the calculation is unchanged. On days not
  used in the fit the refit is off a fifth less often (`docs/status.md`).
  The correction list is rewritten for revision 3, and the method with its
  list matches the published timetable of every listed city over the
  certified span, as before. Ports: `REVISIONS` say `morocco: 3`.

## 1.8.0 — 2026-11-11

- **Qatar, revision 1: a tenth method.** The Qatar Calendar House's times
  for Doha: `mihrab-methods/qatar`, authority `qatar`. Meeus's apparent sun
  at each time's own moment; Fajr at 18°, sunrise and Maghrib from the
  sun's centre 0.8333° below the horizon, Asr at one shadow length, each
  with the calendar's own margin and rounded to the nearest minute; Isha
  ninety minutes after Maghrib (`docs/methods.md`). With its correction
  list the method matches the published timetable of the Qatar Calendar
  House over the certified span, which is short: the calendar's times
  changed with 1448 AH and only that year's months are this method's
  (`docs/status.md`). `certification.json` gains a `qatar` entry and
  `data/corrections/qatar.json` is new. In every port (`qatar_minutes` /
  `qatarMinutes`, `REVISIONS` with `qatar: 1`). No other method's output
  changes.

## 1.7.0 — 2026-11-11

- **Brunei, revision 1: a ninth method.** The Ministry of Religious
  Affairs' times for Brunei's four districts: `mihrab-methods/brunei`,
  authority `brunei`. One table for the country, computed at Bandar Seri
  Begawan from Meeus's apparent sun taken once for the day (0h UT): Fajr at
  20°, Isha at 18°, Dhuhr 1.06 minutes after the transit, Asr at one shadow
  length, every time rounded to the nearest minute; Tutong adds a minute
  and Belait three (`docs/methods.md`). With its correction list the method
  matches the published timetable of every district over the certified
  span, on the days the Ministry's list prints soundly (`docs/status.md`).
  `certification.json` gains a `brunei` entry and
  `data/corrections/brunei.json` is new. In every port (`brunei_minutes` /
  `bruneiMinutes`, `REVISIONS` with `brunei: 1`). No other method's output
  changes.

## 1.6.0 — 2026-11-11

- **Egypt, revision 1: an eighth method.** The Egyptian General Authority
  of Survey's times for 77 cities and towns, each at the point its
  published year shows: `mihrab-methods/egypt`, authority `egypt`. Fajr at
  19.5°, Isha at 17.5°, sunrise and Maghrib with the sun's centre 0.845°
  below the horizon, Asr from the noon shadow of local noon's declination,
  no margins, every time rounded to the nearest minute, from Meeus's
  apparent sun at each time's own moment (`docs/methods.md`). With its
  correction list the method matches the published timetable of every
  listed place over the certified span. `certification.json` gains an
  `egypt` entry and `data/corrections/egypt.json` is new. In every port
  (`egypt_minutes` / `egyptMinutes`, `REVISIONS` with `egypt: 1`). No other
  method's output changes.

## 1.5.0 — 2026-11-11

- **Kazakhstan, revision 1: a seventh method.** The Spiritual
  Administration of Muslims of Kazakhstan's times for 84 cities and towns,
  each at the coordinates the Administration gives it:
  `mihrab-methods/kazakhstan`, authority `kazakhstan`. Fajr and Isha at 15°
  with a quarter-of-the-night cap, Asr at two shadow lengths (the one Asr
  it prints), a margin of 3 minutes (5 from 48° N), every time rounded to
  the nearest minute, from a short series for the sun computed once per
  time (`docs/methods.md`). The method alone matches the published
  timetable of every listed place over the certified span; its correction
  list is empty. `certification.json` gains a `kazakhstan` entry and
  `data/corrections/kazakhstan.json` is new. In every port
  (`kazakhstan_minutes` / `kazakhstanMinutes`, `REVISIONS` with
  `kazakhstan: 1`). No other method's output changes.

## 1.4.0 — 2026-11-11

- **Diyanet, revision 2.** Fifteen places abroad are computed 0.001° (one
  of them 0.002°) from where revision 1 had them, where the table shows the
  neighbouring point is the one it is computed at. Their times move by a
  minute on the days the two points round differently; every other place
  prints what revision 1 printed. The correction list is rewritten for
  revision 2 and is shorter, and the method with its list matches the
  published timetable of every listed place over the certified span, as
  before. Ports: `REVISIONS` say `diyanet: 2`; the calculation is unchanged.

## 1.3.2 — 2026-11-11

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
