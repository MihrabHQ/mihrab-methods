---
title: Mihrab Methods – accurate Islamic prayer times for developers
description: An open-source prayer time calculation library for Muslim apps. The calculation methods of national Islamic authorities, each verified against its published timetable to the printed minute. Offline, in TypeScript, Python, Swift, Kotlin and Dart, with a free HTTP API.
permalink: /
---

# Mihrab Methods – accurate Islamic prayer times for developers

An open-source prayer time calculation engine for Muslim applications:
Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha for a place and a date.

A general prayer time calculator gives you an angle convention (Muslim
World League, ISNA, Umm al-Qura) and lands a minute or a few away from the
timetable a country's mosques actually follow. Mihrab Methods reproduces
the **published methods of recognised Islamic authorities** — a ministry's,
a muftiate's, a council of scholars' — and checks every result against the
timetable that authority publishes:
<!--fig:total.off-->0<!--/fig--> of <!--fig:total.times-->77,611,133<!--/fig-->
times off the printed minute, across <!--fig:total.methods-->21<!--/fig-->
authorities. [What exactly was tested](verification.md).

```sh
npm install mihrab-methods      # TypeScript / JavaScript, React Native
pip install mihrab-methods      # Python
```

```ts
import { nearestPlace, timesFor } from 'mihrab-methods';

const { place } = nearestPlace('diyanet', 41.01, 28.98)!;   // Istanbul
const day = timesFor(place, '2026-10-15');
day.times!.fajr.printed;   // 'HH:MM' on the clock the timetable prints
day.status;                // 'certified' inside the dates the method was checked over
```

## Why Mihrab Methods

- **Authority-specific accuracy.** Each method is one authority's own:
  its angles, margins, rounding and reference points, not a generic
  convention with an offset.
- **Verified results.** Every method is compared day by day with its
  authority's published timetable and is used only at zero times off.
  The record is public and regenerated on every change:
  [verification](verification.md).
- **Offline.** The times are calculated on the device. Nothing is fetched
  and no request is made per reader: [offline prayer times](offline-prayer-time-calculator.md).
- **Made for app developers.** TypeScript types, one import per authority,
  a clear `status` on every answer, and the same methods in Python, Swift,
  Kotlin and Dart: [examples](examples.md).
- **Somewhere to fall back to.** For a place none of the authorities
  publishes for, a plainly labelled standard calculation (MWL, ISNA, Egypt,
  Karachi, Umm al-Qura; either Asr): [calculation methods](prayer-time-calculation-methods.md).

## Looking for a prayer time API?

The same methods are served over HTTP, free, with no key:
[prayer time API](prayer-time-api.md). You can also run the handler
yourself, or skip the network and embed the library.

## Guides

| Page | For |
|---|---|
| [Prayer time API](prayer-time-api.md) | Calling prayer times over HTTP: routes, parameters, answers, limits |
| [JavaScript prayer time library](javascript-prayer-time-library.md) | TypeScript and JavaScript: Node, the browser, React Native |
| [Offline prayer time calculator](offline-prayer-time-calculator.md) | Mobile apps that must work with no connection |
| [Prayer time calculation methods](prayer-time-calculation-methods.md) | Comparing methods: which authority, which convention, which Asr |
| [Diyanet prayer time calculation](diyanet-prayer-time-calculation.md) | Reproducing Diyanet's times, in Türkiye and worldwide |
| [Prayer times in Sweden](sweden-prayer-times.md) | Swedish apps: the tables Swedish mosques follow, and the summer nights |
| [Islamiska Förbundet prayer times](islamiska-forbundet-prayer-times.md) | Matching Islamiska Förbundet's timetable for its towns |
| [Verification](verification.md) | What was tested, over which dates, and the exceptions |
| [Mobile integration guide](mobile-integration.md) | React Native, Flutter, Swift and Kotlin, step by step: what to bundle, picking the place, scheduling |
| [Compared with Adhan JS and AlAdhan](compare-adhan-js-aladhan.md) | What each is for, what differs, and what Mihrab Methods does not do |
| [Examples](examples.md) | TypeScript, React Native, Flutter, Kotlin, Swift, Python |

## Reference

- [Using the library and the API](usage.md): every call, entry point and route
- [OpenAPI description](openapi.json) of the HTTP API (OpenAPI 3.1)
- [Each method in words and formulas](methods.md), for ports to other languages
- [Where each method stands](status.md): what is certified, what was set aside
- [The correction lists as a feed](feed.md): keeping an installed app current
- [Why this can be used freely](legal.md)
- [Source, issues and releases on GitHub](https://github.com/MihrabHQ/mihrab-methods)

## Built for

Muslim prayer apps, adhan and prayer notification apps, mosque timetable
screens and websites, Islamic calendar apps and any product that shows
people when to pray. The [Mihrab app](https://github.com/MihrabHQ/Mihrab)
computes its prayer times with this library.
