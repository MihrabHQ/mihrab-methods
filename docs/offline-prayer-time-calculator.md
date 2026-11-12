---
title: Offline prayer time calculator for mobile apps
description: Calculate Islamic prayer times on the device with no network - an offline prayer time library for iOS, Android, React Native and Flutter apps, by the verified methods of national Islamic authorities.
permalink: /offline-prayer-time-calculator/
---

# Offline prayer time calculator

A prayer app has to work in a basement mosque, on a plane and in a village
with no signal — and the adhan notification has to be scheduled days ahead,
not fetched at the moment it is due. Mihrab Methods calculates prayer
times **on the device**: a place and a date in, the day's six times out,
with no request made.

## What "offline" means here

- **The methods are code, not a download.** Each authority's method is a
  formula in the library. There is no timetable file to fetch and none is
  shipped.
- **The places travel with the app.** An authority's listed places and the
  points its method computes them at are data in the package; importing one
  authority's entry point bundles only that authority's.
- **The corrections travel too.** The few times a method needs moved a
  minute onto its timetable's rounding are a small static list in the
  package. An app that never goes online keeps giving the answers it was
  verified for.
- **Any date.** Today, a month ahead for scheduling notifications, a year
  for a printed timetable — all computed locally. Each answer says whether
  its date is inside the verified span (`status: 'certified'`) or beyond it
  (`'method-only'`).

## On each platform

| Platform | Use | Network needed |
|---|---|---|
| React Native, Node, web | `npm install mihrab-methods` | none |
| Flutter / Dart | the [Dart port](https://github.com/MihrabHQ/mihrab-methods/tree/main/ports/dart) | none |
| Android (Kotlin, JVM) | the [Kotlin port](https://github.com/MihrabHQ/mihrab-methods/tree/main/ports/kotlin) | none |
| iOS, macOS (Swift) | the [Swift package](https://github.com/MihrabHQ/mihrab-methods/tree/main/ports/swift) | none |
| Python | `pip install mihrab-methods` | none |

Code for each is on the [examples page](examples.md). The ports have no
dependencies beyond their language's standard library, and every one is
held to the same test vectors as the TypeScript library on every push.

## Scheduling a week of notifications, offline

```ts
import { nearestPlace, timesForRange } from 'mihrab-methods/diyanet';

const { place } = nearestPlace('diyanet', 41.01, 28.98)!;
const week = timesForRange(place, '2026-10-15', '2026-10-21');
for (const day of week) {
  for (const [prayer, t] of Object.entries(day.times ?? {})) {
    scheduleLocalNotification(prayer, t.instant);   // your notification library
  }
}
```

`instant` is the moment itself; `printed` is the wall-clock minute the
authority's timetable shows. Nothing needs rounding or converting, and
daylight-saving changes are already in the answer.

## Optional: staying current without a release

An app that is sometimes online can refresh a method's correction list
between releases (`fetchLatestCorrections`). It is opt-in, takes only a
list verified for the exact method revision the app computes, checks its
SHA-256, and changes nothing when the phone is offline.
[The feed](feed.md).

## What it does not do offline

It does not find the user's coordinates (use the platform's location
service, or let the user pick a place) and, in the ports, it does not
search for the nearest listed place — the TypeScript library does
(`nearestPlace`); a port takes a place's coordinates from the lists in
[`data/places`](https://github.com/MihrabHQ/mihrab-methods/tree/main/data/places).

More: [JavaScript library](javascript-prayer-time-library.md) ·
[calculation methods](prayer-time-calculation-methods.md) ·
[how the times are verified](verification.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
