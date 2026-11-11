// The suns the methods take: Meeus's apparent sun (Morocco), NOAA's (Algeria)
// and the precise apparent sun (Indonesia). A port of src/methods/morocco.ts,
// src/methods/algeria.ts and src/sun/preciseSun.ts; the TypeScript is the
// reference, and the vector check holds this to it.
//
// Each takes `d`, days from J2000.0 (UT), and gives the declination in radians
// and the equation of time in minutes, such that the transit at longitude lon
// (east) is 720 - 4*lon - eot minutes UT.
//
// StrictMath, not Math: its functions are fdlibm's, bit for bit the same on
// every machine.
package mihrab.methods

import java.lang.StrictMath.asin
import java.lang.StrictMath.atan2
import java.lang.StrictMath.cos
import java.lang.StrictMath.floor
import java.lang.StrictMath.hypot
import java.lang.StrictMath.pow
import java.lang.StrictMath.sin
import java.lang.StrictMath.tan

internal const val RAD = Math.PI / 180.0

class SunPosition(val dec: Double, val eot: Double)

/** ((x % 360) + 360) % 360 as JavaScript computes it. */
internal fun wrap360(x: Double): Double = ((x % 360.0) + 360.0) % 360.0

fun meeusApparentSun(d: Double): SunPosition {
    val T = d / 36525.0
    val L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    val M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD
    val C = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(M) +
        (0.019993 - 0.000101 * T) * sin(2 * M) +
        0.000289 * sin(3 * M)
    val om = (125.04 - 1934.136 * T) * RAD
    val eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    val Lm = (280.4665 + 36000.7698 * T) * RAD
    val Lmoon = (218.3165 + 481267.8813 * T) * RAD
    val dpsi = (-17.2 * sin(om) - 1.32 * sin(2 * Lm) - 0.23 * sin(2 * Lmoon) + 0.21 * sin(2 * om)) / 3600
    val deps = (9.2 * cos(om) + 0.57 * cos(2 * Lm) + 0.1 * cos(2 * Lmoon) - 0.09 * cos(2 * om)) / 3600
    val lam = (L0 + C - 0.00569 + dpsi) * RAD
    val eps = (eps0 + deps) * RAD
    val ra = wrap360(atan2(cos(eps) * sin(lam), cos(lam)) / RAD)
    val dec = asin(sin(eps) * sin(lam))
    val E = L0 - 0.0057183 - ra + dpsi * cos(eps)
    return SunPosition(dec, (wrap360(E + 180) - 180) * 4)
}

fun noaaSun(d: Double): SunPosition {
    val T = d / 36525.0
    val L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    val M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
    val ecc = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    val Mr = M * RAD
    val C = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(Mr) +
        (0.019993 - 0.000101 * T) * sin(2 * Mr) +
        0.000289 * sin(3 * Mr)
    val om = (125.04 - 1934.136 * T) * RAD
    val lam = L0 + C - 0.00569 - 0.00478 * sin(om)
    val eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    val eps = eps0 + 0.00256 * cos(om)
    val dec = asin(sin(eps * RAD) * sin(lam * RAD))
    val th = tan((eps0 * RAD) / 2)
    val y = th * th
    val L0r = L0 * RAD
    // term by term, in the reference's order: the sum is rounded the same way
    val e1 = y * sin(2 * L0r) - 2 * ecc * sin(Mr)
    val e2 = e1 + 4 * ecc * y * sin(Mr) * cos(2 * L0r)
    val e3 = e2 - 0.5 * y * y * sin(4 * L0r)
    val e4 = e3 - 1.25 * ecc * ecc * sin(2 * Mr)
    return SunPosition(dec, (4 / RAD) * e4)
}

// ---- the precise apparent sun (VSOP87 truncated, IAU 2006 precession, IAU 2000B nutation, light time)

private const val ASEC2RAD = 4.848136811095359935899141e-6
private const val ASEC360 = 1296000.0
private const val C_AUDAY = 173.1446326846693
private const val DAYS_PER_MILLENNIUM = 365250.0

private fun s(vararg v: Double): Array<DoubleArray> = Array(v.size / 3) { doubleArrayOf(v[3 * it], v[3 * it + 1], v[3 * it + 2]) }

