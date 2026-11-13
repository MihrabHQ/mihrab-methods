---
title: Verification – what was tested, against what, and with what result
description: Exactly how Mihrab Methods' prayer times are verified - which authorities, how many places and dates, how many times compared, the discrepancy count, the tolerance, the known exceptions and limits, and how a new authority is added.
permalink: /verification/
---

# Verification

Every method in Mihrab Methods is compared, time by time, with the
timetable its authority publishes. This page says precisely what that
means, so you can decide how far to rely on it.

**In one line:** <!--fig:total.times-->77,658,583<!--/fig--> printed times compared
across <!--fig:total.methods-->21<!--/fig--> methods;
<!--fig:total.off-->0<!--/fig--> differ. Last checked
<!--fig:total.checkedAtLong-->13 November 2026<!--/fig-->.

## What is compared

One **time** is one prayer time on one day in one place: Fajr, sunrise,
Dhuhr, Asr, Maghrib or Isha, as a clock time to the minute. For each
authority, the library computes every place the authority lists on every
day it has published, and each computed time is compared with the minute
printed in the authority's timetable, on the clock that timetable is
printed in.

## Tolerance: none

A time matches only if it is the **same minute**. There is no "within one
minute" allowance: a time one minute away from the printed one is counted
as off. A method is included in the library only when its count of times
off is **zero**; a method at 99.9 % is not shipped.

## Results by authority

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

How to read the columns:

- **Places** and **Checked over** are the coverage: how many of the
  authority's listed places, and which dates. Coverage differs a lot
  between authorities, because some publish years ahead for thousands of
  places and some publish a few months for a few dozen. A short span is a
  smaller body of evidence, and the table shows it rather than hiding it.
- **Times checked** is the number of individual comparisons.
- **Off the printed minute** is the result with the correction list
  applied. It is zero for every method, by the rule above.
- **By the method alone** is the share that matches from the formula with
  nothing added.
- **Correction entries** is the size of the list that covers the rest.

## The correction lists — the part to understand

No formula reproduces a printed timetable completely, because an
authority's own program rounds numbers that sit a fraction of a second
from a minute boundary, and which side they fall on depends on details of
its arithmetic that cannot be seen from outside. The method here is never
more than a minute from such a time, and each one is recorded in a
per-authority **correction list**: place, date, prayer, one minute up or
down.

So "zero off" is the formula **plus** that list. The "By the method alone"
column is the honest measure of the formula itself, and the "Correction
entries" column is the size of the remainder. A list is kept small by rule:
if it grows beyond a small fraction of the times, the formula is treated
as unfinished. The lists are in
[data/corrections](https://github.com/MihrabHQ/mihrab-methods/tree/main/data/corrections),
ship inside the package, and can be refreshed by an app without a release
([the feed](feed.md)).

## Known exceptions and limits

- **Only the dates compared are verified.** Inside them an answer carries
  `status: 'certified'`; outside them `'method-only'` — the same formula,
  no correction list, not compared with anything. `certifiedFrom` and
  `certifiedUntil` are on every answer. Past dates before the span are in
  the same position as future ones.
- **Only the listed places.** A method is verified at the places its
  authority publishes for. The library answers for those places and tells
  you how far the nearest one is; it does not claim a verified time for an
  arbitrary coordinate.
- **Rows set aside.** Where a timetable's own row is evidently faulty —
  another town's times under a name, a row repeated from another day or
  year — the row is set aside rather than counted, and the number set
  aside is recorded per check in the record. They are listed per authority
  in [where each method stands](status.md).
- **The Asr a timetable does not print.** Each timetable prints one Asr.
  The other school's Asr is available on request but was compared with
  nothing; its `basis` is `'unchecked'`.
- **Standard conventions are not verified.** `standardTimes` (MWL, ISNA,
  Egypt, Karachi, Umm al-Qura) is the plain astronomical calculation for
  places no authority here covers, and is marked `'calculated'`.
- **Authorities change their timetables.** A republished table can differ
  from the one compared. The comparison is rerun weekly and whenever the
  tables change; a method that no longer matches loses its certification
  until it does.
- **Time zone rules.** Clock times depend on the time-zone database of the
  device. Two devices with different editions can differ where a
  country's rules changed between them.
- **Ports.** The Python, Swift, Kotlin and Dart ports are held to a set of
  test vectors generated from the TypeScript library on every push, not
  each separately to the full timetables.
- **Not every authority.** Authorities whose methods have not reached zero
  off are absent. [Status](status.md) lists what is missing.

## The record

The result of each run is written to
[certification.json](https://github.com/MihrabHQ/mihrab-methods/blob/main/certification.json):
per authority and per timetable, the places, the times, how many are off
with and without the correction list, the dates, the rows set aside, the
method's revision and the SHA-256 of its correction list. Every figure on
this site and in the README is generated from that file; none is typed by
hand. The same record is served at `/v1/methods` by
[the API](prayer-time-api.md) and by `methodInfo()` in the library.

The comparison is
[tools/verify.ts](https://github.com/MihrabHQ/mihrab-methods/blob/main/tools/verify.ts);
the record is written by
[tools/certify.ts](https://github.com/MihrabHQ/mihrab-methods/blob/main/tools/certify.ts).

## What you can check yourself

The authorities' timetables are their own publications and are not
redistributed in the repository, so the full comparison needs the
timetables supplied to it (the check reads them from the directory named
by `MIHRAB_TABLES`). Without them you can still:

- run `npm test`, which holds the library to
  [test/vectors.json](https://github.com/MihrabHQ/mihrab-methods/blob/main/test/vectors.json)
  and checks the record against the correction lists' hashes;
- compare any day with the timetable your mosque follows — and
  [report a difference](https://github.com/MihrabHQ/mihrab-methods/issues/new?template=times-differ.yml)
  with the city, date, prayer and printed time;
- read each method, formula by formula, in [the methods reference](methods.md).

## Adding an authority

The rule is "100 % or nothing". A new authority needs:

1. **The formula, written from scratch** from the authority's published
   times: its sun, angles, margins, rounding and high-latitude rule.
   Nothing is copied from an authority's software.
2. **The places**, each at the point its table is computed at, with the
   clock the table is printed in.
3. **The check** against the authority's published tables: every place,
   every day.
4. **A correction list only for what rounding leaves.**
5. **Certification at zero off**, a written description of the method in
   the methods reference, and test vectors so every port can be held to
   it.

The steps and commands are in
[CONTRIBUTING.md](https://github.com/MihrabHQ/mihrab-methods/blob/main/CONTRIBUTING.md).
If your country's authority is missing, an
[issue](https://github.com/MihrabHQ/mihrab-methods/issues) naming it is a
good start.

Mihrab Methods is independent of every authority named here: it matches
their published timetables and speaks for none of them.
