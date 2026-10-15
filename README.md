# mihrab-methods

The prayer-time calculation methods of four national authorities, implemented
to reproduce their official timetables to the minute:

| Authority | Method | On the printed minute | Within a minute | Checked over |
|---|---|---|---|---|
| **Sweden** — Diyanet's method, as used by Islamiska Förbundet | `src/methods/sweden.ts` — the Istanbul congress method as Diyanet computes it | 99.981 % of Diyanet's timetables (1.39 M times, 2024–2027); 99.961 % of Islamiska Förbundet's | 100 % | Oct 2026 → Nov 2027 |
| **Morocco** — Ministry of Habous | `src/methods/morocco.ts` | 98.571 % | 100 % | Oct–Nov 2026, 164 cities |
| **Algeria** — Ministry of Religious Affairs and Wakfs | `src/methods/algeria.ts` | 99.366 % | 100 % | 1448 AH, 68 cities |
| **Indonesia** — Kemenag | `src/methods/indonesia.ts` | 99.965 % | 100 % | Oct–Dec 2026, 517 regencies |

The goal is 100 % on the printed minute, for every time of a full year, for
each method.

## Certification: 100 % or not at all

A method may be used only once it reproduces **every** time of its
authority's timetable on the printed minute — not one minute off, anywhere.
`npm run certify` checks each method day by day and writes
`certification.json`; `timesFor` throws `UncertifiedMethodError` for any
method not certified there. `candidateTimes` runs a method regardless, for
research and for the check itself — not for showing anyone their prayer
times.

Days the timetable itself gets wrong (another town's times under a name, a
previous year's figures for the date, a figure that differs from the
authority's own) are set aside and listed in the record, so each can be
judged.

Today (checked 2026-10-15) **none is certified**:

| Authority | Off the printed minute |
|---|---|
| Sweden | 23 of 59 010 (Islamiska Förbundet); 259 of 1 393 794 (Diyanet) |
| Morocco | 450 of 31 488 |
| Algeria | 642 of 101 184 |
| Indonesia | 94 of 266 772 |

## Use

```sh
npm install           # NODE_ENV must not be "production", or the dev tools are skipped
npm run verify        # every method against the reference timetables
npm run verify -- morocco indonesia
npm run certify       # rewrites certification.json — what may be used
npm test
```

```ts
import { placesOf, timesFor, candidateTimes, isCertified } from './src';
const algiers = placesOf('algeria').find(p => p.name === 'Algiers')!;
isCertified('algeria');               // false today
timesFor(algiers, 2026, 9, 15);       // throws UncertifiedMethodError until it is
candidateTimes(algiers, 2026, 9, 15); // { fajr, sunrise, dhuhr, asr, maghrib, isha } — research only
```

The reference timetables are not part of this repository; point
`MIHRAB_TABLES` at them (default `.tables`). Without them `candidateTimes` still runs, the
checks and their tests skip, and `npm run certify` writes nothing.

## Layout

| Path | What |
|---|---|
| `src/methods/` | The four methods |
| `src/sun/preciseSun.ts` | VSOP87 apparent sun, matching JPL's DE421 to 0.15 s / 1″ |
| `src/places.ts` | Every place with the point (and Morocco's horizon) its method is computed at |
| `src/verify.ts` | Day-by-day comparison with the timetables, to the minute |
| `src/certify.ts`, `src/certification.ts`, `certification.json` | The 100 % gate: the check's record, and what `timesFor` serves |
| `data/places/` | Place lists and the fitted points |

## Back into Mihrab

A method that improves here goes back as the same file in Mihrab's
`src/providers/` (and its points file in `src/providers/data/`).

Licence: AGPL-3.0-or-later, as Mihrab.
