---
title: Prayer times in a mobile app – integration guide for React Native, Flutter, Swift and Kotlin
description: Step-by-step guide to adding verified, offline Islamic prayer times to a mobile app with Mihrab Methods - React Native, Flutter, iOS (Swift) and Android (Kotlin). What to bundle, how to pick the place, compute a day, schedule notifications and stay current.
permalink: /mobile-integration/
---

# Mobile integration guide

How to put Mihrab Methods' prayer times into a phone app, computed on the
device. The steps are the same on every platform; what differs is how
much the package does for you.

| | React Native | Flutter | iOS (Swift) | Android (Kotlin) |
|---|---|---|---|---|
| Package | `mihrab-methods` on npm | `ports/dart`, as a git dependency | Swift package, from the repository | `ports/kotlin/src`, copied in |
| Places and correction lists | Inside the package | You bundle them | You bundle them | You bundle them |
| Finds the authority and the nearest place | Yes | You do | You do | You do |
| Says whether a date is verified | Yes (`status`) | You check the list's dates | You check the list's dates | You check the list's dates |
| Time zones | From the JavaScript engine | You supply the offset | From Foundation | From `java.time` |

The TypeScript library is the reference implementation with the whole
API. The Dart, Swift and Kotlin ports are deliberately small: a place and
a date in, the day's six times out. They are held to the reference's test
vectors on every push.

## The five steps

1. **Decide which authorities your app covers.** Each is a separate
   method with its own places. An app for one country needs one.
2. **Get a place.** A method computes for the towns its authority lists,
   at the coordinates the authority's table uses. Take the user's
   location, find the nearest listed place, and keep it; show its name so
   the user knows whose times they see.
3. **Compute a day** — or thirty. The calculation is cheap, so compute
   ahead rather than at the moment of prayer.
4. **Show `printed`, schedule on the instant.** The printed time is the
   clock time of the timetable; the instant is the moment, for
   notifications.
5. **Plan for the end of the verified dates.** Each method is compared
   with its timetable over a span of dates; update the package or its
   correction list before that span runs out.

## React Native

```sh
npm install mihrab-methods
```

There is no native module, so no linking and no pod install.

```ts
import { defaultAuthorityFor } from 'mihrab-methods/locate';
import { nearestPlace, timesForRange, type Place } from 'mihrab-methods';

/** Once, when the location is known: the place to keep in your settings. */
export function placeFor(lat: number, lng: number): Place | null {
  const authority = defaultAuthorityFor(lat, lng);            // null: nothing here covers this point
  return authority ? nearestPlace(authority, lat, lng)?.place ?? null : null;
}

/** The next `days` days, for the screen and for scheduling. */
export function upcoming(place: Place, days = 14) {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const from = new Date();
  const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days - 1);
  return timesForRange(place, iso(from), iso(to));             // dates are civil dates: 'YYYY-MM-DD'
}
```

Scheduling, with whichever notification library you use:

```ts
for (const day of upcoming(place)) {
  if (!day.times) continue;
  for (const [prayer, t] of Object.entries(day.times)) {
    if (prayer === 'sunrise' || t.instant.getTime() <= Date.now()) continue;
    await scheduleNotification({ id: `${day.date}-${prayer}`, title: prayer, at: t.instant });   // yours
  }
}
```

Notes:

- **Bundle size.** `import … from 'mihrab-methods'` carries every
  authority's places. If the app serves one country, import that entry
  point instead (`mihrab-methods/sweden`, `mihrab-methods/diyanet`, …) and
  only its data is bundled.
- **Subpath imports** rely on the package's `exports` map. Recent React
  Native versions resolve it by default; on older ones, enable package
  exports in `metro.config.js` or import from `'mihrab-methods'`.
- **Time zones** come from `Intl.DateTimeFormat`, which Hermes provides.
- **Staying current without an app release:** `fetchLatestCorrections`
  ([the feed](feed.md)) fetches a newer correction list for the method
  revision your build computes, checks its hash, and applies it. It is
  optional; without it nothing is fetched at all.