private val EARTH: Array<Array<Array<DoubleArray>>> = arrayOf(
    arrayOf(
        s(
            1.75347045673, 0.0, 0.0, 0.03341656453, 4.66925680415, 6283.0758499914, 0.00034894275, 4.62610242189, 12566.1516999828,
            0.00003417572, 2.82886579754, 3.523118349, 0.00003497056, 2.74411783405, 5753.3848848968, 0.00003135899, 3.62767041756, 77713.7714681205,
            0.00002676218, 4.41808345438, 7860.4193924392, 0.00002342691, 6.13516214446, 3930.2096962196, 0.00001273165, 2.03709657878, 529.6909650946,
            0.00001324294, 0.74246341673, 11506.7697697936, 0.00000901854, 2.04505446477, 26.2983197998, 0.00001199167, 1.10962946234, 1577.3435424478,
            0.00000857223, 3.50849152283, 398.1490034082, 0.00000779786, 1.17882681962, 5223.6939198022, 0.0000099025, 5.23268072088, 5884.9268465832,
            0.00000753141, 2.53339052847, 5507.5532386674, 0.00000505267, 4.58292599973, 18849.2275499742, 0.00000492392, 4.20505711826, 775.522611324,
            0.00000356672, 2.91954114478, 0.0673103028, 0.00000284125, 1.89869240932, 796.2980068164, 0.00000242879, 0.34481445893, 5486.777843175,
            0.00000317087, 5.84901948512, 11790.6290886588, 0.00000271112, 0.31486255375, 10977.078804699, 0.00000206217, 4.80646631478, 2544.3144198834,
            0.00000205478, 1.86953770281, 5573.1428014331, 0.00000202318, 2.45767790232, 6069.7767545534, 0.00000126225, 1.08295459501, 20.7753954924,
            0.00000155516, 0.83306084617, 213.299095438,
        ),
        s(6283.0758499914, 0.0, 0.0, 0.00206058863, 2.67823455808, 6283.0758499914, 0.00004303419, 2.63512233481, 12566.1516999828),
        s(0.00008721859, 1.07253635559, 6283.0758499914),
    ),
    arrayOf(s(), s(0.00227777722, 3.4137662053, 6283.0758499914, 0.00003805678, 3.37063423795, 12566.1516999828)),
    arrayOf(
        s(
            1.00013988784, 0.0, 0.0, 0.01670699632, 3.09846350258, 6283.0758499914, 0.00013956024, 3.05524609456, 12566.1516999828,
            0.0000308372, 5.19846674381, 77713.7714681205, 0.00001628463, 1.17387558054, 5753.3848848968, 0.00001575572, 2.84685214877, 7860.4193924392,
            0.00000924799, 5.45292236722, 11506.7697697936, 0.00000542439, 4.56409151453, 3930.2096962196, 0.0000047211, 3.66100022149, 5884.9268465832,
            0.00000085831, 1.27079125277, 161000.6857376741, 0.00000057056, 2.01374292245, 83996.84731811189, 0.00000055736, 5.2415979917, 71430.69561812909,
            0.00000174844, 3.01193636733, 18849.2275499742, 0.00000243181, 4.2734953079, 11790.6290886588,
        ),
        s(0.00103018607, 1.10748968172, 6283.0758499914, 0.00001721238, 1.06442300386, 12566.1516999828),
        s(0.00004359385, 5.78455133808, 6283.0758499914),
    ),
)

private fun vsop(formula: Array<Array<DoubleArray>>, t: Double, clamp: Boolean): Double {
    var tp = 1.0
    var out = 0.0
    for (series in formula) {
        var sum = 0.0
        for (term in series) sum += term[0] * cos(term[1] + t * term[2])
        var incr = tp * sum
        if (clamp) incr %= 2 * Math.PI
        out += incr
        tp *= t
    }
    return out
}

private fun earthJ2000(tt: Double): DoubleArray {
    val t = tt / DAYS_PER_MILLENNIUM
    val lon = vsop(EARTH[0], t, true)
    val lat = vsop(EARTH[1], t, false)
    val r = vsop(EARTH[2], t, false)
    val x = r * cos(lat) * cos(lon)
    val y = r * cos(lat) * sin(lon)
    val z = r * sin(lat)
    return doubleArrayOf(
        x + 0.00000044036 * y - 0.000000190919 * z,
        -0.000000479966 * x + 0.917482137087 * y - 0.397776982902 * z,
        0.397776982902 * y + 0.917482137087 * z,
    )
}

/** ΔT in seconds for UT days from J2000 (Espenak & Meeus), held at its 2017 value onward. */
fun deltaT(ut: Double): Double {
    val y = 2000 + (minOf(ut, 17 * 365.24217) - 14) / 365.24217
    if (y >= 2005 && y < 2050) {
        val u = y - 2000
        return 62.92 + 0.32217 * u + 0.005589 * u * u
    }
    if (y >= 2050 && y < 2150) {
        val u = (y - 1820) / 100
        return -20 + 32 * u * u - 0.5628 * (2150 - y)
    }
    if (y >= 1986 && y < 2005) {
        val u = y - 2000
        return 63.86 + 0.3345 * u - 0.060374 * pow(u, 2.0) + 0.0017275 * pow(u, 3.0) + 0.000651814 * pow(u, 4.0) + 0.00002373599 * pow(u, 5.0)
    }
    val u = (y - 1820) / 100
    return -20 + 32 * u * u
}

