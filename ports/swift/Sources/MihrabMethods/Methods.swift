// The methods: Sweden and Diyanet (the Congress method), Morocco, Algeria,
// Indonesia, Türkiye Takvimi and Kazakhstan. A port of src/methods/*.ts — the TypeScript is the reference,
// docs/methods.md says what each does, and the vector check holds this to it.
//
// Every function takes a civil date with the month 0-based, as the TypeScript
// does, and gives minutes past 00:00 UT of that date.
import Foundation

/// Whole days since 1970-01-01 of a civil date; a day past the month's end rolls over, as Date.UTC does.
public func dayKey(_ year: Int, _ month0: Int, _ day: Int) -> Int {
    // days from civil (Howard Hinnant), for the first of the month
    let m = month0 + 1
    let y = m <= 2 ? year - 1 : year
    let era = (y >= 0 ? y : y - 399) / 400
    let yoe = y - era * 400
    let doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
    return era * 146097 + doe - 719468 + day - 1
}

func yearOf(_ key: Int) -> Int {
    // civil from days
    let z = key + 719468
    let era = (z >= 0 ? z : z - 146096) / 146097
    let doe = z - era * 146097
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
    let mp = (5 * doy + 2) / 153
    let m = mp < 10 ? mp + 3 : mp - 9
    return yoe + era * 400 + (m <= 2 ? 1 : 0)
}

private let J2000_DAYS = 10957

/// Days from J2000.0 (noon) of the date's 00:00 UT.
private func d0Of(_ year: Int, _ month0: Int, _ day: Int) -> Double {
    return Double(dayKey(year, month0, day) - J2000_DAYS) - 0.5
}

public struct DayMinutes {
    public var fajr: Double
    public var sunrise: Double
    public var dhuhr: Double
    public var asr: Double
    public var maghrib: Double
    public var isha: Double

    var all: [Double] { return [fajr, sunrise, dhuhr, asr, maghrib, isha] }
    func mapped(_ f: (Double) -> Double) -> DayMinutes {
        return DayMinutes(fajr: f(fajr), sunrise: f(sunrise), dhuhr: f(dhuhr), asr: f(asr), maghrib: f(maghrib), isha: f(isha))
    }
}

// ---------------------------------------------------------------- Morocco

let MOROCCO_SUNRISE_MARGIN = -1.0
let MOROCCO_MAGHRIB_MARGIN = 1.8

func moroccoDipEast(_ heightM: Double) -> Double { return 0.32 + 0.025 * max(heightM, 0).squareRoot() }
func moroccoDipWest(_ heightM: Double) -> Double { return 0.37 + 0.021 * max(heightM, 0).squareRoot() }

private func refractionFromTrue(_ h: Double) -> Double { return (1.02 / tan((h + 10.3 / (h + 5.11)) * RAD)) / 60 }
private func refractionFromApparent(_ h: Double) -> Double { return (1 / tan((h + 7.31 / (h + 4.4)) * RAD)) / 60 }

func moroccoRawMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                       dipDeg: Double? = nil, asrShadow: Double = 1, dipMaghribDeg: Double? = nil) -> DayMinutes {
    let dip = dipDeg ?? moroccoDipEast(0)
    let dipMaghrib = dipMaghribDeg ?? (dip + (moroccoDipWest(0) - moroccoDipEast(0)))
    let d0 = d0Of(year, month0, day)
    func at(_ t: Double) -> SunPosition { return meeusApparentSun(d0 + t / 1440) }
    var noon = 720 - 4 * lon
    for _ in 0..<3 { noon = 720 - 4 * lon - at(noon).eot }
    let sp = sin(lat * RAD), cp = cos(lat * RAD)
    let T = (d0 + noon / 1440) / 36525
    let Ma = (357.52911 + 35999.05029 * T) * RAD
    let horizon = -(34.0 / 60 + 0.26667 / (1.00014 - 0.016708 * cos(Ma) - 0.00014 * cos(2 * Ma)))
    func event(_ alt: Double, _ sign: Double, _ start: Double) -> Double {
        var t = start
        for _ in 0..<3 {
            let s = at(t)
            let c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if !(abs(c) <= 1) { return Double.nan }
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    let noonDec = at(noon).dec
    let noonTrue = 90 - abs(lat - noonDec / RAD)
    let noonApparent = noonTrue + refractionFromTrue(noonTrue)
    let asrApparent = atan(1 / (asrShadow + 1 / tan(noonApparent * RAD))) / RAD
    let asrTrue = asrApparent - refractionFromApparent(asrApparent)
    return DayMinutes(
        fajr: event(-19, -1, noon - 420) - 0.5,
        sunrise: event(horizon - dip, -1, noon - 360) + MOROCCO_SUNRISE_MARGIN,
        dhuhr: noon + 5,
        asr: event(asrTrue, 1, noon + 200),
        maghrib: event(horizon - dipMaghrib, 1, noon + 360) + MOROCCO_MAGHRIB_MARGIN,
        isha: event(-17, 1, noon + 420))
}

/// On the minute; nil where a time does not form.
func moroccoMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                    dipDeg: Double? = nil, asrShadow: Double = 1, dipMaghribDeg: Double? = nil) -> DayMinutes? {
    let r = moroccoRawMinutes(lat, lon, year, month0, day, dipDeg: dipDeg, asrShadow: asrShadow, dipMaghribDeg: dipMaghribDeg)
    if r.all.contains(where: { !$0.isFinite }) { return nil }
    return r.mapped { floor($0 + 0.5) }
}

// ---------------------------------------------------------------- Algeria

/// The six events before rounding; `maghrib` here is the sunset.
func algeriaRawMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int, asrShadow: Double = 1) -> DayMinutes {
    let d0 = d0Of(year, month0, day)
    func at(_ t: Double) -> SunPosition { return noaaSun(d0 + t / 1440) }
    var noon = 720 - 4 * lon
    for _ in 0..<3 { noon = 720 - 4 * lon - at(noon).eot }
    let transit = 720 - 4 * lon - at(noon).eot
    let sp = sin(lat * RAD), cp = cos(lat * RAD)
    func event(_ altitudeOf: (Double) -> Double, _ sign: Double, _ start: Double) -> Double {
        var t = start
        for _ in 0..<3 {
            let dec = at(t).dec
            let c = (sin(altitudeOf(dec) * RAD) - sp * sin(dec)) / (cp * cos(dec))
            if !(abs(c) <= 1) { return Double.nan }
            t = transit + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    func asrAltitude(_ dec: Double) -> Double { return atan(1 / (asrShadow + tan((lat - dec / RAD) * RAD))) / RAD }
    return DayMinutes(
        fajr: event({ _ in -18 }, -1, noon - 420),
        sunrise: event({ _ in -0.833 }, -1, noon - 360),
        dhuhr: noon,
        asr: event(asrAltitude, 1, noon + 200),
        maghrib: event({ _ in -0.833 }, 1, noon + 360),
        isha: event({ _ in -17 }, 1, noon + 420))
}

/// Rounded up to the minute, Maghrib three minutes after sunset; nil where a time does not form.
func algeriaMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int, asrShadow: Double = 1) -> DayMinutes? {
    var r = algeriaRawMinutes(lat, lon, year, month0, day, asrShadow: asrShadow)
    if r.all.contains(where: { !$0.isFinite }) { return nil }
    r.maghrib += 3
    return r.mapped { ceil($0 - 1e-9) }
}

// ---------------------------------------------------------------- Indonesia

func kemenagRawMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                       highland: Bool = false, twilightDip: Bool = false, asrShadow: Double = 1) -> DayMinutes {
    let d0 = d0Of(year, month0, day)
    // the ministry's program takes Universal Time for the ephemeris' time: no ΔT
    func at(_ t: Double) -> SunPosition { return preciseApparentSun(d0 + t / 1440, deltaTSeconds: 0) }
    var noon = 720 - 4 * lon
    for _ in 0..<3 { noon = 720 - 4 * lon - at(noon).eot }
    let sp = sin(lat * RAD), cp = cos(lat * RAD)
    func hourAngle(_ alt: Double, _ dec: Double) -> Double {
        let c = (sin(alt * RAD) - sp * sin(dec)) / (cp * cos(dec))
        return abs(c) <= 1 ? (4 * acos(c)) / RAD : Double.nan
    }
    func event(_ alt: Double, _ sign: Double, _ start: Double) -> Double {
        var t = start
        for _ in 0..<3 {
            let s = at(t)
            t = 720 - 4 * lon - s.eot + sign * hourAngle(alt, s.dec)
            if !t.isFinite { return Double.nan }
        }
        return t
    }
    let twilight: Double = twilightDip ? 1 : 0
    let horizon: Double = highland ? -2 : -1
    let shadowDec = at(0).dec
    let asrAlt = atan(1 / (asrShadow + tan(abs(lat * RAD - shadowDec)))) / RAD
    var asr = noon + 200
    for _ in 0..<4 {
        let s = at(asr)
        asr = 720 - 4 * lon - s.eot + hourAngle(asrAlt, s.dec)
    }
    return DayMinutes(
        fajr: event(-20 - twilight, -1, noon - 420) + 2,
        sunrise: event(horizon, -1, noon - 360) + -3,
        dhuhr: noon + 3,
        asr: asr + 2,
        maghrib: event(horizon, 1, noon + 360) + 2,
        isha: event(-18 - twilight, 1, noon + 420) + 2)
}

func kemenagMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                    highland: Bool = false, twilightDip: Bool = false, asrShadow: Double = 1,
                    afternoon: (Double, Double)? = nil) -> DayMinutes? {
    var r = kemenagRawMinutes(lat, lon, year, month0, day, highland: highland, twilightDip: twilightDip, asrShadow: asrShadow)
    if let pmPoint = afternoon {
        let pm = kemenagRawMinutes(pmPoint.0, pmPoint.1, year, month0, day, highland: highland, twilightDip: twilightDip, asrShadow: asrShadow)
        r.asr = pm.asr
        r.maghrib = pm.maghrib
        r.isha = pm.isha
    }
    if r.all.contains(where: { !$0.isFinite }) { return nil }
    return r.mapped { ceil($0 - 1e-9) }
}

// ---------------------------------------------------------------- Türkiye Takvimi

private let TAKVIM_SOLSTICE_DECLINATION = 23.38
private let TAKVIM_HORIZON_MARGIN = 2.0
private let TAKVIM_HOLD_SEARCH_DAYS = 200

/// The calendar's temkin by its formula, minutes; a listed place carries its own.
public func takvimTemkin(_ lat: Double, heightM: Double = 250) -> Double {
    let phi = min(abs(lat), 62) * RAD
    let dec = TAKVIM_SOLSTICE_DECLINATION * RAD
    let depth = 0.8416 + 0.03924 * max(0, heightM).squareRoot()
    func hourAngle(_ alt: Double) -> Double {
        return acos(max(-1, min(1, (sin(alt * RAD) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec)))))
    }
    return ((hourAngle(-depth) - hourAngle(0)) / RAD) * 4
}

/// The sun's events of a day at a point, minutes past the day's 00:00 UT; NaN where one does not happen.
private struct TakvimEvents {
    let lat: Double, lon: Double, d0: Double
    let noon: Double, noonDec: Double, sp: Double, cp: Double

    init(_ lat: Double, _ lon: Double, _ key: Int) {
        self.lat = lat
        self.lon = lon
        let d0 = Double(key - J2000_DAYS) - 0.5
        self.d0 = d0
        var n = 720 - 4 * lon
        for _ in 0..<3 { n = 720 - 4 * lon - preciseApparentSun(d0 + n / 1440).eot }
        noon = n
        noonDec = preciseApparentSun(d0 + n / 1440).dec
        sp = sin(lat * RAD)
        cp = cos(lat * RAD)
    }

