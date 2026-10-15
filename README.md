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
| **Diyanet** — Türkiye and worldwide | `src/methods/sweden.ts` with Isha's angle by country (16° or 17°), a point per prayer per year in Türkiye, with `data/corrections/diyanet.json` | **100 %** of Diyanet's timetables for all 880 districts of Türkiye and Northern Cyprus and 184 places in about 95 countries (8.06 M times) | 100 % | 2024 → 2027 |
| **Morocco** — Ministry of Habous | `src/methods/morocco.ts` — each city's own sunrise and Maghrib horizon, the sun's semidiameter by its distance, the tables' own clock (GMT+1 until 17 Sep 2026), with `data/corrections/morocco.json` | **100 %** of the ministry's tables for its 164 located cities (75 768 times) — 99.122 % by the method alone | 100 % | 27 Aug → 11 Nov 2026 |
| **Algeria** — Ministry of Religious Affairs and Wakfs | `src/methods/algeria.ts`, with `data/corrections/algeria.json` | **100 %** of the ministry's 1448 AH table for its 68 cities (101 184 times) — 99.366 % by the method alone | 100 % | 1 Oct 2026 → 5 Jun 2027 |
| **Indonesia** — Kemenag | `src/methods/indonesia.ts`, with `data/corrections/indonesia.json` | **100 %** of the ministry's tables for all 517 regencies and cities (266 772 times) — 99.969 % by the method alone | 100 % | 7 Oct → 31 Dec 2026 |

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

Today (checked 2026-10-15) **every method is certified**: Sweden and Diyanet for 2024–2027, and Morocco, Algeria and Indonesia for the tables published so far:

| Authority | Off the printed minute |
|---|---|
| Sweden | 0 of 59 640 (Islamiska Förbundet); 0 of 1 393 794 (Diyanet) |
| Diyanet (Türkiye and worldwide) | 0 of 8 059 932 |
| Morocco | 0 of 75 768 |
| Algeria | 0 of 101 184 |
| Indonesia | 0 of 266 772 |

## Status

| Method | Where it stands |
|---|---|
| Sweden | Certified, 2024–2027. |
| Diyanet | Certified, 2024–2027, for every district of Türkiye and Northern Cyprus and 184 places abroad. Diyanet lists 8 528 places in 202 countries; the rest of them abroad (about 7 300) are being added as their tables are checked — 2026 first. Not yet included: Grozny (Diyanet serves no table for it). |
| Morocco | Certified for 27 Aug → 11 Nov 2026 (164 cities): the method gives 99.12 % alone, and a list of 665 corrections the rest. Each newly published month is checked and its few corrections added. |
| Algeria | Certified for 1448 AH (1 Oct 2026 → 5 Jun 2027, 68 cities): the method gives 99.37 % alone, and a list of 642 corrections the rest. The method is at its limit: the angles, horizon, Maghrib margin, rounding, sun series, iterations and city points are each sharp optima, and the 642 are independent sub-second differences (no pattern by prayer, city, date or season; refitting the points to them only fits noise, and is worse on days held out). |
| Indonesia | Certified for 7 Oct → 31 Dec 2026 (517 regencies and cities): the method gives 99.969 % alone, and a list of 84 corrections the rest. Karawang's Asr, Maghrib and Isha are computed at a second point, about 2 km north-east of its first (its afternoon fits it, and it holds on days held out). The 84 are independent differences of under a second at a minute's edge — eight at Sibolga, whose mornings no point fits — and refitting points to them only fits noise. Each newly published month is checked and its corrections added. |

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

## Sweden's and Diyanet's correction lists

The method reproduces Diyanet's computation; what it cannot reproduce is the
arithmetic of Diyanet's program, which puts about one time in five thousand on
the other side of a minute's rounding point — a hundredth of a second away,
independently from place to place and day to day. `data/corrections/sweden.json`
lists those times (point, date, prayer, a minute either way: 270 over
2024–2027) and `candidateTimes` applies them. The list covers the years the
timetables do, and certification holds over those dates only: `timesFor`
refuses a date outside them. Diyanet's worldwide list
(`data/corrections/diyanet.json`) is the same kind: 765 entries against
8.06 million times. Each year, once the next year's timetables are out:

```sh
npm run corrections && for a in diyanet morocco algeria indonesia; do npm run corrections -- $a; done && npm run certify
```

What Diyanet's worldwide tables add to the Swedish method:

- **Isha by country:** 16° (the Congress's) in most of Europe, Russia,
  Ukraine, Belarus, Kazakhstan, Mongolia, China, the United States and
  Canada; 17° elsewhere. The high-latitude rules are worked at 16° either way.
- **The takdir at midsummer:** where the dawn forms all summer but midsummer's
  true Isha falls later than the share carried from that night, midsummer is
  the takdir's day, with the twenty-minute ramps (from about 44.4° north).
- **Türkiye's districts:** each prayer is computed at a point of its own in the
  district, and the points move by a few thousandths of a degree from one
  year's tables to the next (`data/places/diyanetTurkeyPoints.json`, a point
  per prayer per year; Northern Cyprus the same).
- **Past local midnight:** where the first true dawn after the summer gap falls
  before local midnight on the table's clock (far east of a zone's meridian,
  as at Aihui in China), there is no transition: the gap's last day is printed
  twenty minutes after the takdir and the true times follow.
- **Tables on their own clocks:** a few of Diyanet's tables are printed on a
  clock no time zone keeps — Alberta's keep summer time from 2026 on,
  Acámbaro's had it in 2025 only, Alchevsk's are Moscow time with summer time.
  For those the table's clock is read off the table itself (`clock` in
  `data/places/diyanetWorldPoints.json`); the instants are the method's.
- **The day's clock:** a table prints the whole day in the clock kept at noon,
  so on the morning the clocks go forward a Fajr before the change is printed
  in the new time.

## Keeping an app current

`certification.json` is meant to be read by apps. For each authority it
says whether the method is certified, the method's `revision`
(`src/methods/revisions.ts`) and the correction list it certifies
(`corrections`: the dates it covers and how many times it moves):

```json
"morocco": { "certified": true, "revision": 1,
             "corrections": { "from": "2026-08-27", "to": "2026-11-11", "entries": 665 }, … }
```

An app that computes revision 1 can take any newer list certified for
revision 1 straight from `data/corrections/<authority>.json` (check that
the file matches what the certification names) — no release needed. A
higher revision means the method itself changed and its lists no longer
fit the older code: the app should ask its user to update. `certified:
false` means the authority has published tables the method is not yet on
every minute of. Past a list's `to`, the method alone applies.

The revision is raised whenever a change to a method or to its places'
points changes what it prints; `npm test` fails until certification.json
names the current revision and list.

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
