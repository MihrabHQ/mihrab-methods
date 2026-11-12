---
title: Islamiska Förbundet prayer times in code – matching the Swedish bönetider timetable
description: Reproduce the prayer times of Islamiska Förbundet's Swedish timetable by calculation, to the printed minute, for its towns - an open-source library and free API, with exactly what was compared and what was set aside.
permalink: /islamiska-forbundet-prayer-times/
---

# Islamiska Förbundet prayer times

Islamiska Förbundet i Sverige publishes the prayer timetable — *bönetider* —
that many Swedish mosques and households follow. If you are building an
app or a mosque screen for Swedish Muslims, these are the times your users
compare yours against.

Mihrab Methods gives the same times by calculation. It does not take them
from Islamiska Förbundet's website or any service of theirs, and it works
without a network connection.

```ts
import { nearestPlace, timesFor } from 'mihrab-methods/sweden';

const { place } = nearestPlace('sweden', 55.60, 13.00)!;   // Malmö
const day = timesFor(place, '2026-11-12');
day.status;                 // 'certified' inside the dates compared
day.times!.fajr.printed;    // 'HH:MM', Swedish clock time
day.times!.isha.printed;
```

```
GET https://mihrab-api.elghamri.se/v1/times?authority=sweden&lat=55.60&lng=13.00&date=2026-11-12
```

## What was compared

| | |
|---|---|
| Towns of Islamiska Förbundet's timetable | <!--fig:sweden.check0.places-->107<!--/fig--> |
| Times compared | <!--fig:sweden.check0.times-->63,114<!--/fig--> |
| Off the printed minute | <!--fig:sweden.check0.off-->0<!--/fig--> |
| Dates | <!--fig:sweden.check0.span-->11 Oct 2026 → 14 Dec 2027<!--/fig--> |

The match is to the minute, for all six times of the day: Fajr, sunrise,
Dhuhr, Asr, Maghrib and Isha.

## Where the timetable's times come from

Islamiska Förbundet's Swedish timetable follows the method of the 2021
Istanbul prayer times congress — the one Diyanet computes by — and its
rows are the rows of Diyanet's tables for the same Swedish towns. So the
library checks the Swedish method twice: against Islamiska Förbundet's
timetable, and against Diyanet's own tables for
<!--fig:sweden.check1.places-->159<!--/fig--> Swedish places over
<!--fig:sweden.check1.span-->1 Jan 2024 → 31 Dec 2027<!--/fig-->
(<!--fig:sweden.check1.times-->1,393,794<!--/fig--> times,
<!--fig:sweden.check1.off-->0<!--/fig--> off).

What the method does — the 18° Fajr, the 16° Isha, the precautionary
minutes, and the rule for summer nights without darkness — is on the
[Diyanet method page](diyanet-prayer-time-calculation.md) and, formula by
formula, in [the methods reference](methods.md#sweden-and-diyanet).

## What was set aside, and why

A comparison is only worth something if it says what it left out. Two
kinds of entries in the published timetable were not counted:

- **<!--fig:sweden.check0.sourceFaults-->35,491<!--/fig--> times that differ from
  Diyanet's own table for the same town and day.** In the published
  timetable the following year's rows repeat the current year's figures,
  while Diyanet's table for that year has its own. On those days the
  library gives Diyanet's table, and the difference is counted neither as
  a match nor as a miss.
- **<!--fig:sweden.check0.copiedRows-->696<!--/fig--> rows copied from another
  day.**

Both are recorded per check in
[certification.json](https://github.com/MihrabHQ/mihrab-methods/blob/main/certification.json)
and explained in [where each method stands](status.md#sweden). If your
users see a difference from the printed timetable on a particular day,
this is the first place to look — and
[a report](https://github.com/MihrabHQ/mihrab-methods/issues/new?template=times-differ.yml)
with the town, date, prayer and printed time is welcome.

## Practical notes

- **Towns.** `nearestPlace('sweden', lat, lng)` returns the nearest listed
  town and its distance. Times are that town's; they are not recomputed
  for the user's own coordinates, because the timetable is not.
- **Clock.** Answers are on Swedish clock time, summer time included.
- **Beyond the dates compared**, an answer is marked `method-only`: the
  same calculation, not yet compared with a published timetable.
- **Python, Swift, Kotlin, Dart:** the same method is in each port —
  [examples](examples.md).

Mihrab Methods is an independent open-source project. It is not affiliated
with, endorsed by or speaking for Islamiska Förbundet, and it does not
copy or redistribute its timetable. [Why this can be used freely](legal.md).

More: [prayer times in Sweden](sweden-prayer-times.md) ·
[verification](verification.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