    func event(_ alt: Double, _ sign: Double, _ start: Double) -> Double {
        var t = start
        for _ in 0..<3 {
            let s = preciseApparentSun(d0 + t / 1440)
            let c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if !(abs(c) <= 1) { return Double.nan }
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }

    func asr(_ shadow: Double) -> Double {
        return event(atan(1 / (shadow + tan(abs(lat * RAD - noonDec)))) / RAD, 1, noon + 200)
    }
}

private func takvimReaches19(_ lat: Double, _ lon: Double, _ key: Int) -> Bool {
    let d0 = Double(key - J2000_DAYS) - 0.5
    func lowest(_ d: Double) -> Double { return abs(lat + preciseApparentSun(d).dec / RAD) - 90 }
    return min(lowest(d0 - lon / 360), lowest(d0 + 0.5)) <= -19
}

/// The day whose night times stand for this one: itself, or the last before it whose night reached 19°.
func takvimHeldNight(_ lat: Double, _ lon: Double, _ key: Int) -> Int {
    for i in 0...TAKVIM_HOLD_SEARCH_DAYS where takvimReaches19(lat, lon, key - i) { return key - i }
    return key
}

/// The calendar's times before rounding: the six the library gives, and İmsâk.
func takvimRawMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                      temkin: Double? = nil, asrShadow: Double = 1) -> (imsak: Double, times: DayMinutes) {
    let T = temkin ?? takvimTemkin(lat)
    let key = dayKey(year, month0, day)
    let today = TakvimEvents(lat, lon, key)
    let night = takvimHeldNight(lat, lon, key)
    let nightSun = night == key ? today : TakvimEvents(lat, lon, night)
    let ishaNight = takvimHeldNight(lat, lon, key + 1)
    let ishaDay = ishaNight == key + 1 ? key : ishaNight - 1
    let ishaSun = ishaDay == key ? today : TakvimEvents(lat, lon, ishaDay)
    let times = DayMinutes(
        fajr: nightSun.event(-18, -1, nightSun.noon - 420),
        sunrise: today.event(0, -1, today.noon - 360) - T - TAKVIM_HORIZON_MARGIN,
        dhuhr: today.noon + T,
        asr: today.asr(asrShadow) + T,
        maghrib: today.event(0, 1, today.noon + 360) + T + TAKVIM_HORIZON_MARGIN,
        isha: ishaSun.event(-17, 1, ishaSun.noon + 420) + T)
    return (nightSun.event(-19, -1, nightSun.noon - 420) - T, times)
}

/// Rounded up to the minute; Fajr is the calendar's Sabâh. Nil where a time does not form.
func takvimMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                   temkin: Double? = nil, asrShadow: Double = 1) -> DayMinutes? {
    let r = takvimRawMinutes(lat, lon, year, month0, day, temkin: temkin, asrShadow: asrShadow).times
    if r.all.contains(where: { !$0.isFinite }) { return nil }
    return r.mapped { ceil($0 - 1e-9) }
}

// ---------------------------------------------------------------- Kazakhstan

private func kzFix(_ a: Double, _ b: Double) -> Double { return a - b * floor(a / b) }

private func kzJulian(_ year: Int, _ month: Int, _ day: Int) -> Double {
    var y = Double(year), m = Double(month)
    if month <= 2 {
        y -= 1
        m += 12
    }
    let a = floor(y / 100)
    let b = 2 - a + floor(a / 4)
    return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + Double(day) + b - 1524.5
}

/// The method's sun: declination (degrees), equation of time (hours).
private func kzSun(_ jd: Double) -> (decl: Double, eqt: Double) {
    let D = jd - 2451545.0
    let g = kzFix(357.529 + 0.98560028 * D, 360)
    let q = kzFix(280.459 + 0.98564736 * D, 360)
    let L = kzFix(q + 1.915 * sin(g * RAD) + 0.02 * sin(2 * g * RAD), 360)
    let e = 23.439 - 0.00000036 * D
    let ra = atan2(cos(e * RAD) * sin(L * RAD), cos(L * RAD)) / RAD / 15
    return (asin(sin(e * RAD) * sin(L * RAD)) / RAD, q / 15 - kzFix(ra, 24))
}

public func kazakhstanMargin(_ lat: Double) -> Double { return lat >= 48 ? 5 : 3 }

