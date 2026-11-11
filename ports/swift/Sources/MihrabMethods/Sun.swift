// The suns the methods take: Meeus's apparent sun (Morocco), NOAA's (Algeria)
// and the precise apparent sun (Indonesia). A port of src/methods/morocco.ts,
// src/methods/algeria.ts and src/sun/preciseSun.ts; the TypeScript is the
// reference, and the vector check holds this to it.
//
// Each takes `d`, days from J2000.0 (UT), and gives the declination in radians
// and the equation of time in minutes, such that the transit at longitude lon
// (east) is 720 - 4*lon - eot minutes UT.
import Foundation

let RAD = Double.pi / 180.0

struct SunPosition {
    let dec: Double
    let eot: Double
}

/// ((x % 360) + 360) % 360 as JavaScript computes it.
func wrap360(_ x: Double) -> Double {
    return fmod(fmod(x, 360.0) + 360.0, 360.0)
}

func meeusApparentSun(_ d: Double) -> SunPosition {
    let T = d / 36525.0
    let L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    let M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD
    let C = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(M)
        + (0.019993 - 0.000101 * T) * sin(2 * M)
        + 0.000289 * sin(3 * M)
    let om = (125.04 - 1934.136 * T) * RAD
    let eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    let Lm = (280.4665 + 36000.7698 * T) * RAD
    let Lmoon = (218.3165 + 481267.8813 * T) * RAD
    let dpsi = (-17.2 * sin(om) - 1.32 * sin(2 * Lm) - 0.23 * sin(2 * Lmoon) + 0.21 * sin(2 * om)) / 3600
    let deps = (9.2 * cos(om) + 0.57 * cos(2 * Lm) + 0.1 * cos(2 * Lmoon) - 0.09 * cos(2 * om)) / 3600
    let lam = (L0 + C - 0.00569 + dpsi) * RAD
    let eps = (eps0 + deps) * RAD
    let ra = wrap360(atan2(cos(eps) * sin(lam), cos(lam)) / RAD)
    let dec = asin(sin(eps) * sin(lam))
    let E = L0 - 0.0057183 - ra + dpsi * cos(eps)
    return SunPosition(dec: dec, eot: (wrap360(E + 180) - 180) * 4)
}

func noaaSun(_ d: Double) -> SunPosition {
    let T = d / 36525.0
    let L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    let M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
    let ecc = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    let Mr = M * RAD
    let C = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(Mr)
        + (0.019993 - 0.000101 * T) * sin(2 * Mr)
        + 0.000289 * sin(3 * Mr)
    let om = (125.04 - 1934.136 * T) * RAD
    let lam = L0 + C - 0.00569 - 0.00478 * sin(om)
    let eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    let eps = eps0 + 0.00256 * cos(om)
    let dec = asin(sin(eps * RAD) * sin(lam * RAD))
    let th = tan((eps0 * RAD) / 2)
    let y = th * th
    let L0r = L0 * RAD
    // term by term, in the reference's order: the sum is rounded the same way
    let e1 = y * sin(2 * L0r) - 2 * ecc * sin(Mr)
    let e2 = e1 + 4 * ecc * y * sin(Mr) * cos(2 * L0r)
    let e3 = e2 - 0.5 * y * y * sin(4 * L0r)
    let e4 = e3 - 1.25 * ecc * ecc * sin(2 * Mr)
    return SunPosition(dec: dec, eot: (4 / RAD) * e4)
}

// ---- the precise apparent sun (VSOP87 truncated, IAU 2006 precession, IAU 2000B nutation, light time)

private let ASEC2RAD = 4.848136811095359935899141e-6
private let ASEC360 = 1296000.0
private let C_AUDAY = 173.1446326846693
private let DAYS_PER_MILLENNIUM = 365250.0

