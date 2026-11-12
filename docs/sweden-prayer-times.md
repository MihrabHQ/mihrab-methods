---
title: Accurate prayer times in Sweden for apps – bönetider that match the mosques
description: Prayer times for Swedish towns that match the timetables Swedish mosques follow, including the summer nights when twilight never ends. An open-source library and API for Swedish Muslim apps and websites.
permalink: /sweden-prayer-times/
---

# Accurate prayer times in Sweden

Sweden is one of the harder places on Earth to calculate prayer times for.
In Stockholm the sky never gets fully dark for weeks around midsummer; in
the north the sun barely sets. A plain angle calculation gives no Isha at
all on those nights, or an Isha after midnight followed by a Fajr an hour
later — and every app solves it differently, which is why two apps in the
same Swedish city can be half an hour apart in June.

Swedish mosques do not improvise. Most follow a published timetable —
*bönetider* — and that is what a Swedish app has to match.

## What Mihrab Methods matches in Sweden

| Timetable | Places | Times compared | Off the printed minute | Dates |
|---|---:|---:|---:|---|
| Islamiska Förbundet's | <!--fig:sweden.check0.places-->107<!--/fig--> | <!--fig:sweden.check0.times-->63,114<!--/fig--> | <!--fig:sweden.check0.off-->0<!--/fig--> | <!--fig:sweden.check0.span-->11 Oct 2026 → 14 Dec 2027<!--/fig--> |
| Diyanet's tables for Swedish towns | <!--fig:sweden.check1.places-->159<!--/fig--> | <!--fig:sweden.check1.times-->1,393,794<!--/fig--> | <!--fig:sweden.check1.off-->0<!--/fig--> | <!--fig:sweden.check1.span-->1 Jan 2024 → 31 Dec 2027<!--/fig--> |

Both are the same method: the one agreed at the 2021 Istanbul prayer times
congress and used by Diyanet, which Islamiska Förbundet's Swedish
timetable follows. Details of that timetable, and what was set aside in
comparing it, are on the
[Islamiska Förbundet page](islamiska-forbundet-prayer-times.md).

## The summer nights

When the 18° dawn stops forming, the method does not switch to an
arbitrary rule on an arbitrary date. It carries forward the share of the
night that Fajr and Isha took on the last night twilight did end, eases
into and out of that season over a gradual transition, and never lets the
day or the night be shorter than five hours. The result changes smoothly
from day to day through the whole summer — the property a timetable needs
and a naive calculation lacks.

```ts
import { nearestPlace, timesForRange } from 'mihrab-methods/sweden';

const { place } = nearestPlace('sweden', 65.58, 22.15)!;      // Luleå
for (const day of timesForRange(place, '2027-06-18', '2027-06-24')) {
  console.log(day.date, day.times!.maghrib.printed, day.times!.isha.printed, day.times!.fajr.printed);
}
```

## In an app

```ts
import { nearestPlace, timesFor } from 'mihrab-methods/sweden';

const { place, distanceKm } = nearestPlace('sweden', 59.33, 18.07)!;
place.id;                                        // 'sweden:stockholm'
const day = timesFor(place, '2026-11-12');
day.clock.zone;                                  // 'Europe/Stockholm' — summer time is already in the answer
day.times!.dhuhr.printed;
```

The times are a listed town's, not interpolated for the user's exact
coordinates: `distanceKm` tells you how far the town is, so an app can say
which town's times it is showing. `mihrab-methods/sweden` bundles only the
Swedish places.

Without installing anything:

```
GET https://mihrab-api.elghamri.se/v1/times?lat=57.71&lng=11.97&date=2026-11-12
```

## Things to know

- **Asr** is the one-shadow-length Asr the timetable prints; ask for the
  Hanafi one with `{ asr: 'hanafi' }`.
- **A mosque with its own timetable.** Some Swedish mosques print times
  that differ from the national timetables. The library matches the
  published national ones; a per-mosque difference is an offset an app
  applies on top.
- **Dates.** Answers are verified over the dates in the table above and
  marked `method-only` beyond them; the span is extended as new
  timetables are published.

Mihrab Methods is independent of Islamiska Förbundet and of Diyanet.

More: [Islamiska Förbundet prayer times](islamiska-forbundet-prayer-times.md) ·
[Diyanet's method](diyanet-prayer-time-calculation.md) ·
[verification](verification.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