/// Before rounding: the six times, and the sunset the method prints beside Maghrib.
func kazakhstanRawMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int) -> (times: DayMinutes, sunset: Double) {
    let jd = kzJulian(year, month0 + 1, day) - lon / 360
    func midday(_ t: Double) -> Double { return kzFix(12 - kzSun(jd + t).eqt, 24) }
    func at(_ angle: Double, _ t: Double, _ before: Bool) -> Double {
        let decl = kzSun(jd + t).decl
        let x = (-sin(angle * RAD) - sin(decl * RAD) * sin(lat * RAD)) / (cos(decl * RAD) * cos(lat * RAD))
        if !(abs(x) <= 1) { return Double.nan }
        let h = acos(x) / RAD / 15
        return midday(t) + (before ? -h : h)
    }
    func asrAngle(_ t: Double) -> Double { return -atan(1 / (2 + tan(abs(lat - kzSun(jd + t).decl) * RAD))) / RAD }
    var fajr = at(15, 5.0 / 24, true)
    let sunrise = at(0.833, 6.0 / 24, true)
    let dhuhr = midday(12.0 / 24)
    let asr = at(asrAngle(13.0 / 24), 13.0 / 24, false)
    let sunset = at(0.833, 18.0 / 24, false)
    var isha = at(15, 18.0 / 24, false)
    let portion = (15.0 / 60) * kzFix(sunrise - sunset, 24)
    if !fajr.isFinite || kzFix(sunrise - fajr, 24) > portion { fajr = sunrise - portion }
    if !isha.isFinite || kzFix(isha - sunset, 24) > portion { isha = sunset + portion }
    let margin = kazakhstanMargin(lat)
    func ut(_ h: Double) -> Double { return (h - lon / 15) * 60 }
    return (DayMinutes(fajr: ut(fajr), sunrise: ut(sunrise) - margin, dhuhr: ut(dhuhr) + margin, asr: ut(asr) + margin,
                       maghrib: ut(sunset) + margin, isha: ut(isha)), ut(sunset))
}

/// Rounded to the nearest minute; Asr is the Hanafi one the table carries. Nil where a time does not form.
func kazakhstanMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int) -> DayMinutes? {
    let r = kazakhstanRawMinutes(lat, lon, year, month0, day).times
    if r.all.contains(where: { !$0.isFinite }) { return nil }
    return r.mapped { floor($0 + 0.5) }
}

// ---------------------------------------------------------------- Sweden and Diyanet: the Congress method

private let RISE_SET = -0.833
private let FAJR_ANGLE = -18.0
public let CONGRESS_ISHA_DEG = 16.0
public let DIYANET_ISHA_DEG = 17.0
private let TEMKIN_SUNRISE = -7.0, TEMKIN_DHUHR = 5.0, TEMKIN_ASR = 4.0, TEMKIN_MAGHRIB = 7.0
private let FLOOR = 300.0
private let BAND = 20.0
private let ANCHOR_SLACK = 1.0
private let SEARCH_DAYS = 200
private let SUN_INSTANT_S = -45.0
private let EOT_ADD_MIN = 0.00176
private let DAY_MS = 86_400_000.0

private func midsummerOf(_ k: Int) -> Int { return dayKey(yearOf(k), 5, 21) }

private func eotResidualS(_ L: Double) -> Double {
    return 0.033377 * sin(L) + 0.007721 * cos(L) - 0.000229 * sin(2 * L) + 0.004198 * cos(2 * L)
        - 0.02346 * sin(3 * L) - 0.026434 * cos(3 * L)
}

private func decResidualDeg(_ L: Double) -> Double {
    return -1.1539e-5 - 3.6174e-5 * sin(L) - 2.1101e-5 * cos(L) + 2.0235e-5 * sin(2 * L) - 2.2534e-5 * cos(2 * L)
}

private func congressSun(_ utcMs: Double) -> SunPosition {
    let T = (utcMs / DAY_MS - 10957.5) / 36525
    let L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    let M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD
    let C = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(M)
        + (0.019993 - 0.000101 * T) * sin(2 * M)
        + 0.000289 * sin(3 * M)
    let om = (125.04 - 1934.136 * T) * RAD
    let Ls = (280.4665 + 36000.7698 * T) * RAD
    let Lm = (218.3165 + 481267.8813 * T) * RAD
    let nut = (9.2 * cos(om) + 0.57 * cos(2 * Ls) + 0.1 * cos(2 * Lm) - 0.09 * cos(2 * om)) / 3600
    let eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + nut
    let lam = (L0 + C) * RAD
    let ra = wrap360(atan2(cos(eps * RAD) * sin(lam), cos(lam)) / RAD)
    let dec = asin(sin(eps * RAD) * sin(lam)) + decResidualDeg(L0 * RAD) * RAD
    let eot = (wrap360(L0 - ra + 180) - 180) * 4 + EOT_ADD_MIN - eotResidualS(L0 * RAD) / 60
    return SunPosition(dec: dec, eot: eot)
}

private final class Solar {
    let lat: Double
    let dec: Double
    let transit: Double

    init(day: Int, lat: Double, lon: Double) {
        self.lat = lat
        let s = congressSun(Double(day) * DAY_MS + SUN_INSTANT_S * 1000)
        dec = s.dec
        transit = 720 - 4 * lon - s.eot
    }

