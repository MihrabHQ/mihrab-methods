# mihrab-methods in Dart

The five methods of [mihrab-methods](../../README.md) in Dart, for Flutter
and the Dart VM, with no dependencies. See [the ports' notes](../README.md)
for what a port does and how it is held to the reference.

```dart
import 'dart:io';
import 'package:mihrab_methods/mihrab_methods.dart';

final list = CorrectionList.fromJson(File('data/corrections/sweden.json').readAsStringSync());
const stockholm = Place(authority: Authority.sweden, lat: 59.33, lon: 18.034, tz: 'Europe/Stockholm');
// Dart has no time-zone database: give the minutes east of UTC the zone keeps at noon UTC of the date.
final day = timesFor(stockholm, '2026-11-12', zoneOffsetMinutes: 60, corrections: list);
print(day?.printed(Prayer.fajr));   // 'HH:MM' on the clock the table prints
print(day?.instant(Prayer.fajr));   // the same time as a UTC DateTime
```

`package:timezone` gives the offset of a zone on a date; a place whose
table keeps its own clock (`Place.clock`) needs none.

The port is checked on the Dart VM. Compiled to JavaScript, Dart's numbers
are JavaScript's and the arithmetic is the same; that build is not part of
the check.

## Check

```sh
dart run ports/dart/tool/vector_check.dart .
```
