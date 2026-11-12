---
title: Diyanet prayer time calculation – reproducing Diyanet's namaz vakitleri
description: How Diyanet calculates prayer times, and an open-source library that reproduces Diyanet's published timetables to the minute for places in Türkiye and worldwide - angles, temkin, high-latitude rules and Türkiye's district points.
permalink: /diyanet-prayer-time-calculation/
---

# Diyanet prayer time calculation

Türkiye's Presidency of Religious Affairs (Diyanet İşleri Başkanlığı)
publishes prayer times — *namaz vakitleri* — for every district of Türkiye
and for thousands of towns abroad. Mosques across Türkiye, and the Turkish
diaspora in Europe, pray by them.

Mihrab Methods reproduces those timetables by calculation:
<!--fig:diyanet.places-->8,318<!--/fig--> places,
<!--fig:diyanet.times-->71,630,078<!--/fig--> times compared over
<!--fig:diyanet.span-->1 Jan 2024 → 31 Dec 2027<!--/fig-->, <!--fig:diyanet.off-->0<!--/fig--> off
the printed minute.

```ts
import { nearestPlace, timesFor } from 'mihrab-methods/diyanet';

const { place } = nearestPlace('diyanet', 41.01, 28.98)!;   // Istanbul's district
const day = timesFor(place, '2026-10-15');
day.times!.fajr.printed;      // İmsak as Diyanet's table prints it
day.times!.maghrib.printed;   // Akşam
```

Over HTTP: `GET https://mihrab-api.elghamri.se/v1/times?authority=diyanet&lat=41.01&lng=28.98&date=2026-10-15`
([prayer time API](prayer-time-api.md)).

## Why "Diyanet method" presets are a few minutes off

Many libraries offer a "Diyanet" or "Turkey" preset: Fajr 18°, Isha 17°,
and an offset or two. Diyanet's timetable is more than that, and the
differences are what an app's users notice:

- **Temkin.** Dhuhr is five minutes after the sun's transit; Asr is four
  minutes late; sunrise is seven minutes early and Maghrib seven minutes
  late.
- **Isha by country.** 17° in Türkiye and most of the world; 16° (the 2021
  Istanbul congress's angle) in most of Europe, Russia, Ukraine, Belarus,
  Kazakhstan, Mongolia, China, the United States and Canada.
- **The sun, once a day.** The sun's position is taken once per day, not
  per prayer, and coordinates are kept to three decimals of a degree.
- **Türkiye's districts.** Each prayer in a district is computed at a point
  of its own, and those points move slightly from one year's tables to the
  next.
- **High latitudes.** Where the 18° dawn does not form in summer, the share
  of the night it took on the last day it did is carried forward
  (*takdir*), with a gradual twenty-minute transition into and out of the
  season, and neither day nor night is shorter than five hours.
- **Tables on their own clocks.** Some of Diyanet's tables are printed on a
  clock other than the place's time zone (Xinjiang on Beijing time, for
  one). The library reports that clock with every answer.

Each of these is implemented and described, formula by formula, in
[the methods reference](methods.md#sweden-and-diyanet) and in
[what Diyanet's worldwide tables add](diyanet.md).

## How close is close

By the formula alone, <!--fig:diyanet.alonePct-->99.987<!--/fig--> % of the
compared times land on Diyanet's printed minute. The rest — the method
is never more than a minute from them — are times where Diyanet's own
arithmetic falls a fraction of a second on the other side of a rounding
point. Those <!--fig:diyanet.corrections-->9,101<!--/fig--> times are listed in
a correction list the library applies, and with it the result is
<!--fig:diyanet.off-->0<!--/fig--> off.

Outside the dates compared (<!--fig:diyanet.span-->1 Jan 2024 → 31 Dec 2027<!--/fig-->), an answer
is marked `status: 'method-only'`: the formula without the list.

## Also built on Diyanet's method

- **Sweden.** Islamiska Förbundet's Swedish timetable follows Diyanet's
  method: [prayer times in Sweden](sweden-prayer-times.md).
- **Türkiye Takvimi** is a different calculation with its own margins and
  is a separate method here (`mihrab-methods/turkiyetakvimi`).

## In other languages

The same method is available in Python (`pip install mihrab-methods`),
Swift, Kotlin and Dart: [examples](examples.md).

Mihrab Methods is independent and not affiliated with or endorsed by
Diyanet. It matches the timetables Diyanet publishes; it does not copy or
redistribute them. [Why this can be used freely](legal.md).

More: [verification](verification.md) ·
[calculation methods compared](prayer-time-calculation-methods.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