private let EARTH: [[[[Double]]]] = [
    [
        [
            [1.75347045673, 0, 0], [0.03341656453, 4.66925680415, 6283.0758499914], [0.00034894275, 4.62610242189, 12566.1516999828],
            [0.00003417572, 2.82886579754, 3.523118349], [0.00003497056, 2.74411783405, 5753.3848848968], [0.00003135899, 3.62767041756, 77713.7714681205],
            [0.00002676218, 4.41808345438, 7860.4193924392], [0.00002342691, 6.13516214446, 3930.2096962196], [0.00001273165, 2.03709657878, 529.6909650946],
            [0.00001324294, 0.74246341673, 11506.7697697936], [0.00000901854, 2.04505446477, 26.2983197998], [0.00001199167, 1.10962946234, 1577.3435424478],
            [0.00000857223, 3.50849152283, 398.1490034082], [0.00000779786, 1.17882681962, 5223.6939198022], [0.0000099025, 5.23268072088, 5884.9268465832],
            [0.00000753141, 2.53339052847, 5507.5532386674], [0.00000505267, 4.58292599973, 18849.2275499742], [0.00000492392, 4.20505711826, 775.522611324],
            [0.00000356672, 2.91954114478, 0.0673103028], [0.00000284125, 1.89869240932, 796.2980068164], [0.00000242879, 0.34481445893, 5486.777843175],
            [0.00000317087, 5.84901948512, 11790.6290886588], [0.00000271112, 0.31486255375, 10977.078804699], [0.00000206217, 4.80646631478, 2544.3144198834],
            [0.00000205478, 1.86953770281, 5573.1428014331], [0.00000202318, 2.45767790232, 6069.7767545534], [0.00000126225, 1.08295459501, 20.7753954924],
            [0.00000155516, 0.83306084617, 213.299095438],
        ],
        [[6283.0758499914, 0, 0], [0.00206058863, 2.67823455808, 6283.0758499914], [0.00004303419, 2.63512233481, 12566.1516999828]],
        [[0.00008721859, 1.07253635559, 6283.0758499914]],
    ],
    [[], [[0.00227777722, 3.4137662053, 6283.0758499914], [0.00003805678, 3.37063423795, 12566.1516999828]]],
    [
        [
            [1.00013988784, 0, 0], [0.01670699632, 3.09846350258, 6283.0758499914], [0.00013956024, 3.05524609456, 12566.1516999828],
            [0.0000308372, 5.19846674381, 77713.7714681205], [0.00001628463, 1.17387558054, 5753.3848848968], [0.00001575572, 2.84685214877, 7860.4193924392],
            [0.00000924799, 5.45292236722, 11506.7697697936], [0.00000542439, 4.56409151453, 3930.2096962196], [0.0000047211, 3.66100022149, 5884.9268465832],
            [0.00000085831, 1.27079125277, 161000.6857376741], [0.00000057056, 2.01374292245, 83996.84731811189], [0.00000055736, 5.2415979917, 71430.69561812909],
            [0.00000174844, 3.01193636733, 18849.2275499742], [0.00000243181, 4.2734953079, 11790.6290886588],
        ],
        [[0.00103018607, 1.10748968172, 6283.0758499914], [0.00001721238, 1.06442300386, 12566.1516999828]],
        [[0.00004359385, 5.78455133808, 6283.0758499914]],
    ],
]

private func vsop(_ formula: [[[Double]]], _ t: Double, _ clamp: Bool) -> Double {
    var tp = 1.0
    var out = 0.0
    for series in formula {
        var s = 0.0
        for term in series {
            s += term[0] * cos(term[1] + t * term[2])
        }
        var incr = tp * s
        if clamp { incr = fmod(incr, 2 * Double.pi) }
        out += incr
        tp *= t
    }
    return out
}

private func earthJ2000(_ tt: Double) -> (Double, Double, Double) {
    let t = tt / DAYS_PER_MILLENNIUM
    let lon = vsop(EARTH[0], t, true)
    let lat = vsop(EARTH[1], t, false)
    let r = vsop(EARTH[2], t, false)
    let x = r * cos(lat) * cos(lon)
    let y = r * cos(lat) * sin(lon)
    let z = r * sin(lat)
    return (x + 0.00000044036 * y - 0.000000190919 * z,
            -0.000000479966 * x + 0.917482137087 * y - 0.397776982902 * z,
            0.397776982902 * y + 0.917482137087 * z)
}

/// ΔT in seconds for UT days from J2000 (Espenak & Meeus), held at its 2017 value onward.
func deltaT(_ ut: Double) -> Double {
    let y = 2000 + (min(ut, 17 * 365.24217) - 14) / 365.24217
    if y >= 2005 && y < 2050 {
        let u = y - 2000
        return 62.92 + 0.32217 * u + 0.005589 * u * u
    }
    if y >= 2050 && y < 2150 {
        let u = (y - 1820) / 100
        return -20 + 32 * u * u - 0.5628 * (2150 - y)
    }
    if y >= 1986 && y < 2005 {
        let u = y - 2000
        return 63.86 + 0.3345 * u - 0.060374 * pow(u, 2) + 0.0017275 * pow(u, 3) + 0.000651814 * pow(u, 4) + 0.00002373599 * pow(u, 5)
    }
    let u = (y - 1820) / 100
    return -20 + 32 * u * u
}

private func nutation(_ tt: Double) -> (Double, Double) {
    func mod(_ x: Double) -> Double { return fmod(x, ASEC360) * ASEC2RAD }
    let t = tt / 36525
    let elp = mod(1287104.79305 + t * 129596581.0481)
    let f = mod(335779.526232 + t * 1739527262.8478)
    let d = mod(1072260.70369 + t * 1602961601.209)
    let om = mod(450160.398036 - t * 6962890.5431)
    var dp = (-172064161.0 - 174666.0 * t) * sin(om) + 33386.0 * cos(om)
    var de = (92052331.0 + 9086.0 * t) * cos(om) + 15377.0 * sin(om)
    var a = 2 * (f - d + om)
    dp += (-13170906.0 - 1675.0 * t) * sin(a) - 13696.0 * cos(a)
    de += (5730336.0 - 3015.0 * t) * cos(a) - 4587.0 * sin(a)
    a = 2 * (f + om)
    dp += (-2276413.0 - 234.0 * t) * sin(a) + 2796.0 * cos(a)
    de += (978459.0 - 485.0 * t) * cos(a) + 1374.0 * sin(a)
    a = 2 * om
    dp += (2074554.0 + 207.0 * t) * sin(a) - 698.0 * cos(a)
    de += (-897492.0 + 470.0 * t) * cos(a) - 291.0 * sin(a)
    dp += (1475877.0 - 3633.0 * t) * sin(elp) + 11817.0 * cos(elp)
    de += (73871.0 - 184.0 * t) * cos(elp) - 1924.0 * sin(elp)
    return (-0.000135 + dp * 1e-7, 0.000388 + de * 1e-7)
}

