// Holds the Swift port to test/vectors.json, the sample the TypeScript library
// writes for ports. From ports/swift:
//
//     swift run mihrab-vectors ../..
//
// The argument is the repository root; a second one names another vectors file.
import Foundation
import MihrabMethods

let root = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "../.."
let vectorsPath = CommandLine.arguments.count > 2 ? CommandLine.arguments[2] : root + "/test/vectors.json"

func load(_ path: String) -> Data {
    guard let d = FileManager.default.contents(atPath: path) else {
        print("Cannot read \(path)")
        exit(2)
    }
    return d
}

let vectors = try JSONSerialization.jsonObject(with: load(vectorsPath)) as! [String: Any]
if (vectors["revisions"] as! [String: Int]) != REVISIONS {
    print("The vectors are of revisions \(vectors["revisions"]!); this port is of \(REVISIONS).")
    exit(1)
}
var lists: [String: CorrectionList] = [:]
for a in REVISIONS.keys {
    lists[a] = try CorrectionList(json: load("\(root)/data/corrections/\(a).json"))
}

func pair(_ v: Any) -> (Double, Double) {
    let a = v as! [NSNumber]
    return (a[0].doubleValue, a[1].doubleValue)
}

var off = 0, checked = 0
let cases = vectors["cases"] as! [[String: Any]]
for c in cases {
    let p = c["place"] as! [String: Any]
    let id = p["id"] as! String
    let authority = String(id.split(separator: ":")[0])
    var place = Place(authority: Authority(rawValue: authority)!, lat: (p["lat"] as! NSNumber).doubleValue,
                      lon: (p["lon"] as! NSNumber).doubleValue, tz: p["tz"] as! String)
    place.ishaDeg = (p["ishaDeg"] as? NSNumber)?.doubleValue
    place.temkin = (p["temkin"] as? NSNumber)?.doubleValue
    place.dipDeg = (p["dipDeg"] as? NSNumber)?.doubleValue
    place.dipMaghribDeg = (p["dipMaghribDeg"] as? NSNumber)?.doubleValue
    place.highland = (p["highland"] as? Bool) ?? false
    place.twilightDip = (p["twilightDip"] as? Bool) ?? false
    if let a = p["afternoon"] { place.afternoon = pair(a) }
    if let clock = p["clock"] as? [[Any]] {
        place.clock = clock.map { (from: $0[0] as! String, offsetMinutes: ($0[1] as! NSNumber).intValue) }
    }
    if let pp = p["prayerPoints"] as? [String: [Any]] {
        place.prayerPoints = Dictionary(uniqueKeysWithValues: pp.map { (Int($0.key)!, $0.value.map(pair)) })
    }
    let date = c["date"] as! String
    let want = c["printed"] as? [String: String]
    let got = timesFor(place, date, corrections: lists[authority])
    if (got == nil) != (want == nil) {
        off += 1
        print("\(id) \(date): \(got == nil ? "no times" : "times"), expected \(want == nil ? "none" : "times")")
        continue
    }
    guard let day = got, let printed = want else { continue }
    let wantClock = ((c["clock"] as! [String: Any])["offsetMinutes"] as! NSNumber).intValue
    if day.clock != wantClock {
        off += 1
        print("\(id) \(date): clock \(day.clock), expected \(wantClock)")
    }
    let instants = c["instants"] as! [String: String]
    let midnight = dayKey(Int(date.prefix(4))!, Int(date.dropFirst(5).prefix(2))! - 1, Int(date.suffix(2))!)
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    for k in Prayer.allCases {
        checked += 1
        let instant = iso.string(from: Date(timeIntervalSince1970: Double(midnight) * 86400 + Double(day.minutes[k]!) * 60))
        if day.printed(k) != printed[k.rawValue] || instant != instants[k.rawValue] {
            off += 1
            print("\(id) \(date) \(k.rawValue): \(day.printed(k)) (\(instant)), expected \(printed[k.rawValue]!) (\(instants[k.rawValue]!))")
        }
    }
}
print("\(cases.count) cases, \(checked) times, \(off) off")
exit(off == 0 ? 0 : 1)
