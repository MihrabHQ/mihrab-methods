// A place and a date in, the day's six times out: the authority's method,
// then its correction list — what `timesFor` does in the TypeScript library.
import Foundation

public enum Authority: String {
    case sweden, diyanet, morocco, algeria, indonesia, turkiyetakvimi, kazakhstan, egypt
}

public enum Prayer: String, CaseIterable {
    case fajr, sunrise, dhuhr, asr, maghrib, isha
}

/// The method revisions this port reproduces. A correction list belongs to one revision.
public let REVISIONS: [String: Int] = ["sweden": 1, "diyanet": 2, "morocco": 2, "algeria": 1, "indonesia": 2, "turkiyetakvimi": 1, "kazakhstan": 1, "egypt": 1]

/// A place as the library's lists have it (data/places). Use the coordinates
/// exactly as the list gives them: the correction lists are looked up by them.
public struct Place {
    public var authority: Authority
    public var lat: Double
    public var lon: Double
    /// IANA zone; unused where `clock` is set.
    public var tz: String
    /// Diyanet: Isha's depression where the list gives one (16 or 17).
    public var ishaDeg: Double?
    /// The table's own clock where it keeps one no zone does: (from 'YYYY-MM-DD', minutes east of UTC), in order.
    public var clock: [(from: String, offsetMinutes: Int)]?
    /// Türkiye's districts: per year, the six points (fajr … isha) as (lat, lon).
    public var prayerPoints: [Int: [(Double, Double)]]?
    /// Morocco.
    public var dipDeg: Double?
    public var dipMaghribDeg: Double?
    /// Indonesia.
    public var highland = false
    public var twilightDip = false
    public var afternoon: (Double, Double)?
    /// Türkiye Takvimi: the city's temkin, minutes.
    public var temkin: Double?

    public init(authority: Authority, lat: Double, lon: Double, tz: String) {
        self.authority = authority
        self.lat = lat
        self.lon = lon
        self.tz = tz
    }
}

/// A number to three decimals as JavaScript's toFixed(3) writes it: the binary
/// value's exact decimal expansion, ties away from zero.
func toFixed3(_ x: Double) -> String {
    let negative = x < 0
    // 60 decimals hold the exact expansion of any coordinate
    let exact = String(format: "%.60f", abs(x))
    let parts = exact.split(separator: ".")
    var digits = Array(parts[0].utf8).map { Int($0) - 48 }
    let frac = Array(parts[1].utf8).map { Int($0) - 48 }
    digits.append(contentsOf: frac[0..<3])
    if frac[3] >= 5 {
        var i = digits.count - 1
        while true {
            if digits[i] == 9 {
                digits[i] = 0
                if i == 0 {
                    digits.insert(1, at: 0)
                    break
                }
                i -= 1
            } else {
                digits[i] += 1
                break
            }
        }
    }
    let s = digits.map { String($0) }.joined()
    let whole = s.dropLast(3), tail = s.suffix(3)
    return (negative ? "-" : "") + whole + "." + tail
}

public func pointKey(_ lat: Double, _ lon: Double) -> String {
    return toFixed3(lat) + "," + toFixed3(lon)
}

/// data/corrections/<authority>.json, indexed: point → date → prayer → minutes.
public struct CorrectionList {
    private var index: [String: [String: [Prayer: Int]]] = [:]

    /// From the file's JSON.
    public init(json: Data) throws {
        guard let root = try JSONSerialization.jsonObject(with: json) as? [String: Any],
              let points = root["points"] as? [String: [String]] else {
            throw NSError(domain: "MihrabMethods", code: 1, userInfo: [NSLocalizedDescriptionKey: "Not a correction list."])
        }
        for (point, entries) in points {
            var byDate: [String: [Prayer: Int]] = [:]
            for e in entries {
                let p = e.split(separator: " ")
                guard p.count == 3, let prayer = Prayer(rawValue: String(p[1])), let step = Int(p[2]) else { continue }
                byDate[String(p[0]), default: [:]][prayer] = step
            }
            index[point] = byDate
        }
    }

    public func correction(lat: Double, lon: Double, date: String) -> [Prayer: Int]? {
        return index[pointKey(lat, lon)]?[date]
    }
}

/// Minutes east of UTC that a zone keeps at noon UTC of a date.
public func clockOffsetAt(_ tz: String, _ year: Int, _ month0: Int, _ day: Int) -> Int? {
    guard let zone = TimeZone(identifier: tz) else { return nil }
    let noon = Date(timeIntervalSince1970: Double(dayKey(year, month0, day)) * 86400 + 43200)
    return Int((Double(zone.secondsFromGMT(for: noon)) / 60).rounded())
}