    private func hourAngle(_ alt: Double) -> Double? {
        let c = (sin(alt * RAD) - sin(lat * RAD) * sin(dec)) / (cos(lat * RAD) * cos(dec))
        if c < -1 || c > 1 { return nil }
        return (acos(c) / RAD) * 4
    }

    func rising(_ alt: Double) -> Double? { return hourAngle(alt).map { transit - $0 } }
    func setting(_ alt: Double) -> Double? { return hourAngle(alt).map { transit + $0 } }

    func asr(_ shadow: Double) -> Double? {
        let noonAlt = 90 - abs(lat - dec / RAD)
        if noonAlt <= 0 { return nil }
        let alt = atan(1 / (shadow + tan((90 - noonAlt) * RAD))) / RAD
        return setting(alt)
    }
}

private struct RiseSet {
    var sr: Double
    var ss: Double
    var held: Bool
}

private struct Ramp {
    let edge: Int
    let T: Double
    let far: Int?
    let bump: Bool
}

/// The method for one place and one year; what it needs of the year is worked out once.
public final class CongressYear {
    let lat: Double, lon: Double
    let year: Int
    let clockOffset: Int?
    let ishaAngle: Double
    private var solars: [Int: Solar] = [:]
    private var riseSets: [Int: RiseSet] = [:]
    private var ramps: [String: Ramp] = [:]
    private var extremes: [Int: (Double, Double)] = [:]
    private var carriedCache: [Int: (Double, Double)] = [:]
    private var ratioCache: Double??
    private var gapCache: (Int, Int)??
    private var floors: Bool?

    public init(lat: Double, lon: Double, year: Int, ishaDeg: Double = CONGRESS_ISHA_DEG, clockOffset: Int? = nil) {
        self.lat = lat
        self.lon = lon
        self.year = year
        self.clockOffset = clockOffset
        ishaAngle = -ishaDeg
    }

    private func solar(_ day: Int) -> Solar {
        if let s = solars[day] { return s }
        let s = Solar(day: day, lat: lat, lon: lon)
        solars[day] = s
        return s
    }

    /// Printed sunrise and Maghrib with the five-hour floors.
    private func riseSet(_ day: Int) -> RiseSet {
        if let c = riseSets[day] { return c }
        let s = solar(day)
        let dhuhr = s.transit + TEMKIN_DHUHR
        let half = FLOOR / 2
        let rawSr = s.rising(RISE_SET), rawSs = s.setting(RISE_SET)
        let nsr: Double, nss: Double
        if midsummerFloors(day) {
            let (hi, lo) = dhuhrExtremes(day)
            nsr = hi - 720 + half
            nss = lo + 720 - half
        } else {
            nsr = dhuhr - 720 + half
            nss = dhuhr + 720 - half
        }
        var sr: Double, ss: Double
        if let a = rawSr, let b = rawSs {
            sr = a + TEMKIN_SUNRISE
            ss = b + TEMKIN_MAGHRIB
        } else {
            let noonUp = 90 - abs(lat - s.dec / RAD) > RISE_SET
            sr = noonUp ? nsr : dhuhr - half
            ss = noonUp ? nss : dhuhr + half
        }
        sr = max(min(sr, dhuhr - half), nsr)
        ss = min(max(ss, dhuhr + half), nss)
        var held = false
        if midsummerFloors(day) {
            let mid = midsummerOf(day)
            if day == mid {
                held = true
            } else if day > mid {
                let prev = riseSet(day - 1)
                if prev.held && ss > prev.ss {
                    ss = prev.ss
                    held = true
                }
            }
        }
        let rs = RiseSet(sr: sr, ss: ss, held: held)
        riseSets[day] = rs
        return rs
    }

    private func dhuhrOf(_ day: Int) -> Double { return solar(day).transit + TEMKIN_DHUHR }

    private func maghribFloored(_ day: Int) -> Bool {
        let s = solar(day)
        guard let st = s.setting(RISE_SET) else { return true }
        return st + TEMKIN_MAGHRIB > s.transit + TEMKIN_DHUHR + 720 - FLOOR / 2
    }

