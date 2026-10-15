# mihrab-methods

An open prayer-time API: the calculation methods of the national
authorities, implemented to reproduce their official timetables to the
minute, free for anyone to use. Accurate prayer times shouldn't be something
only a few apps can offer.

Each method is the authority's own formula, worked out again from its
published times, with a small, fixed correction list where the formula alone
lands a hundredth of a second on the wrong side of a minute. The aim is that
any app, site or mosque can give the times its community prays by, without
asking anyone.

Methods today:

| Authority | Method | On the printed minute | Within a minute | Checked over |
|---|---|---|---|---|
| **Sweden** — Diyanet's method, as used by Islamiska Förbundet | `src/methods/sweden.ts` — the Istanbul congress method as Diyanet computes it, with `data/corrections/sweden.json` | **100 %** of Diyanet's timetables (1.39 M times, 2024–2027) and of Islamiska Förbundet's — 99.981 % by the method alone | 100 % | 2024 → 2027 |
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

Today (checked 2026-10-15) **Sweden is certified**, for 2024–2027; the others are not yet:

| Authority | Off the printed minute |
|---|---|
| Sweden | 0 of 59 010 (Islamiska Förbundet); 0 of 1 393 794 (Diyanet) |
| Morocco | 450 of 31 488 |
| Algeria | 642 of 101 184 |
| Indonesia | 94 of 266 772 |

## Formulas and correction lists: why this can be used freely

Under EU and Swedish law, this approach is lawful use and "insubstantial
extraction": an unprotected mathematical formula, worked out from published
times, plus a very small, static list of factual data points that fixes edge
cases.

- **The methods are formulas.** A method of calculation is not protected as
  such. What is here is the arithmetic: the sun's position, the angles, the
  margins and the high-latitude rules each authority applies. It is written
  from scratch, not copied.
- **The correction lists are microscopically small and static.** Each one
  holds only the few times where the authority's own rounding falls the
  other way: a point, a date, a prayer, a minute either way. Sweden's is 270
  entries against 1.39 million times (0.02 %). The aim is the same for every
  method: get the formula as close as possible, so the list that remains is
  insubstantial.
- **No timetable is part of this repository.** It holds no copy of any
  authority's tables. The times are computed, for any date and any point.

This is the project's position, not legal advice. The same rule applies to
every method added here: the best formula first, and a correction list only
for what is left.

## Sweden's correction list

The method reproduces Diyanet's computation; what it cannot reproduce is the
arithmetic of Diyanet's program, which puts about one time in five thousand on
the other side of a minute's rounding point — a hundredth of a second away,
independently from place to place and day to day. `data/corrections/sweden.json`
lists those times (point, date, prayer, a minute either way: 270 over
2024–2027) and `candidateTimes` applies them. The list covers the years the
timetables do, and certification holds over those dates only: `timesFor`
refuses a date outside them. Each year, once the next year's timetables are
out:

```sh
npm run corrections && npm run certify
```

## Use

```sh
npm install           # NODE_ENV must not be "production", or the dev tools are skipped
npm run verify        # every method against the reference timetables
npm run verify -- morocco indonesia
npm run corrections   # rewrites Sweden's correction list from the timetables
npm run certify       # rewrites certification.json — what may be used
npm test
```

```ts
import { placesOf, timesFor, candidateTimes, isCertified } from './src';
const algiers = placesOf('algeria').find(p => p.name === 'Algiers')!;
isCertified('sweden');                // true, for 2024–2027
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
| `src/corrections.ts`, `src/methods/swedenCorrections.ts`, `data/corrections/sweden.json` | Sweden's correction list: written from the timetables, applied by `candidateTimes` |
| `data/places/` | Place lists and the fitted points |

## Back into Mihrab

A method that improves here goes back as the same file in Mihrab's
`src/providers/` (and its points file in `src/providers/data/`).

Licence: AGPL-3.0-or-later, as Mihrab.