/// The clock a place's table prints a date in: its own where it has one, else its zone's.
public func placeClockAt(_ place: Place, _ year: Int, _ month0: Int, _ day: Int) -> Int? {
    if let clock = place.clock, let first = clock.first {
        let date = String(format: "%04d-%02d-%02d", year, month0 + 1, day)
        var off = first.offsetMinutes
        for c in clock where c.from <= date { off = c.offsetMinutes }
        return off
    }
    return clockOffsetAt(place.tz, year, month0, day)
}

public struct Day {
    /// Minutes east of UTC of the clock the table prints the day in.
    public let clock: Int
    /// Whole minutes past 00:00 UT of the date.
    public let minutes: [Prayer: Int]

    /// 'HH:MM' on the table's clock.
    public func printed(_ p: Prayer) -> String {
        let m = (((minutes[p]! + clock) % 1440) + 1440) % 1440
        return String(format: "%02d:%02d", m / 60, m % 60)
    }
}

private func congress(_ place: Place, _ year: Int, _ month0: Int, _ day: Int, _ asrShadow: Double, _ clock: Int) -> DayMinutes {
    let ishaDeg = place.ishaDeg ?? CONGRESS_ISHA_DEG
    var raw: DayMinutes
    if let byYear = place.prayerPoints, let firstYear = byYear.keys.sorted().first {
        var best = firstYear
        for y in byYear.keys.sorted() where abs(y - year) < abs(best - year) { best = y }
        let p = byYear[best]!
        func at(_ i: Int) -> DayMinutes {
            return congressMinutes(p[i].0, p[i].1, year, month0, day, asrShadow: asrShadow, ishaDeg: ishaDeg, clockOffset: clock)
        }
        raw = DayMinutes(fajr: at(0).fajr, sunrise: at(1).sunrise, dhuhr: at(2).dhuhr, asr: at(3).asr, maghrib: at(4).maghrib, isha: at(5).isha)
    } else {
        raw = congressMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow, ishaDeg: ishaDeg, clockOffset: clock)
    }
    // the library carries an instant in whole milliseconds, then rounds it to the minute
    return raw.mapped { floor(($0 * 60000).rounded(.towardZero) / 60000 + 0.5) }
}

/// The day as a table prints it for `date` ('YYYY-MM-DD'), or nil where the
/// method gives no times (or the zone is unknown to this machine).
///
/// `corrections` is the authority's list; without it the times are the bare
/// method's, which is the published table to within the list's few minutes.
public func timesFor(_ place: Place, _ date: String, corrections: CorrectionList? = nil, asrShadow: Double = 1) -> Day? {
    let parts = date.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    let year = parts[0], month0 = parts[1] - 1, day = parts[2]
    guard let clock = placeClockAt(place, year, month0, day) else { return nil }
    let t: DayMinutes?
    switch place.authority {
    case .sweden, .diyanet:
        t = congress(place, year, month0, day, asrShadow, clock)
    case .morocco:
        t = moroccoMinutes(place.lat, place.lon, year, month0, day, dipDeg: place.dipDeg, asrShadow: asrShadow, dipMaghribDeg: place.dipMaghribDeg)
    case .algeria:
        t = algeriaMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow)
    case .indonesia:
        t = kemenagMinutes(place.lat, place.lon, year, month0, day, highland: place.highland, twilightDip: place.twilightDip,
                           asrShadow: asrShadow, afternoon: place.afternoon)
    case .kazakhstan:
        t = kazakhstanMinutes(place.lat, place.lon, year, month0, day)
    case .egypt:
        t = egyptMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow)
    case .turkiyetakvimi:
        t = takvimMinutes(place.lat, place.lon, year, month0, day, temkin: place.temkin, asrShadow: asrShadow)
    }
    guard let m = t else { return nil }
    var out: [Prayer: Int] = [.fajr: Int(m.fajr), .sunrise: Int(m.sunrise), .dhuhr: Int(m.dhuhr), .asr: Int(m.asr), .maghrib: Int(m.maghrib), .isha: Int(m.isha)]
    if let c = corrections?.correction(lat: place.lat, lon: place.lon, date: date) {
        for (k, step) in c where !(k == .asr && asrShadow != 1) {  // the lists are of the standard Asr only
            out[k]! += step
        }
    }
    return Day(clock: clock, minutes: out)
}
