# mihrab-methods in Kotlin

The five methods of [mihrab-methods](../../README.md) in Kotlin for the
JVM and Android (API 26 or later, for `java.time`), with no dependencies
beyond the standard library: copy `src/` into a project. See
[the ports' notes](../README.md) for what a port does and how it is held
to the reference.

```kotlin
import mihrab.methods.*

val list = CorrectionList(points)   // the "points" object of data/corrections/sweden.json, read with your JSON library
val stockholm = Place(Authority.sweden, lat = 59.33, lon = 18.034, tz = "Europe/Stockholm")
val day = timesFor(stockholm, "2026-11-12", list)
println(day?.printed(Prayer.fajr))            // 'HH:MM' on the clock the table prints
println(day?.minutes?.get(Prayer.fajr))       // whole minutes past 00:00 UT of the date
```

The arithmetic is `StrictMath`'s, so the times are the same on every
device.

## Check

```sh
kotlinc ports/kotlin/src ports/kotlin/test -include-runtime -d /tmp/mihrab-methods.jar
java -jar /tmp/mihrab-methods.jar .
```