private fun nutation(tt: Double): DoubleArray {
    fun mod(x: Double) = (x % ASEC360) * ASEC2RAD
    val t = tt / 36525
    val elp = mod(1287104.79305 + t * 129596581.0481)
    val f = mod(335779.526232 + t * 1739527262.8478)
    val d = mod(1072260.70369 + t * 1602961601.209)
    val om = mod(450160.398036 - t * 6962890.5431)
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
    return doubleArrayOf(-0.000135 + dp * 1e-7, 0.000388 + de * 1e-7)
}

private fun meanObliquity(tt: Double): Double {
    val t = tt / 36525
    return ((((-0.0000000434 * t - 0.000000576) * t + 0.0020034) * t - 0.0001831) * t - 46.836769) * t + 84381.406
}

private fun precess(v: DoubleArray, tt: Double): DoubleArray {
    val t = tt / 36525
    val eps0 = 84381.406 * ASEC2RAD
    val psia = (((((-0.0000000951 * t + 0.000132851) * t - 0.00114045) * t - 1.0790069) * t + 5038.481507) * t) * ASEC2RAD
    val omegaa = (((((0.0000003337 * t - 0.000000467) * t - 0.00772503) * t + 0.0512623) * t - 0.025754) * t + 84381.406) * ASEC2RAD
    val chia = (((((-0.000000056 * t + 0.000170663) * t - 0.00121197) * t - 2.3814292) * t + 10.556403) * t) * ASEC2RAD
    val sa = sin(eps0); val ca = cos(eps0)
    val sb = sin(-psia); val cb = cos(-psia)
    val sc = sin(-omegaa); val cc = cos(-omegaa)
    val sd = sin(chia); val cd = cos(chia)
    val xx = cd * cb - sb * sd * cc
    val yx = cd * sb * ca + sd * cc * cb * ca - sa * sd * sc
    val zx = cd * sb * sa + sd * cc * cb * sa + ca * sd * sc
    val xy = -sd * cb - sb * cd * cc
    val yy = -sd * sb * ca + cd * cc * cb * ca - sa * cd * sc
    val zy = -sd * sb * sa + cd * cc * cb * sa + ca * cd * sc
    val xz = sb * sc
    val yz = -sc * cb * ca - sa * cc
    val zz = -sc * cb * sa + cc * ca
    return doubleArrayOf(xx * v[0] + yx * v[1] + zx * v[2], xy * v[0] + yy * v[1] + zy * v[2], xz * v[0] + yz * v[1] + zz * v[2])
}

private fun nutate(v: DoubleArray, oblm: Double, oblt: Double, psi: Double): DoubleArray {
    val cobm = cos(oblm); val sobm = sin(oblm)
    val cobt = cos(oblt); val sobt = sin(oblt)
    val cpsi = cos(psi); val spsi = sin(psi)
    val xx = cpsi
    val yx = -spsi * cobm
    val zx = -spsi * sobm
    val xy = spsi * cobt
    val yy = cpsi * cobm * cobt + sobm * sobt
    val zy = cpsi * sobm * cobt - cobm * sobt
    val xz = spsi * sobt
    val yz = cpsi * cobm * sobt - sobm * cobt
    val zz = cpsi * sobm * sobt + cobm * cobt
    return doubleArrayOf(xx * v[0] + yx * v[1] + zx * v[2], xy * v[0] + yy * v[1] + zy * v[2], xz * v[0] + yz * v[1] + zz * v[2])
}

/** `deltaTSeconds`: what is added to UT for the ephemeris' time; ΔT itself when null. */
fun preciseApparentSun(d: Double, deltaTSeconds: Double? = null): SunPosition {
    val dt = deltaTSeconds ?: deltaT(d)
    val tt = d + dt / 86400
    val e = earthJ2000(tt - 1 / C_AUDAY)
    val nut = nutation(tt)
    val dpsi = nut[0]
    val deps = nut[1]
    val mobl = meanObliquity(tt)
    val oblm = (mobl / 3600) * RAD
    val oblt = ((mobl + deps) / 3600) * RAD
    val v = nutate(precess(doubleArrayOf(-e[0], -e[1], -e[2]), tt), oblm, oblt, dpsi * ASEC2RAD)
    val ra = atan2(v[1], v[0]) / RAD
    val dec = atan2(v[2], hypot(v[0], v[1]))
    val t = tt / 36525
    val era = 360 * (((0.779057273264 + 0.00273781191135448 * d + (d % 1)) % 1) + 1)
    val eqeq = dpsi * cos(oblm)
    val st = eqeq + 0.014506 + ((((-0.0000000368 * t - 0.000029956) * t - 0.00000044) * t + 1.3915817) * t + 4612.156534) * t
    val gast = era + st / 3600
    val tmin = (d - floor(d + 0.5) + 0.5) * 1440
    val eotDeg = ((((gast - ra - (tmin - 720) / 4 + 180) % 360) + 360) % 360) - 180
    return SunPosition(dec, 4 * eotDeg)
}
