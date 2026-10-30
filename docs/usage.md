# Using mihrab-methods

## As a package

```sh
npm install mihrab-methods
```

One entry point per authority, so an app ships only the data it needs —
an Indonesian app does not carry Diyanet's worldwide points:

| Import | Loads |
|---|---|
| `mihrab-methods` | all five |
| `mihrab-methods/sweden`, `/diyanet`, `/morocco`, `/algeria`, `/indonesia` | one authority: its places, list and certification |
| `mihrab-methods/locate` | `countryAt`, `defaultAuthorityFor` — the country at a point, and the authority whose table it prays by (the country outlines, kept apart because most apps already know their country) |
| `mihrab-methods/core` | the calls and types with no data (load authorities yourself) |

CommonJS and ES modules, with types. Node 18+, or any bundler; nothing is
read from disk or fetched unless you call `fetchLatestCorrections`.

```ts
import { placesOf, placeById, nearestPlace, timesFor, timesForRange, candidateTimes, methodInfo } from 'mihrab-methods';
import { defaultAuthorityFor } from 'mihrab-methods/locate';

defaultAuthorityFor(59.33, 18.07);            // 'sweden' (null where none of the five is the authority)
const { place, distanceKm } = nearestPlace('sweden', 59.33, 18.07)!;
place.id;                                     // 'sweden:stockholm' — stable; place.country 'SE'
placeById('diyanet:9146');                    // Adana

timesFor(place, '2026-10-15');                // or { year: 2026, month: 10, day: 15 } — January is 1
// {
//   status: 'certified',                     'method-only' outside the certified dates: the method alone,
//                                            on the printed minute all but rarely, never a minute further
//   date: '2026-10-15', certifiedFrom: '2024-01-01', certifiedUntil: '2027-12-31', revision: 1,
//   clock: { zone: 'Europe/Stockholm', offsetMinutes: 120, label: 'Europe/Stockholm' },
//   times: { fajr: { instant: Date, printed: '05:09' }, sunrise: …, dhuhr: …, asr: …, maghrib: …, isha: … }
// }
timesFor(place, '2031-01-01', { strict: true });   // throws UncertifiedMethodError instead
timesFor(place, '2026-10-15', { asrShadow: 2 });   // the Hanafi Asr (the tables print the standard one)
timesForRange(place, '2026-10-01', '2026-10-31');  // a month, one DayTimes per day
candidateTimes(place, '2026-10-15', { corrections: false }); // the formula alone — research
methodInfo('morocco');                        // angles, margins, rounding, revision, certification, sources, spec
```

`printed` is the wall-clock minute on `clock`, which is the clock the
authority prints the day in: the place's zone as kept at noon, or the
table's own clock where it keeps one no zone does (Morocco's GMT+1 until
September 2026; some of Diyanet's). An app shows `printed` and schedules
on `instant`; nothing needs rounding or converting.

## As a server

```sh
npm run serve      # http://localhost:8787
```

```
GET /v1/times?authority=diyanet&lat=41.01&lng=28.98&date=2026-10-15
GET /v1/times?place=algeria:27&from=2026-10-01&to=2026-10-31
GET /v1/nearest?authority=morocco&lat=33.57&lng=-7.59
GET /v1/authority?lat=59.33&lng=18.07
GET /v1/places?authority=indonesia
GET /v1/methods
```

Self-hostable, nothing stored (`tools/serve.ts`).

## In another language

`docs/methods.md` states each method in prose and formulas, and
`test/vectors.json` is a small sample of places, dates and the times to
expect — enough to prove a port matches, too small to be a timetable.

## This repository

```sh
npm install           # NODE_ENV must not be "production", or the dev tools are skipped
npm test              # the library, the schemas, the vectors; the table checks when the tables are present
npm run build         # dist/ (CommonJS and ESM, with types)
npm run verify        # every method against the reference timetables
npm run verify -- morocco indonesia
npm run verify -- --alone   # each method without its correction list
npm run corrections   # rewrites Sweden's correction list (`-- diyanet`, `-- morocco`, … for the others)
npm run certify       # rewrites certification.json — what may be used
npm run certify -- morocco   # just those methods; the others keep their entries
npm run vectors       # rewrites test/vectors.json (after a method revision)
```

The reference timetables are not part of this repository; point
`MIHRAB_TABLES` at them (default `.tables`). Without them `candidateTimes`
still runs, the checks and their tests skip, and `npm run certify` writes
nothing.

## Layout

| Path | What |
|---|---|
| `src/methods/` | The methods: Sweden and Diyanet (`sweden.ts`), Morocco, Algeria, Indonesia; their revisions |
| `src/sun/preciseSun.ts` | VSOP87 apparent sun, after Astronomy Engine: within about 0.05 s and 0.5″ of JPL's DE421 |
| `src/core/` | The calls (`api.ts`), the computation they share (`compute.ts`), dates, clocks, the correction-list index, `fetchLatestCorrections` |
| `src/authorities/` | Each authority's places, at the point (and Morocco's horizon) its method is computed at, with its description |
| `src/index.ts`, `src/<authority>.ts`, `src/locate.ts`, `src/core.ts` | The package's entry points |
| `data/places/`, `data/corrections/`, `data/locate/` | The place lists and fitted points, the correction lists, the country outlines — embedded into the code by `scripts/embed.mjs` at build time |
| `certification.json`, `schemas/` | The 100 % gate's record, and the schemas of the files apps read |
| `tools/verify.ts`, `tools/certify.ts`, `tools/corrections.ts` | The day-by-day check against the timetables; the certification; the correction lists |
| `tools/vectors.ts`, `test/vectors.json`, `docs/methods.md` | For ports: the sample and the written method |
| `tools/serve.ts` | The HTTP server |

## Back into Mihrab

A method that improves here goes back as the same file in Mihrab's
`src/providers/` (and its points file in `src/providers/data/`). The app
reads `certification.json` and the lists from this repository's `main`;
that feed does not change shape between versions (`schemas/`).