    private func dhuhrExtremes(_ day: Int) -> (Double, Double) {
        if let c = extremes[day] { return c }
        let mid = midsummerOf(day)
        let out: (Double, Double)
        if day <= mid {
            var maxRun = dhuhrOf(day)
            if maghribFloored(day) {
                var d = day - 1
                while d > day - 120 && maghribFloored(d) {
                    maxRun = max(maxRun, dhuhrOf(d))
                    d -= 1
                }
            }
            out = (max(dhuhrOf(day), dhuhrOf(mid)), min(maxRun, dhuhrOf(mid)))
        } else {
            var hi = -Double.infinity, lo = Double.infinity
            for d in mid...day {
                let v = dhuhrOf(d)
                hi = max(hi, v)
                lo = min(lo, v)
            }
            out = (hi, lo)
        }
        extremes[day] = out
        return out
    }

    private func midsummerFloors(_ day: Int) -> Bool {
        if let f = floors { return f }
        let s = solar(midsummerOf(day))
        let dhuhr = s.transit + TEMKIN_DHUHR
        let half = FLOOR / 2
        let result: Bool
        if let sr = s.rising(RISE_SET), let ss = s.setting(RISE_SET) {
            let psr = max(sr + TEMKIN_SUNRISE, dhuhr - 720 + half)
            let pss = min(ss + TEMKIN_MAGHRIB, dhuhr + 720 - half)
            result = 1440 - (pss - psr) <= FLOOR + ANCHOR_SLACK
        } else {
            result = true
        }
        floors = result
        return result
    }

    private func night(_ day: Int) -> Double {
        let rs = riseSet(day)
        return 1440 - (rs.ss - rs.sr)
    }

    private func fajr18(_ day: Int) -> Double? { return solar(day).rising(FAJR_ANGLE) }
    private func isha16(_ day: Int) -> Double? { return solar(day).setting(ishaAngle) }
    private func trueTime(_ fajr: Bool, _ day: Int) -> Double? { return fajr ? fajr18(day) : isha16(day) }

    private func gapDays() -> (Int, Int)? {
        if let g = gapCache { return g }
        let mid = dayKey(year, 5, 21)
        let g: (Int, Int)?
        if fajr18(mid) != nil {
            if lat > 0, let isha = solar(mid).setting(-CONGRESS_ISHA_DEG), carriedRaw(mid).1 < isha {
                g = (mid, mid)
            } else {
                g = nil
            }
        } else {
            var a = mid
            while fajr18(a - 1) == nil && mid - a < SEARCH_DAYS { a -= 1 }
            var b = mid
            while fajr18(b + 1) == nil && b - mid < SEARCH_DAYS { b += 1 }
            g = (a, b)
        }
        gapCache = .some(g)
        return g
    }

    private func ratio() -> Double? {
        if let r = ratioCache { return r }
        var d = dayKey(year, 5, 21)
        var f = fajr18(d)
        var steps = 0
        while f == nil && steps < SEARCH_DAYS {
            d -= 1
            f = fajr18(d)
            steps += 1
        }
        let r: Double?
        if let fv = f {
            let ss = riseSet(d).ss
            let S = fv + 1440 - ss
            r = S / 3 / night(d)
        } else {
            r = nil
        }
        ratioCache = .some(r)
        return r
    }

    private func carriedRaw(_ day: Int) -> (Double, Double) {
        let r = ratio() ?? 0
        let rs = riseSet(day)
        let n = night(day)
        return (rs.sr - r * (FAJR_ANGLE / -CONGRESS_ISHA_DEG) * n, rs.ss + r * n)
    }

    private func carried(_ day: Int) -> (Double, Double) {
        if let c = carriedCache[day] { return c }
        let mid = midsummerOf(day)
        let out: (Double, Double)
        if !midsummerFloors(day) || day == mid {
            out = carriedRaw(day)
        } else if day < mid {
            let c = carriedRaw(day)
            let m = carried(mid)
            out = (max(c.0, m.0), min(c.1, m.1))
        } else {
            var prev = carried(mid)
            if mid + 1 < day {
                for d in (mid + 1)..<day {
                    if let c = carriedCache[d] {
                        prev = c
                    } else {
                        let raw = carriedRaw(d)
                        let c = (max(raw.0, prev.0), min(raw.1, prev.1))
                        carriedCache[d] = c
                        prev = c
                    }
                }
            }
            let raw = carriedRaw(day)
            out = (max(raw.0, prev.0), min(raw.1, prev.1))
        }
        carriedCache[day] = out
        return out
    }

