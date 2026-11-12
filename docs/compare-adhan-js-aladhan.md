---
title: Mihrab Methods vs Adhan JS vs AlAdhan – choosing a prayer time library or API
description: An honest comparison of Mihrab Methods, Adhan JS and the AlAdhan API - what each computes, where each is the right choice, and what Mihrab Methods does not do.
permalink: /compare-adhan-js-aladhan/
---

# Mihrab Methods, Adhan JS and AlAdhan

Three open-source ways to get prayer times into an app. They answer
different questions, and the right choice depends on which question your
users are asking.

- [**Adhan JS**](https://github.com/batoulapps/adhan-js) is a calculation
  library: give it coordinates, a date and a set of parameters, and it
  computes the times on the device.
- [**AlAdhan**](https://aladhan.com/prayer-times-api) is a free hosted API:
  the same kind of calculation, by coordinates, city or address, over
  HTTP.
- **Mihrab Methods** is a library (and an API) that reproduces the
  timetables specific Islamic authorities publish, and is checked against
  them time by time.

## The short answer

| If you need… | Use |
|---|---|
| Times anywhere on Earth from coordinates, with parameters you control | Adhan JS (offline) or AlAdhan (HTTP) |
| Per-prayer minute offsets, a choice of high-latitude rule, your own angles | Adhan JS or AlAdhan |
| Qibla direction, Hijri dates, midnight and the night's thirds | Adhan JS (qibla, sunnah times) or AlAdhan (qibla, calendar) |
| Times that are the same minute as the timetable a country's authority prints | Mihrab Methods, for the authorities it covers |
| A statement, per answer, of whether it was compared with a published timetable | Mihrab Methods |
| Both | Mihrab Methods where an authority is covered, a convention elsewhere — its own `standardTimes`, or Adhan JS alongside it |

## What differs

| | Adhan JS | AlAdhan | Mihrab Methods |
|---|---|---|---|
| Form | Library | Hosted HTTP API | Library, and a hosted HTTP API |
| Runs offline | Yes | No | Yes (the library) |
| Where it answers | Any coordinates | Any coordinates, city or address | The places each covered authority lists; any coordinates by five standard conventions |
| What a "method" is | A named set of parameters: two angles, some with fixed offsets | The same, selected by `method` number | An authority's whole procedure: its sun, angles, margins, rounding, reference points and high-latitude rule |
| Held to published timetables | Not stated in its documentation | Not stated in its documentation | Every time of every place and day the authority has published; included only at zero off — [details](verification.md) |
| Asr | Shafi or Hanafi | `school` parameter | The timetable's own by default; Shafi'i or Hanafi on request |
| Per-prayer offsets | Yes (`adjustments`) | Yes (`tune`) | No |
| High-latitude rule | Your choice of several | Your choice (`latitudeAdjustmentMethod`) | The authority's own rule, where it has one; none for the standard conventions |
| Other features | Qibla, sunnah times (midnight, last third of the night) | Qibla and Hijri calendar, as separate APIs | None of these |
| Languages | JavaScript/TypeScript; sibling implementations in other languages | Any, over HTTP | TypeScript/JavaScript, Python, Swift, Kotlin, Dart; any over HTTP |
| Licence | MIT | Free to call | MPL-2.0 |

Facts about Adhan JS are from its
[README and methods guide](https://github.com/batoulapps/adhan-js) (version
4.4.4), and about AlAdhan from its
[API pages](https://aladhan.com/prayer-times-api) and its own list of
methods, as read in November 2026. If something here is out of date,
[say so](https://github.com/MihrabHQ/mihrab-methods/issues) and it will be
corrected.

## Why the same "method" can give different minutes

All three know a method called something like "Turkey" or "Diyanet",
"Morocco", "Kuwait" or "Indonesia". In Adhan JS and AlAdhan that name
selects parameters: a Fajr angle, an Isha angle, sometimes a few fixed
minutes. Both are open about what that is — Adhan JS's guide describes its
Turkey method as an approximation of Diyanet's, and AlAdhan's own list
labels its Diyanet and Dubai entries "experimental".

A national timetable is produced by more than two angles: which formula
for the sun and at what moment of the day it is evaluated, margins that
differ per prayer, the direction each time is rounded, the exact point
each town is computed at, and what is printed on summer nights at high
latitude. With the angles right and the rest generic, a calculation
agrees with the timetable on many days and is a minute or more away on
others — how often depends on the country, the town and the season.

Mihrab Methods implements those remaining details for each authority it
covers and keeps a method only when nothing is off. That is the whole of
its advantage, and it is also its limit: it has nothing to say about a
country whose authority it has not reproduced.

It is easy to check which matters for your users: take a week of the
timetable their mosque follows and compare it with each library's output
for the same town.

## What Mihrab Methods does not do

- **It does not compute an authority's times at arbitrary coordinates.**
  It answers for the towns the authority lists and tells you the distance
  to the nearest.
- **It has no per-prayer offsets.** A mosque that adds its own minutes is
  an adjustment your app applies on top.
- **It covers <!--fig:total.methods-->21<!--/fig--> authorities' methods,
  not the world.** Elsewhere it offers five standard conventions (MWL,
  ISNA, Egypt, Karachi, Umm al-Qura) without margins or a high-latitude
  rule; Adhan JS and AlAdhan offer more conventions and more control.
- **No qibla, no Hijri calendar, no midnight or night-thirds.**
- **Verified dates end.** Beyond the dates compared, an answer is marked
  `method-only`.

## Using them together

Nothing stops an app from using more than one. A common arrangement:

```ts
import { defaultAuthorityFor } from 'mihrab-methods/locate';
import { nearestPlace, timesFor } from 'mihrab-methods';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

function prayerTimes(lat: number, lng: number, date: Date) {
  const authority = defaultAuthorityFor(lat, lng);
  const found = authority && nearestPlace(authority, lat, lng);
  if (found) {
    // An authority publishes for this point: its own timetable's times.
    const civil = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    return { source: authority, day: timesFor(found.place, civil) };
  }
  // Nowhere covered: a convention at the exact coordinates, with your own parameters.
  const params = CalculationMethod.MuslimWorldLeague();
  return { source: 'calculated', day: new PrayerTimes(new Coordinates(lat, lng), date, params) };
}
```

`nearestPlace(authority, lat, lng, { maxKm: 50 })` returns null beyond a
distance, if you would rather fall back than use a far town.

## Moving from Adhan JS or AlAdhan

| You have | In Mihrab Methods |
|---|---|
| `new PrayerTimes(coordinates, date, params)` | `timesFor(nearestPlace(authority, lat, lng).place, 'YYYY-MM-DD')` |
| `CalculationMethod.Turkey()` / `method=13` | `'diyanet'` (or `'sweden'`, `'turkiyetakvimi'`) |
| `CalculationMethod.Qatar()`, `.Kuwait()`, `.Dubai()` / `method=10`, `9`, `16` | `'qatar'`, `'kuwait'`, `'uae'` |
| `method=21`, `19`, `20`, `18`, `23`, `5`, `7` | `'morocco'`, `'algeria'`, `'indonesia'`, `'tunisia'`, `'jordan'`, `'egypt'`, `'tehran'` |
| `Madhab.Hanafi` / `school=1` | `{ asr: 'hanafi' }` |
| `prayerTimes.fajr` (a `Date`) | `day.times.fajr.instant` (a `Date`) and `.printed` (`'HH:MM'` on the timetable's clock) |
| `adjustments` / `tune` | Not available: apply offsets to `instant` yourself |
| MWL, ISNA, Egyptian, Karachi, Umm al-Qura as conventions | `standardTimes({ lat, lon, date, tz, convention })` |

An authority's times in Mihrab Methods are for its listed towns, so the
first line is a change of meaning as well as of syntax: read
[calculation methods compared](prayer-time-calculation-methods.md) before
switching.

More: [verification](verification.md) ·
[JavaScript library](javascript-prayer-time-library.md) ·
[prayer time API](prayer-time-api.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
