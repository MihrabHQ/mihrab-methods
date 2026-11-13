---
title: Prayer time calculation methods compared – authorities and conventions
description: Which prayer time calculation method should an app use? The difference between angle conventions (MWL, ISNA, Egypt, Karachi, Umm al-Qura) and the methods national Islamic authorities actually publish by, with the authorities Mihrab Methods reproduces.
permalink: /prayer-time-calculation-methods/
---

# Prayer time calculation methods

Two different things are called a "calculation method", and the difference
is why two apps disagree by a few minutes in the same city.

## A convention: two angles

The well-known named methods are **conventions**: a twilight angle for Fajr
and one for Isha (or a fixed interval), applied to the plain astronomical
calculation.

| Convention | Fajr | Isha |
|---|---|---|
| Muslim World League (`mwl`) | 18° | 17° |
| Islamic Society of North America (`isna`) | 15° | 15° |
| Egyptian General Authority of Survey (`egypt`) | 19.5° | 17.5° |
| University of Islamic Sciences, Karachi (`karachi`) | 18° | 18° |
| Umm al-Qura University, Makkah (`ummalqura`) | 18.5° | 90 minutes after Maghrib |

A convention answers anywhere on Earth, and it is the right tool where no
authority publishes a timetable. It is not what a national authority's
timetable is computed with.

## An authority's method: everything else

The timetable a country's mosques follow is produced by a specific
procedure. Besides the angles it has:

- **precautionary margins** (*temkin*, *ihtiyat*): Dhuhr a few minutes
  after transit, Maghrib a few after sunset, sunrise a few early;
- **its own sun**: which ephemeris, and at what moment of the day it is
  evaluated — once at midnight UT, at local noon, per prayer;
- **its own rounding**: to the nearest minute, always up, up for some
  prayers and down for others;
- **reference points**: the coordinates each town is computed at, sometimes
  a different point per prayer, sometimes with the horizon's dip for
  altitude;
- **high-latitude rules**: what is printed when twilight does not end in
  summer;