- iOS limits an app to 64 pending local notifications, so schedule a
  rolling window and top it up when the app runs.

## The ports: what you bundle

Flutter, Swift and Kotlin apps bundle two small JSON files per authority.

**The correction list** is in the repository as
[`data/corrections/<authority>.json`](https://github.com/MihrabHQ/mihrab-methods/tree/main/data/corrections).
Add it to your assets unchanged. Its `from` and `to` are the dates the
method was compared over: inside them the port's answer is the timetable's
minute; outside them it is the method alone.

**The places.** The simplest way to get an authority's list in one shape
is to write it out once with the npm package, on your development
machine:

```sh
npm install mihrab-methods
node -e "const m = require('mihrab-methods/sweden'); require('fs').writeFileSync('sweden-places.json', JSON.stringify(m.placesOf('sweden')))"
```

Each entry has `id`, `name`, `country`, `lat`, `lon` and `tz`, and for
some authorities extra fields the method needs (`ishaDeg`, `clock`,
`prayerPoints`, `dipDeg`, `afternoon`, `temkin` and others). A port's
`Place` has a property for each: pass through whatever the entry has.
**Use `lat` and `lon` exactly as listed** — the correction list is looked
up by them, and the user's own coordinates would miss it.

To pick the place, compute the great-circle distance from the user's
location to each entry and take the smallest; decide for yourself how far
is too far.

Take both files from the same release, and update them together with the
port's source: a correction list belongs to one revision of a method
(`REVISIONS` in each port, `revisions` in Dart, names the revisions it computes).

## Flutter

```yaml
dependencies:
  mihrab_methods:
    git:
      url: https://github.com/MihrabHQ/mihrab-methods
      path: ports/dart
  timezone: any
```

```dart
import 'package:flutter/services.dart' show rootBundle;
import 'package:mihrab_methods/mihrab_methods.dart';
import 'package:timezone/data/latest.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

Future<Day?> stockholmOn(String date) async {            // date: 'YYYY-MM-DD'
  final list = CorrectionList.fromJson(await rootBundle.loadString('assets/corrections/sweden.json'));
  const place = Place(authority: Authority.sweden, lat: 59.33, lon: 18.034, tz: 'Europe/Stockholm');

  // Dart has no time-zone database: give the minutes east of UTC the zone keeps at noon UTC of the date.
  tzdata.initializeTimeZones();
  final noonUtc = DateTime.parse('${date}T12:00:00Z');
  final offset = tz.TZDateTime.from(noonUtc, tz.getLocation(place.tz)).timeZoneOffset.inMinutes;

  return timesFor(place, date, zoneOffsetMinutes: offset, corrections: list);
}

// day.printed(Prayer.fajr)  -> 'HH:MM' for the screen
// day.instant(Prayer.fajr)  -> a UTC DateTime for flutter_local_notifications or similar
```

The port is checked on the Dart VM. Compiled to JavaScript for the web,
Dart's numbers are JavaScript's and the arithmetic is the same, but that
build is not part of the check.

## iOS (Swift)

Xcode: File → Add Package Dependencies →
`https://github.com/MihrabHQ/mihrab-methods`. Add
`sweden.json` (the correction list) to the app target.

```swift
import Foundation
import MihrabMethods

let url = Bundle.main.url(forResource: "sweden", withExtension: "json")!
let list = try CorrectionList(json: Data(contentsOf: url))
let place = Place(authority: .sweden, lat: 59.33, lon: 18.034, tz: "Europe/Stockholm")

if let day = timesFor(place, "2026-11-12", corrections: list) {
    let label = day.printed(.fajr)                       // "HH:MM" for the screen

    // minutes are counted from 00:00 UT of the date: turn them into a Date for scheduling
    var utc = Calendar(identifier: .gregorian)
    utc.timeZone = TimeZone(identifier: "UTC")!
    let midnight = utc.date(from: DateComponents(year: 2026, month: 11, day: 12))!
    let fajr = midnight.addingTimeInterval(Double(day.minutes[.fajr]!) * 60)

    let content = UNMutableNotificationContent()         // import UserNotifications
    content.title = "Fajr \(label)"
    let when = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fajr)
    let request = UNNotificationRequest(identifier: "2026-11-12-fajr", content: content,
                                        trigger: UNCalendarNotificationTrigger(dateMatching: when, repeats: false))
    UNUserNotificationCenter.current().add(request)
}
```

The Congress method (Sweden, Diyanet) keeps a small cache of years: call
it from one thread at a time. The same package works in a widget or a
watch extension, since it depends only on Foundation.

## Android (Kotlin)

Copy
[`ports/kotlin/src`](https://github.com/MihrabHQ/mihrab-methods/tree/main/ports/kotlin/src)
into a module (API 26 or later, for `java.time`; no dependencies) and put
the correction list in `assets/`.

```kotlin
import mihrab.methods.*
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneOffset

fun correctionList(context: Context, name: String): CorrectionList {
    val points = JSONObject(context.assets.open(name).bufferedReader().readText()).getJSONObject("points")
    val map = HashMap<String, List<String>>()
    for (key in points.keys()) {
        val entries = points.getJSONArray(key)
        map[key] = List(entries.length()) { entries.getString(it) }
    }
    return CorrectionList(map)
}

val list = correctionList(context, "sweden.json")
val place = Place(Authority.sweden, lat = 59.33, lon = 18.034, tz = "Europe/Stockholm")
val date = "2026-11-12"
val day = timesFor(place, date, list) ?: return

val label = day.printed(Prayer.fajr)                     // "HH:MM" for the screen
// minutes are counted from 00:00 UT of the date: an Instant for AlarmManager or WorkManager
val fajr = LocalDate.parse(date).atStartOfDay(ZoneOffset.UTC)
    .plusMinutes(day.minutes.getValue(Prayer.fajr).toLong()).toInstant()
```

The arithmetic is `StrictMath`'s, so the times are the same on every
device. For exact prayer-time alarms use
`AlarmManager.setExactAndAllowWhileIdle` (it needs the exact-alarm
permission on recent Android versions) and reschedule after a reboot.

## Things every platform should handle

- **No listed place nearby.** Outside the covered authorities there is no
  answer. In JavaScript, `standardTimes` (`mihrab-methods/standard`)
  gives a plain calculation by a named convention and marks it
  `calculated`; the ports have no such fallback, so use another
  calculation there and tell the user which.
- **Days with no times.** On some dates at high latitude a method may
  give no times for a place (`times` is null in JavaScript; the ports
  return null). Do not assume six times every day.
- **Past the verified dates.** In JavaScript, check `day.status`. With a
  port, compare the date with the correction list's `to`. Decide what
  your app says then — the times are still the method's.
- **The user travels.** Recompute the place when the location changes
  meaningfully, and reschedule.
- **The mosque differs by a few minutes.** Some mosques print their own
  times. Let the user set a per-prayer offset in your app; the library
  has none.
- **Asr.** The default is the Asr the authority's timetable prints. The
  other school's is one option away (`{ asr: 'hanafi' }` in JavaScript,
  `asrShadow: 2` in the ports).
- **Say whose times they are.** Showing the authority and the town builds
  trust — and Mihrab Methods is independent of every authority, so an app
  should not present the times as issued by one.

## No offline requirement?

A prototype, a website or a server can skip all of this and call the
[HTTP API](prayer-time-api.md). It is free and needs no key, but it is run
without a promise of availability: an app people rely on for prayer
should compute on the device.

More: [examples](examples.md) ·
[offline use](offline-prayer-time-calculator.md) ·
[verification](verification.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
