# mihrab-methods in Swift

The five methods of [mihrab-methods](../../README.md) as a Swift package
with no dependencies beyond Foundation. See [the ports' notes](../README.md)
for what a port does and how it is held to the reference.

```swift
import Foundation
import MihrabMethods

let list = try CorrectionList(json: Data(contentsOf: URL(fileURLWithPath: "data/corrections/sweden.json")))
let stockholm = Place(authority: .sweden, lat: 59.33, lon: 18.034, tz: "Europe/Stockholm")
if let day = timesFor(stockholm, "2026-11-12", corrections: list) {
    print(day.printed(.fajr))     // 'HH:MM' on the clock the table prints
    print(day.minutes[.fajr]!)    // whole minutes past 00:00 UT of the date
}
```

`Place` has the fields a list gives some of its places as optional
properties (`ishaDeg`, `clock`, `prayerPoints`, `dipDeg`, `dipMaghribDeg`,
`highland`, `twilightDip`, `afternoon`). The Congress method keeps a small
cache of years; call it from one thread at a time.

## Check

```sh
swift run --package-path ports/swift mihrab-vectors .
```