- **the Asr it prints**: one shadow length (Shafi'i, Maliki, Hanbali) or
  two (Hanafi);
- **the clock it prints in**, which is not always the place's time zone.

Get the angles right and the rest wrong, and the result is within a minute
or two of the timetable on most days and several minutes off on some.
"A minute or two" is the difference between a fast that is valid and one
that is not, so the mosque's timetable is what people trust.

Mihrab Methods implements each authority's **whole procedure**, and keeps a
method only when it lands on the printed minute for every time of every
day the authority has published. Each method is written out in words and
formulas in [the methods reference](methods.md).

## The authorities reproduced

<!-- certification-table:start -->

| Authority | Tables matched | Places | Times checked | Off the printed minute | By the method alone | Correction entries | Checked over |
|---|---|---:|---:|---:|---:|---:|---|
| **Sweden** | Islamiska Förbundet’s tables | 107 | 63,114 | **0** | 99.968 % | 270 | 11 Oct 2026 → 14 Dec 2027 |
|  | Diyanet’s own tables | 159 | 1,393,794 | **0** | 99.981 % |  | 1 Jan 2024 → 31 Dec 2027 |
| **Diyanet** | its tables worldwide | 8,318 | 71,630,078 | **0** | 99.987 % | 9,101 | 1 Jan 2024 → 31 Dec 2027 |
| **Morocco** | Habous | 164 | 94,350 | **0** | 99.885 % | 108 | 27 Aug 2026 → 30 Nov 2026 |
| **Algeria** | Ministry of Religious Affairs | 68 | 101,184 | **0** | 99.365 % | 642 | 1 Oct 2026 → 5 Jun 2027 |
| **Indonesia** | Kemenag | 517 | 362,934 | **0** | 99.935 % | 234 | 7 Oct 2026 → 31 Jan 2027 |
| **Türkiye Takvimi** | its cities’ years | 821 | 1,812,768 | **0** | 99.952 % | 860 | 31 Dec 2025 → 2 Jan 2027 |
| **Kazakhstan** | the Spiritual Administration’s times | 84 | 551,880 | **0** | 100.000 % | 0 | 1 Jan 2025 → 31 Dec 2027 |
| **Egypt** | the Survey Authority’s times | 77 | 168,630 | **0** | 99.373 % | 1,056 | 1 Jan 2026 → 31 Dec 2026 |
| **Brunei** | the Ministry’s times | 4 | 17,064 | **0** | 99.671 % | 56 | 9 Jan 2025 → 31 Dec 2026 |
| **Qatar** | the Calendar House’s times | 1 | 720 | **0** | 96.250 % | 27 | 16 Jun 2026 → 12 Nov 2026 |
| **Kuwait** | the Ministry’s table | 46 | 201,480 | **0** | 95.205 % | 9,660 | 1 Jan 2026 → 31 Dec 2027 |
| **Jordan** | the Ministry’s times | 17 | 37,230 | **0** | 98.380 % | 603 | 1 Jan 2026 → 31 Dec 2026 |
| **Tatarstan** | the Administration’s timetable | 44 | 96,360 | **0** | 98.071 % | 1,858 | 1 Jan 2026 → 31 Dec 2026 |
| **Russia (Central Muftiate)** | the Central Muftiate’s timetables | 18 | 39,342 | **0** | 99.877 % | 48 | 1 Jan 2026 → 31 Dec 2026 |
| **Albania** | the Community’s calendar | 22 | 48,180 | **0** | 98.082 % | 924 | 1 Jan 2026 → 31 Dec 2026 |
| **Bulgaria** | the Grand Mufti’s Office’s timetable | 48 | 105,120 | **0** | 97.671 % | 2,448 | 1 Jan 2026 → 31 Dec 2026 |
| **Pakistan (Banuri Town)** | Jamia Banuri Town’s timetable | 100 | 219,000 | **0** | 99.996 % | 8 | 1 Jan 2026 → 31 Dec 2026 |
| **United Arab Emirates** | the Authority’s times | 41 | 179,580 | **0** | 98.221 % | 3,036 | 1 Jan 2026 → 31 Dec 2027 |
| **Iran (Tehran Institute of Geophysics)** | the Institute of Geophysics’ sheets | 31 | 90,520 | **0** | 99.002 % | 903 | 21 Mar 2025 → 20 Mar 2027 |
| **United Kingdom (Wifaqul Ulama)** | Wifaqul Ulama’s timetables | 81 | 350,400 | **0** | 98.625 % | 4,641 | 1 Jan 2026 → 31 Dec 2027 |
| **Tunisia** | the Institute’s times | 26 | 94,855 | **0** | 97.727 % | 2,156 | 1 Jan 2025 → 31 Dec 2026 |

21 of 21 methods certified; 0 of 77,658,583 times off the printed minute. Last checked 13 November 2026. Generated from [`certification.json`](https://github.com/MihrabHQ/mihrab-methods/blob/main/certification.json) by `scripts/readme.mjs`.

<!-- certification-table:end -->

"By the method alone" is the formula with nothing added. The remaining
fraction is rounding: times where the authority's own arithmetic falls a
fraction of a second on the other side of a minute. Those are listed, one
by one, in a small correction list per authority, and with it the method
is at zero off. [How this is verified, and its limits](verification.md).

## Choosing one in code

```ts
import { defaultAuthorityFor } from 'mihrab-methods/locate';
import { nearestPlace, timesFor, methodInfo } from 'mihrab-methods';
import { standardTimes } from 'mihrab-methods/standard';

const authority = defaultAuthorityFor(lat, lng);   // the authority that publishes for this point, or null
if (authority) {
  const { place } = nearestPlace(authority, lat, lng)!;
  timesFor(place, date);                            // that authority's method
  methodInfo(authority);                            // its angles, margins, rounding, sources
} else {
  standardTimes({ lat, lon: lng, date, tz, convention: 'mwl' });   // a convention, marked 'calculated'
}
```

### Asr: Shafi'i or Hanafi

Each timetable prints one Asr, and `timesFor` gives that one by default.
Ask for the other by name with `{ asr: 'hanafi' }` or `{ asr: 'shafii' }`;
`asrShadow` on the answer says which came back (1 or 2 shadow lengths).
An Asr the timetable does not print is computed by the same method but was
not checked against a printed column, and its `basis` says so
(`'unchecked'`).

### What is not here

No method for an authority is included until it reaches zero off, so some
countries are absent. Saudi Arabia's Umm al-Qura calendar, for one, is
available as a convention (above) but not as a verified authority method.
[Where each method stands](status.md) lists what is covered and what is not.

More: [Diyanet's method](diyanet-prayer-time-calculation.md) ·
[Sweden](sweden-prayer-times.md) ·
[prayer time API](prayer-time-api.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
