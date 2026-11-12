---
title: Prayer time examples – TypeScript, React Native, Flutter, Kotlin, Swift, Python
description: Copy-and-run examples for computing Islamic prayer times with Mihrab Methods in TypeScript, React Native, Flutter (Dart), Android (Kotlin), iOS (Swift), Python and over HTTP.
permalink: /examples/
---

# Examples

The same day — Stockholm, 12 November 2026, by the Swedish method — in
each environment. The TypeScript library is the reference and has the
whole API (place lookup, certified dates, the correction feed). The ports
compute the same times from a place and a date, and are held to the
library's test vectors on every push.

| Environment | Package | Finds the nearest place | Runs offline |
|---|---|---|---|
| TypeScript / JavaScript | `npm install mihrab-methods` | yes | yes |
| React Native | the same npm package | yes | yes |
| Python 3.9+ | `pip install mihrab-methods` | you give the place | yes |
| Swift (iOS, macOS) | Swift package, from the repository | you give the place | yes |
| Kotlin (Android, JVM) | source in `ports/kotlin/src` | you give the place | yes |
| Dart / Flutter | package in `ports/dart` | you give the place | yes |
| Anything else | [HTTP API](prayer-time-api.md) | yes | no |

For the ports, the places of each authority — coordinates and time zone —
are in
[data/places](https://github.com/MihrabHQ/mihrab-methods/tree/main/data/places),
and the correction lists in
[data/corrections](https://github.com/MihrabHQ/mihrab-methods/tree/main/data/corrections).
Use a place's coordinates exactly as its list has them: the correction
lists are looked up by them.

## TypeScript

```sh
npm install mihrab-methods
```

```ts
import { nearestPlace, timesFor } from 'mihrab-methods/sweden';

const { place, distanceKm } = nearestPlace('sweden', 59.33, 18.07)!;
const day = timesFor(place, '2026-11-12');

for (const [name, t] of Object.entries(day.times!)) {
  console.log(name, t.printed, t.instant.toISOString());
}
console.log(day.status, day.certifiedUntil);   // 'certified', and the last date compared
```

When you do not know the authority in advance:

```ts
import { defaultAuthorityFor } from 'mihrab-methods/locate';
import { nearestPlace, timesFor } from 'mihrab-methods';

const authority = defaultAuthorityFor(lat, lng);          // null where no authority here publishes
const found = authority && nearestPlace(authority, lat, lng);
const day = found && timesFor(found.place, new Date());
```

More: [the JavaScript library page](javascript-prayer-time-library.md).

## React Native

The npm package is plain JavaScript with no native module, so there is
nothing to link. A minimal screen:

```tsx
import React, { useMemo } from 'react';
import { FlatList, Text } from 'react-native';
import { nearestPlace, timesFor } from 'mihrab-methods/sweden';

export function TodayTimes({ lat, lng }: { lat: number; lng: number }) {
  const rows = useMemo(() => {
    const found = nearestPlace('sweden', lat, lng);
    if (!found) return [];
    const day = timesFor(found.place, new Date());
    return Object.entries(day.times ?? {}).map(([name, t]) => ({ name, printed: t.printed }));
  }, [lat, lng]);

  return (
    <FlatList
      data={rows}
      keyExtractor={r => r.name}
      renderItem={({ item }) => <Text>{item.name}  {item.printed}</Text>}
    />
  );
}
```

Schedule notifications on `t.instant` (a `Date`) and display `t.printed`.
The library reads time zones through `Intl.DateTimeFormat`, which Hermes
provides.

## Flutter (Dart)

Add the package from the repository in `pubspec.yaml`:

```yaml
dependencies:
  mihrab_methods:
    git:
      url: https://github.com/MihrabHQ/mihrab-methods
      path: ports/dart
```

```dart
import 'package:flutter/services.dart' show rootBundle;
import 'package:mihrab_methods/mihrab_methods.dart';

Future<void> printFajr() async {
  // data/corrections/sweden.json from the repository, added to your assets
  final list = CorrectionList.fromJson(await rootBundle.loadString('assets/corrections/sweden.json'));
  const stockholm = Place(authority: Authority.sweden, lat: 59.33, lon: 18.034, tz: 'Europe/Stockholm');
  // Dart has no time-zone database: give the minutes east of UTC on that date
  // (package:timezone can supply it).
  final day = timesFor(stockholm, '2026-11-12', zoneOffsetMinutes: 60, corrections: list);
  print(day?.printed(Prayer.fajr));   // 'HH:MM'
  print(day?.instant(Prayer.fajr));   // a UTC DateTime
}
```

## Android (Kotlin)

Copy
[ports/kotlin/src](https://github.com/MihrabHQ/mihrab-methods/tree/main/ports/kotlin/src)
into the project (API 26 or later; no dependencies).

```kotlin
import mihrab.methods.*

// points: the "points" object of data/corrections/sweden.json, read with your JSON library
val list = CorrectionList(points)
val stockholm = Place(Authority.sweden, lat = 59.33, lon = 18.034, tz = "Europe/Stockholm")
val day = timesFor(stockholm, "2026-11-12", list)
println(day?.printed(Prayer.fajr))        // 'HH:MM'
println(day?.minutes?.get(Prayer.fajr))   // minutes past 00:00 UT of the date
```

## iOS (Swift)

In Xcode: File → Add Package Dependencies →
`https://github.com/MihrabHQ/mihrab-methods`. Or in `Package.swift`:

```swift
.package(url: "https://github.com/MihrabHQ/mihrab-methods", from: "1.3.2")
```

```swift
import Foundation
import MihrabMethods

// sweden.json from data/corrections, added to the app bundle
let url = Bundle.main.url(forResource: "sweden", withExtension: "json")!
let list = try CorrectionList(json: Data(contentsOf: url))
let stockholm = Place(authority: .sweden, lat: 59.33, lon: 18.034, tz: "Europe/Stockholm")
if let day = timesFor(stockholm, "2026-11-12", corrections: list) {
    print(day.printed(.fajr))      // 'HH:MM'
    print(day.minutes[.fajr]!)     // minutes past 00:00 UT of the date
}
```

## Python

```sh
pip install mihrab-methods
```

```python
from mihrab_methods import load_corrections, times_for

lists = load_corrections()   # the lists shipped with the package
stockholm = {'authority': 'sweden', 'lat': 59.33, 'lon': 18.034, 'tz': 'Europe/Stockholm'}
day = times_for(stockholm, '2026-11-12', lists['sweden'])
print(day['printed'])    # the six times as 'HH:MM'
print(day['instants'])   # timezone-aware datetimes
```

## HTTP, from anything

```sh
curl 'https://mihrab-api.elghamri.se/v1/times?lat=59.33&lng=18.07&date=2026-11-12'
```

Routes, parameters and the answer's shape: [prayer time API](prayer-time-api.md)
and the [OpenAPI description](openapi.json).

## What the ports leave to you

A port takes a place and a date and gives the day. Finding the nearest
place, telling whether a date is inside the verified span, and fetching a
newer correction list are in the TypeScript library only; a port that
needs them can read [the feed](feed.md). Without a correction list a port
gives the bare method: the same answer on almost every day, and within a
minute on the days the list has an entry for.
