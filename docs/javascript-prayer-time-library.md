---
title: JavaScript prayer time library (TypeScript, Node, React Native)
description: mihrab-methods is a JavaScript and TypeScript prayer time library with no dependencies - Fajr, Dhuhr, Asr, Maghrib and Isha by the methods of national Islamic authorities, verified against their published timetables. Works in Node, bundlers and React Native.
permalink: /javascript-prayer-time-library/
---

# JavaScript prayer time library

`mihrab-methods` is a prayer time library for JavaScript and TypeScript.
It has no dependencies, ships CommonJS and ES modules with types, and runs
in Node 18+, in a bundler for the browser and in React Native. Nothing is
read from disk and nothing is fetched: the times are calculated where your
code runs.

```sh
npm install mihrab-methods
```

## A day's prayer times

```ts
import { nearestPlace, timesFor } from 'mihrab-methods';
import { defaultAuthorityFor } from 'mihrab-methods/locate';

// 1. Whose timetable does this point pray by?
const authority = defaultAuthorityFor(59.33, 18.07);        // 'sweden' — null where none publishes for it

// 2. That authority's nearest listed place.
const { place, distanceKm } = nearestPlace(authority!, 59.33, 18.07)!;
place.id;                                                    // 'sweden:stockholm'

// 3. The day.
const day = timesFor(place, '2026-10-15');
day.status;                // 'certified' | 'method-only'
day.clock.zone;            // 'Europe/Stockholm' — the clock the timetable prints the day in
day.times!.fajr.printed;   // 'HH:MM' — show this
day.times!.fajr.instant;   // Date — schedule notifications on this
```

Every answer says what it stands on. `status: 'certified'` means the date
is inside the span over which the method matched its authority's published
timetable on every single time; past that span the answer is
`'method-only'` (or an error, with `{ strict: true }`), so an app never
shows an unverified time without knowing it.

## One import per authority

An Indonesian app does not need Diyanet's eight thousand places. Each
authority has its own entry point, and a bundler ships only what you
import:

```ts
import { nearestPlace, timesFor } from 'mihrab-methods/indonesia';
```

`mihrab-methods/sweden`, `/diyanet`, `/morocco`, `/algeria`, `/indonesia`,
`/turkiyetakvimi`, `/kazakhstan`, `/egypt`, `/brunei`, `/qatar`, `/kuwait`,
`/jordan`, `/tatarstan`, `/cdum`, `/albania`, `/bulgaria`, `/banuri`,
`/uae`, `/tehran`, `/wifaq` and `/tunisia`; plain `mihrab-methods` loads
all of them. [The full list of calls and entry points](usage.md).

## A month, an Asr by name, a method's details

```ts
import { timesForRange, timesFor, methodInfo } from 'mihrab-methods';

timesForRange(place, '2026-10-01', '2026-10-31');   // one DayTimes per day
timesFor(place, '2026-10-15', { asr: 'hanafi' });   // 'shafii' | 'hanafi' | 'printed' (the timetable's own, the default)
methodInfo('morocco');                               // angles, margins, rounding, revision, certification, sources
```

## Where no authority publishes

For a point none of the authorities covers, ask for a standard calculation
by a named convention. It is always marked `status: 'calculated'`:

```ts
import { standardTimes } from 'mihrab-methods/standard';

standardTimes({ lat: 48.86, lon: 2.35, date: '2026-10-15', tz: 'Europe/Paris', convention: 'mwl' });
// conventions: 'mwl' | 'isna' | 'egypt' | 'karachi' | 'ummalqura'; asr: 'hanafi' for two shadow lengths
```

## React Native

The package is plain JavaScript and works in React Native as it is — the
[Mihrab app](https://github.com/MihrabHQ/Mihrab) (React Native, iOS and
Android) computes its times with these methods on the phone.

```tsx
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { nearestPlace, timesFor } from 'mihrab-methods/diyanet';

export function TodayTimes({ lat, lng }: { lat: number; lng: number }) {
  const day = useMemo(() => {
    const hit = nearestPlace('diyanet', lat, lng);
    return hit ? timesFor(hit.place, new Date().toISOString().slice(0, 10)) : null;
  }, [lat, lng]);
  if (!day?.times) return null;
  return (
    <View>
      {(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map(k => (
        <Text key={k}>{k} {day.times![k].printed}</Text>
      ))}
    </View>
  );
}
```

The clock a day is printed in comes from the JavaScript engine's time zone
data (`Intl`), which Hermes and JavaScriptCore both carry.

## Keeping an installed app current

A method's few rounding corrections are published as a feed. An app can
take a newer, verified list without a release:

```ts
import { fetchLatestCorrections } from 'mihrab-methods/morocco';
const r = await fetchLatestCorrections({ authority: 'morocco' });
// 'current' | 'updated' | 'method-moved' | 'uncertified' | 'rejected'
```

This is the one call that touches the network, and only when you call it.
[How the feed works](feed.md).

More: [offline use](offline-prayer-time-calculator.md) ·
[examples in other languages](examples.md) ·
[how the times are verified](verification.md) ·
[npm](https://www.npmjs.com/package/mihrab-methods) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