private func meanObliquity(_ tt: Double) -> Double {
    let t = tt / 36525
    return ((((-0.0000000434 * t - 0.000000576) * t + 0.0020034) * t - 0.0001831) * t - 46.836769) * t + 84381.406
}

private func precess(_ v: (Double, Double, Double), _ tt: Double) -> (Double, Double, Double) {
    let t = tt / 36525
    let eps0 = 84381.406 * ASEC2RAD
    let psia = (((((-0.0000000951 * t + 0.000132851) * t - 0.00114045) * t - 1.0790069) * t + 5038.481507) * t) * ASEC2RAD
    let omegaa = (((((0.0000003337 * t - 0.000000467) * t - 0.00772503) * t + 0.0512623) * t - 0.025754) * t + 84381.406) * ASEC2RAD
    let chia = (((((-0.000000056 * t + 0.000170663) * t - 0.00121197) * t - 2.3814292) * t + 10.556403) * t) * ASEC2RAD
    let sa = sin(eps0), ca = cos(eps0)
    let sb = sin(-psia), cb = cos(-psia)
    let sc = sin(-omegaa), cc = cos(-omegaa)
    let sd = sin(chia), cd = cos(chia)
    let xx = cd * cb - sb * sd * cc
    let yx = cd * sb * ca + sd * cc * cb * ca - sa * sd * sc
    let zx = cd * sb * sa + sd * cc * cb * sa + ca * sd * sc
    let xy = -sd * cb - sb * cd * cc
    let yy = -sd * sb * ca + cd * cc * cb * ca - sa * cd * sc
    let zy = -sd * sb * sa + cd * cc * cb * sa + ca * cd * sc
    let xz = sb * sc
    let yz = -sc * cb * ca - sa * cc
    let zz = -sc * cb * sa + cc * ca
    return (xx * v.0 + yx * v.1 + zx * v.2, xy * v.0 + yy * v.1 + zy * v.2, xz * v.0 + yz * v.1 + zz * v.2)
}

private func nutate(_ v: (Double, Double, Double), _ oblm: Double, _ oblt: Double, _ psi: Double) -> (Double, Double, Double) {
    let cobm = cos(oblm), sobm = sin(oblm)
    let cobt = cos(oblt), sobt = sin(oblt)
    let cpsi = cos(psi), spsi = sin(psi)
    let xx = cpsi
    let yx = -spsi * cobm
    let zx = -spsi * sobm
    let xy = spsi * cobt
    let yy = cpsi * cobm * cobt + sobm * sobt
    let zy = cpsi * sobm * cobt - cobm * sobt
    let xz = spsi * sobt
    let yz = cpsi * cobm * sobt - sobm * cobt
    let zz = cpsi * sobm * sobt + cobm * cobt
    return (xx * v.0 + yx * v.1 + zx * v.2, xy * v.0 + yy * v.1 + zy * v.2, xz * v.0 + yz * v.1 + zz * v.2)
}

/// `deltaTSeconds`: what is added to UT for the ephemeris' time; ΔT itself when nil.
func preciseApparentSun(_ d: Double, deltaTSeconds: Double? = nil) -> SunPosition {
    let dt = deltaTSeconds ?? deltaT(d)
    let tt = d + dt / 86400
    let e = earthJ2000(tt - 1 / C_AUDAY)
    let (dpsi, deps) = nutation(tt)
    let mobl = meanObliquity(tt)
    let oblm = (mobl / 3600) * RAD
    let oblt = ((mobl + deps) / 3600) * RAD
    let v = nutate(precess((-e.0, -e.1, -e.2), tt), oblm, oblt, dpsi * ASEC2RAD)
    let ra = atan2(v.1, v.0) / RAD
    let dec = atan2(v.2, hypot(v.0, v.1))
    let t = tt / 36525
    let era = 360 * (fmod(0.779057273264 + 0.00273781191135448 * d + fmod(d, 1), 1) + 1)
    let eqeq = dpsi * cos(oblm)
    let st = eqeq + 0.014506 + ((((-0.0000000368 * t - 0.000029956) * t - 0.00000044) * t + 1.3915817) * t + 4612.156534) * t
    let gast = era + st / 3600
    let tmin = (d - floor(d + 0.5) + 0.5) * 1440
    let eotDeg = fmod(fmod(gast - ra - (tmin - 720) / 4 + 180, 360) + 360, 360) - 180
    return SunPosition(dec: dec, eot: 4 * eotDeg)
}