    private func floorDiv(_ a: Double, _ b: Double) -> Double { return floor(a / b) }

    private func rampOf(_ sideIn: Bool, _ fajr: Bool) -> Ramp? {
        guard let gap = gapDays() else { return nil }
        let cacheKey = (sideIn ? "in" : "out") + (fajr ? "fajr" : "isha")
        if let r = ramps[cacheKey] { return r }
        let edge = sideIn ? gap.0 : gap.1
        let c = carried(edge)
        let T = fajr ? c.0 : c.1
        let step = sideIn ? -1 : 1
        var far: Int? = nil
        let first = trueTime(fajr, edge + step)
        var wrapped = false
        if !sideIn, fajr, let off = clockOffset, let f = first {
            let o = Double(off)
            wrapped = floorDiv(f + o, 1440) != floorDiv(T + o, 1440)
        }
        var d = edge + step
        while !wrapped && abs(d - edge) < SEARCH_DAYS {
            if let t = trueTime(fajr, d), abs(t - T) <= BAND {
                far = d
            } else if far != nil {
                break
            }
            d += step
        }
        let r = Ramp(edge: edge, T: T, far: far, bump: wrapped)
        ramps[cacheKey] = r
        return r
    }

    private func ramp(_ day: Int, _ sideIn: Bool, _ fajr: Bool) -> Double? {
        guard let r = rampOf(sideIn, fajr) else { return trueTime(fajr, day) }
        guard let far = r.far else { return trueTime(fajr, day) }
        let inside = sideIn ? (far <= day && day < r.edge) : (r.edge < day && day <= far)
        if !inside { return trueTime(fajr, day) }
        let sign: Double = fajr ? 1 : -1
        return r.T + (sign * BAND * Double(abs(day - r.edge))) / Double(abs(far - r.edge))
    }

    public func times(_ day: Int, asrShadow: Double = 1) -> DayMinutes {
        let s = solar(day)
        let rs = riseSet(day)
        let dhuhr = s.transit + TEMKIN_DHUHR
        var asr = s.asr(asrShadow).map { $0 + TEMKIN_ASR } ?? dhuhr
        asr = max(dhuhr, min(asr, rs.ss))
        var fajr = fajr18(day), isha = isha16(day)
        if let gap = gapDays() {
            if gap.0 <= day && day <= gap.1 {
                let c = carried(day)
                fajr = c.0
                isha = c.1
                if day == gap.0 || day == gap.1 {
                    let sideIn = day == gap.0
                    if let rf = rampOf(sideIn, true), rf.bump { fajr = c.0 + BAND }
                    if let ri = rampOf(sideIn, false), ri.bump { isha = c.1 - BAND }
                }
            } else if day < gap.0 {
                fajr = ramp(day, true, true)
                isha = ramp(day, true, false)
            } else {
                fajr = ramp(day, false, true)
                isha = ramp(day, false, false)
            }
        }
        return DayMinutes(fajr: fajr ?? rs.sr - 60, sunrise: rs.sr, dhuhr: dhuhr, asr: asr, maghrib: rs.ss, isha: isha ?? rs.ss + 60)
    }
}

private var congressYears: [String: CongressYear] = [:]
private var congressOrder: [String] = []

/// The Congress method's times, minutes past 00:00 UT of the date, unrounded. Not safe to call from several threads at once.
public func congressMinutes(_ lat: Double, _ lon: Double, _ year: Int, _ month0: Int, _ day: Int,
                            asrShadow: Double = 1, ishaDeg: Double = CONGRESS_ISHA_DEG, clockOffset: Int? = nil) -> DayMinutes {
    let key = String(format: "%.5f|%.5f|%d|%g|", lat, lon, year, ishaDeg) + (clockOffset.map { String($0) } ?? "-")
    let cy: CongressYear
    if let c = congressYears[key] {
        cy = c
    } else {
        if congressOrder.count >= 12 {
            congressYears.removeValue(forKey: congressOrder.removeFirst())
        }
        cy = CongressYear(lat: lat, lon: lon, year: year, ishaDeg: ishaDeg, clockOffset: clockOffset)
        congressYears[key] = cy
        congressOrder.append(key)
    }
    return cy.times(dayKey(year, month0, day), asrShadow: asrShadow)
}
