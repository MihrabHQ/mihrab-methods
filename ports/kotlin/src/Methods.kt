// The methods: Sweden and Diyanet (the Congress method), Morocco, Algeria,
// Indonesia, Türkiye Takvimi, Kazakhstan, Egypt, Brunei, Qatar, Kuwait, Jordan, Tatarstan, Russia's Central Muftiate, Albania, Bulgaria, Pakistan's Jamia Banuri Town, the United Arab Emirates, Iran's Institute of Geophysics and the United Kingdom's Wifaqul Ulama. A port of src/methods/*.ts — the TypeScript is the reference,
// docs/methods.md says what each does, and the vector check holds this to it.
//
// Every function takes a civil date with the month 0-based, as the TypeScript
// does, and gives minutes past 00:00 UT of that date.
package mihrab.methods

import java.lang.StrictMath.abs
import java.lang.StrictMath.acos
import java.lang.StrictMath.asin
import java.lang.StrictMath.atan
import java.lang.StrictMath.atan2
import java.lang.StrictMath.ceil
import java.lang.StrictMath.cos
import java.lang.StrictMath.floor
import java.lang.StrictMath.sin
import java.lang.StrictMath.sqrt
import java.lang.StrictMath.tan
import java.time.LocalDate

/** Whole days since 1970-01-01 of a civil date; a day past the month's end rolls over, as Date.UTC does. */
fun dayKey(year: Int, month0: Int, day: Int): Long = LocalDate.of(year, month0 + 1, 1).toEpochDay() + day - 1

internal fun yearOf(key: Long): Int = LocalDate.ofEpochDay(key).year

private const val J2000_DAYS = 10957L

/** Days from J2000.0 (noon) of the date's 00:00 UT. */
private fun d0Of(year: Int, month0: Int, day: Int): Double = (dayKey(year, month0, day) - J2000_DAYS).toDouble() - 0.5

class DayMinutes(var fajr: Double, var sunrise: Double, var dhuhr: Double, var asr: Double, var maghrib: Double, var isha: Double) {
    internal val allFinite: Boolean get() = doubleArrayOf(fajr, sunrise, dhuhr, asr, maghrib, isha).all { it.isFinite() }
    internal fun mapped(f: (Double) -> Double) = DayMinutes(f(fajr), f(sunrise), f(dhuhr), f(asr), f(maghrib), f(isha))
}

// ---------------------------------------------------------------- Morocco

const val MOROCCO_SUNRISE_MARGIN = -1.0
const val MOROCCO_MAGHRIB_MARGIN = 1.8

fun moroccoDipEast(heightM: Double): Double = 0.32 + 0.025 * sqrt(maxOf(heightM, 0.0))
fun moroccoDipWest(heightM: Double): Double = 0.37 + 0.021 * sqrt(maxOf(heightM, 0.0))

private fun refractionFromTrue(h: Double) = (1.02 / tan((h + 10.3 / (h + 5.11)) * RAD)) / 60
private fun refractionFromApparent(h: Double) = (1 / tan((h + 7.31 / (h + 4.4)) * RAD)) / 60

fun moroccoRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double? = null, asrShadow: Double = 1.0, dipMaghribDeg: Double? = null): DayMinutes {
    val dip = dipDeg ?: moroccoDipEast(0.0)
    val dipMaghrib = dipMaghribDeg ?: (dip + (moroccoDipWest(0.0) - moroccoDipEast(0.0)))
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    val T = (d0 + noon / 1440) / 36525
    val Ma = (357.52911 + 35999.05029 * T) * RAD
    val horizon = -(34.0 / 60 + 0.26667 / (1.00014 - 0.016708 * cos(Ma) - 0.00014 * cos(2 * Ma)))
    fun event(alt: Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val s = at(t)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    val noonDec = at(noon).dec
    val noonTrue = 90 - abs(lat - noonDec / RAD)
    val noonApparent = noonTrue + refractionFromTrue(noonTrue)
    val asrApparent = atan(1 / (asrShadow + 1 / tan(noonApparent * RAD))) / RAD
    val asrTrue = asrApparent - refractionFromApparent(asrApparent)
    return DayMinutes(
        fajr = event(-19.0, -1.0, noon - 420) - 0.5,
        sunrise = event(horizon - dip, -1.0, noon - 360) + MOROCCO_SUNRISE_MARGIN,
        dhuhr = noon + 5,
        asr = event(asrTrue, 1.0, noon + 200),
        maghrib = event(horizon - dipMaghrib, 1.0, noon + 360) + MOROCCO_MAGHRIB_MARGIN,
        isha = event(-17.0, 1.0, noon + 420),
    )
}

/** On the minute; null where a time does not form. */
fun moroccoMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double? = null, asrShadow: Double = 1.0, dipMaghribDeg: Double? = null): DayMinutes? {
    val r = moroccoRawMinutes(lat, lon, year, month0, day, dipDeg, asrShadow, dipMaghribDeg)
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- Algeria

/** The six events before rounding; `maghrib` here is the sunset. */
fun algeriaRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = noaaSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val transit = 720 - 4 * lon - at(noon).eot
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    fun event(altitudeOf: (Double) -> Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val dec = at(t).dec
            val c = (sin(altitudeOf(dec) * RAD) - sp * sin(dec)) / (cp * cos(dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = transit + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    // the signed noon shadow is a northern one: south of the equator, its length
    val asrAltitude = { dec: Double ->
        val noonShadow = tan((lat - dec / RAD) * RAD)
        atan(1 / (asrShadow + (if (lat >= 0) noonShadow else abs(noonShadow)))) / RAD
    }
    return DayMinutes(
        fajr = event({ -18.0 }, -1.0, noon - 420),
        sunrise = event({ -0.833 }, -1.0, noon - 360),
        dhuhr = noon,
        asr = event(asrAltitude, 1.0, noon + 200),
        maghrib = event({ -0.833 }, 1.0, noon + 360),
        isha = event({ -17.0 }, 1.0, noon + 420),
    )
}

/** Rounded up to the minute, Maghrib three minutes after sunset; null where a time does not form. */
fun algeriaMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? {
    val r = algeriaRawMinutes(lat, lon, year, month0, day, asrShadow)
    if (!r.allFinite) return null
    r.maghrib += 3
    return r.mapped { ceil(it - 1e-9) }
}

// ---------------------------------------------------------------- Indonesia

fun kemenagRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, highland: Boolean = false, twilightDip: Boolean = false, asrShadow: Double = 1.0): DayMinutes {
    val d0 = d0Of(year, month0, day)
    // the ministry's program takes Universal Time for the ephemeris' time: no ΔT
    fun at(t: Double) = preciseApparentSun(d0 + t / 1440, 0.0)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    fun hourAngle(alt: Double, dec: Double): Double {
        val c = (sin(alt * RAD) - sp * sin(dec)) / (cp * cos(dec))
        return if (abs(c) <= 1) (4 * acos(c)) / RAD else Double.NaN
    }
    fun event(alt: Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val s = at(t)
            t = 720 - 4 * lon - s.eot + sign * hourAngle(alt, s.dec)
            if (!t.isFinite()) return Double.NaN
        }
        return t
    }
    val twilight = if (twilightDip) 1.0 else 0.0
    val horizon = if (highland) -2.0 else -1.0
    val shadowDec = at(0.0).dec
    val asrAlt = atan(1 / (asrShadow + tan(abs(lat * RAD - shadowDec)))) / RAD
    var asr = noon + 200
    repeat(4) {
        val s = at(asr)
        asr = 720 - 4 * lon - s.eot + hourAngle(asrAlt, s.dec)
    }
    return DayMinutes(
        fajr = event(-20 - twilight, -1.0, noon - 420) + 2,
        sunrise = event(horizon, -1.0, noon - 360) + -3,
        dhuhr = noon + 3,
        asr = asr + 2,
        maghrib = event(horizon, 1.0, noon + 360) + 2,
        isha = event(-18 - twilight, 1.0, noon + 420) + 2,
    )
}

fun kemenagMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, highland: Boolean = false, twilightDip: Boolean = false, asrShadow: Double = 1.0, afternoon: Pair<Double, Double>? = null): DayMinutes? {
    val r = kemenagRawMinutes(lat, lon, year, month0, day, highland, twilightDip, asrShadow)
    if (afternoon != null) {
        val pm = kemenagRawMinutes(afternoon.first, afternoon.second, year, month0, day, highland, twilightDip, asrShadow)
        r.asr = pm.asr
        r.maghrib = pm.maghrib
        r.isha = pm.isha
    }
    return if (r.allFinite) r.mapped { ceil(it - 1e-9) } else null
}

// ---------------------------------------------------------------- Türkiye Takvimi

private const val TAKVIM_SOLSTICE_DECLINATION = 23.38
private const val TAKVIM_HORIZON_MARGIN = 2.0
private const val TAKVIM_HOLD_SEARCH_DAYS = 200

/** The calendar's temkin by its formula, minutes; a listed place carries its own. */
fun takvimTemkin(lat: Double, heightM: Double = 250.0): Double {
    val phi = minOf(abs(lat), 62.0) * RAD
    val dec = TAKVIM_SOLSTICE_DECLINATION * RAD
    val depth = 0.8416 + 0.03924 * sqrt(maxOf(0.0, heightM))
    fun hourAngle(alt: Double) = acos(maxOf(-1.0, minOf(1.0, (sin(alt * RAD) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec)))))
    return ((hourAngle(-depth) - hourAngle(0.0)) / RAD) * 4
}

/** The sun's events of a day at a point, minutes past the day's 00:00 UT; NaN where one does not happen. */
private class TakvimEvents(val lat: Double, val lon: Double, key: Long) {
    private val d0 = (key - J2000_DAYS).toDouble() - 0.5
    val noon: Double
    private val noonDec: Double
    private val sp = sin(lat * RAD)
    private val cp = cos(lat * RAD)

    init {
        var n = 720 - 4 * lon
        repeat(3) { n = 720 - 4 * lon - preciseApparentSun(d0 + n / 1440).eot }
        noon = n
        noonDec = preciseApparentSun(d0 + n / 1440).dec
    }

    fun event(alt: Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val s = preciseApparentSun(d0 + t / 1440)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }

    fun asr(shadow: Double): Double = event(atan(1 / (shadow + tan(abs(lat * RAD - noonDec)))) / RAD, 1.0, noon + 200)
}

private fun takvimReaches19(lat: Double, lon: Double, key: Long): Boolean {
    val d0 = (key - J2000_DAYS).toDouble() - 0.5
    fun lowest(d: Double) = abs(lat + preciseApparentSun(d).dec / RAD) - 90
    return minOf(lowest(d0 - lon / 360), lowest(d0 + 0.5)) <= -19
}

/** The day whose night times stand for this one: itself, or the last before it whose night reached 19°. */
fun takvimHeldNight(lat: Double, lon: Double, key: Long): Long {
    for (i in 0..TAKVIM_HOLD_SEARCH_DAYS) if (takvimReaches19(lat, lon, key - i)) return key - i
    return key
}

/** The calendar's times before rounding: the six the library gives, and İmsâk (first). */
fun takvimRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, temkin: Double? = null, asrShadow: Double = 1.0): Pair<Double, DayMinutes> {
    val T = temkin ?: takvimTemkin(lat)
    val key = dayKey(year, month0, day)
    val today = TakvimEvents(lat, lon, key)
    val night = takvimHeldNight(lat, lon, key)
    val nightSun = if (night == key) today else TakvimEvents(lat, lon, night)
    val ishaNight = takvimHeldNight(lat, lon, key + 1)
    val ishaDay = if (ishaNight == key + 1) key else ishaNight - 1
    val ishaSun = if (ishaDay == key) today else TakvimEvents(lat, lon, ishaDay)
    val times = DayMinutes(
        fajr = nightSun.event(-18.0, -1.0, nightSun.noon - 420),
        sunrise = today.event(0.0, -1.0, today.noon - 360) - T - TAKVIM_HORIZON_MARGIN,
        dhuhr = today.noon + T,
        asr = today.asr(asrShadow) + T,
        maghrib = today.event(0.0, 1.0, today.noon + 360) + T + TAKVIM_HORIZON_MARGIN,
        isha = ishaSun.event(-17.0, 1.0, ishaSun.noon + 420) + T,
    )
    return Pair(nightSun.event(-19.0, -1.0, nightSun.noon - 420) - T, times)
}

/** Rounded up to the minute; Fajr is the calendar's Sabâh. Null where a time does not form. */
fun takvimMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, temkin: Double? = null, asrShadow: Double = 1.0): DayMinutes? {
    val r = takvimRawMinutes(lat, lon, year, month0, day, temkin, asrShadow).second
    return if (r.allFinite) r.mapped { ceil(it - 1e-9) } else null
}

// ---------------------------------------------------------------- Kazakhstan

private fun kzFix(a: Double, b: Double): Double = a - b * floor(a / b)

private fun kzJulian(year: Int, month: Int, day: Int): Double {
    var y = year.toDouble()
    var m = month.toDouble()
    if (month <= 2) {
        y -= 1
        m += 12
    }
    val a = floor(y / 100)
    val b = 2 - a + floor(a / 4)
    return floor(365.25 * (y + 4716)) + floor(30.6001 * (m + 1)) + day + b - 1524.5
}

/** The method's sun: declination (degrees), equation of time (hours). */
private fun kzSun(jd: Double): DoubleArray {
    val D = jd - 2451545.0
    val g = kzFix(357.529 + 0.98560028 * D, 360.0)
    val q = kzFix(280.459 + 0.98564736 * D, 360.0)
    val L = kzFix(q + 1.915 * sin(g * RAD) + 0.02 * sin(2 * g * RAD), 360.0)
    val e = 23.439 - 0.00000036 * D
    val ra = atan2(cos(e * RAD) * sin(L * RAD), cos(L * RAD)) / RAD / 15
    return doubleArrayOf(asin(sin(e * RAD) * sin(L * RAD)) / RAD, q / 15 - kzFix(ra, 24.0))
}

fun kazakhstanMargin(lat: Double): Double = if (lat >= 48) 5.0 else 3.0

/** Before rounding: the six times, and second the sunset the method prints beside Maghrib. */
fun kazakhstanRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int): Pair<DayMinutes, Double> {
    val jd = kzJulian(year, month0 + 1, day) - lon / 360
    fun midday(t: Double) = kzFix(12 - kzSun(jd + t)[1], 24.0)
    fun at(angle: Double, t: Double, before: Boolean): Double {
        val decl = kzSun(jd + t)[0]
        val x = (-sin(angle * RAD) - sin(decl * RAD) * sin(lat * RAD)) / (cos(decl * RAD) * cos(lat * RAD))
        if (!(abs(x) <= 1)) return Double.NaN
        val h = acos(x) / RAD / 15
        return midday(t) + (if (before) -h else h)
    }
    fun asrAngle(t: Double) = -atan(1 / (2 + tan(abs(lat - kzSun(jd + t)[0]) * RAD))) / RAD
    var fajr = at(15.0, 5.0 / 24, true)
    val sunrise = at(0.833, 6.0 / 24, true)
    val dhuhr = midday(12.0 / 24)
    val asr = at(asrAngle(13.0 / 24), 13.0 / 24, false)
    val sunset = at(0.833, 18.0 / 24, false)
    var isha = at(15.0, 18.0 / 24, false)
    val portion = (15.0 / 60) * kzFix(sunrise - sunset, 24.0)
    if (!fajr.isFinite() || kzFix(sunrise - fajr, 24.0) > portion) fajr = sunrise - portion
    if (!isha.isFinite() || kzFix(isha - sunset, 24.0) > portion) isha = sunset + portion
    val margin = kazakhstanMargin(lat)
    fun ut(h: Double) = (h - lon / 15) * 60
    return Pair(DayMinutes(ut(fajr), ut(sunrise) - margin, ut(dhuhr) + margin, ut(asr) + margin, ut(sunset) + margin, ut(isha)), ut(sunset))
}

/** Rounded to the nearest minute; Asr is the Hanafi one the table carries. Null where a time does not form. */
fun kazakhstanMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int): DayMinutes? {
    val r = kazakhstanRawMinutes(lat, lon, year, month0, day).first
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- Egypt

/** Before rounding: Meeus's sun at each time's own moment; Asr's noon shadow from the declination of local noon. */
fun egyptRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    val asrAltitude = atan(1 / (asrShadow + tan(abs(lat * RAD - at(noon).dec)))) / RAD
    fun event(altitude: Double, sign: Double, start: Double): Double {
        var t = noon + start
        repeat(4) {
            val s = at(t)
            val c = (sin(altitude * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    return DayMinutes(
        fajr = event(-19.5, -1.0, -420.0),
        sunrise = event(-0.845, -1.0, -360.0),
        dhuhr = noon,
        asr = event(asrAltitude, 1.0, 200.0),
        maghrib = event(-0.845, 1.0, 360.0),
        isha = event(-17.5, 1.0, 420.0),
    )
}

/** Rounded to the nearest minute. Null where a time does not form. */
fun egyptMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? {
    val r = egyptRawMinutes(lat, lon, year, month0, day, asrShadow)
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- Brunei

const val BRUNEI_LAT = 4.892
const val BRUNEI_LON = 114.9355

/** The whole minutes a district adds to the capital's table: those its longitude lies west of the capital's. */
fun bruneiDistrictMinutes(lon: Double): Double = maxOf(0.0, floor((BRUNEI_LON - lon) * 4 + 0.5))

/** Before rounding: the capital's table from Meeus's sun at 0h UT of the date, plus the district's minutes. */
fun bruneiRawMinutes(lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val s = meeusApparentSun(d0Of(year, month0, day))
    val add = bruneiDistrictMinutes(lon)
    val transit = 720 - 4 * BRUNEI_LON - s.eot
    val sp = sin(BRUNEI_LAT * RAD)
    val cp = cos(BRUNEI_LAT * RAD)
    fun event(altitude: Double, sign: Double): Double {
        val c = (sin(altitude * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
        return transit + (sign * 4 * acos(c)) / RAD
    }
    val asrAltitude = atan(1 / (asrShadow + tan(abs(BRUNEI_LAT * RAD - s.dec)))) / RAD
    return DayMinutes(
        fajr = event(-20.0, -1.0) + add,
        sunrise = event(-0.833, -1.0) + add,
        dhuhr = transit + 1.06 + add,
        asr = event(asrAltitude, 1.0) + add,
        maghrib = event(-0.833, 1.0) + add,
        isha = event(-18.0, 1.0) + add,
    )
}

/** Rounded to the nearest minute. */
fun bruneiMinutes(lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? =
    bruneiRawMinutes(lon, year, month0, day, asrShadow).mapped { floor(it + 0.5) }

// ---------------------------------------------------------------- Qatar

/** Before rounding: Meeus's sun at each time's own moment, the calendar's margins; Isha ninety minutes on the rounded Maghrib. */
fun qatarRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val d0 = d0Of(year, month0, day)
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    fun event(altitude: Double, sign: Double, asr: Boolean = false): Double {
        var t = 720 - 4 * lon
        repeat(4) {
            val s = meeusApparentSun(d0 + t / 1440)
            val transit = 720 - 4 * lon - s.eot
            if (sign == 0.0) {
                t = transit
            } else {
                val a = if (asr) atan(1 / (asrShadow + tan(abs(lat * RAD - s.dec)))) / RAD else altitude
                val c = (sin(a * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
                if (!(abs(c) <= 1)) return Double.NaN
                t = transit + (sign * 4 * acos(c)) / RAD
            }
        }
        return t
    }
    val maghrib = event(-0.8333, 1.0) + 2.02
    return DayMinutes(
        fajr = event(-18.0, -1.0) - 1.12,
        sunrise = event(-0.8333, -1.0) - 0.1,
        dhuhr = event(0.0, 0.0) + 0.95,
        asr = event(0.0, 1.0, true) + 0.87,
        maghrib = maghrib,
        isha = floor(maghrib + 0.5) + 90,
    )
}

/** Rounded to the nearest minute. Null where a time does not form. */
fun qatarMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? {
    val r = qatarRawMinutes(lat, lon, year, month0, day, asrShadow)
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- Kuwait

const val KUWAIT_LAT = 29.33
const val KUWAIT_LON = 48.005
const val KUWAIT_TABLE_YEAR = 1978

/** The whole minutes an area adds to the city's table (west later, east earlier). */
fun kuwaitAreaMinutes(lon: Double): Double = floor((KUWAIT_LON - lon) * 4 + 0.5)

/** Before rounding: Kuwait City's table — the day of 1978, whatever the year — plus the area's minutes. */
fun kuwaitRawMinutes(lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val d0 = d0Of(KUWAIT_TABLE_YEAR, month0, if (month0 == 1 && day == 29) 28 else day)
    val add = kuwaitAreaMinutes(lon)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * KUWAIT_LON
    repeat(3) { noon = 720 - 4 * KUWAIT_LON - at(noon).eot }
    val sp = sin(KUWAIT_LAT * RAD)
    val cp = cos(KUWAIT_LAT * RAD)
    val asrAltitude = atan(1 / (asrShadow + tan(abs(KUWAIT_LAT * RAD - at(noon).dec)))) / RAD
    fun event(altitude: Double, sign: Double, start: Double): Double {
        var t = noon + start
        repeat(4) {
            val s = at(t)
            val c = (sin(altitude * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            t = 720 - 4 * KUWAIT_LON - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    return DayMinutes(
        fajr = event(-18.0, -1.0, -420.0) + add,
        sunrise = event(-0.8333, -1.0, -360.0) + add,
        dhuhr = noon + add,
        asr = event(asrAltitude, 1.0, 200.0) + 0.15 + add,
        maghrib = event(-0.8333, 1.0, 360.0) + add,
        isha = event(-17.5, 1.0, 420.0) + add,
    )
}

/** Rounded to the nearest minute. */
fun kuwaitMinutes(lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? =
    kuwaitRawMinutes(lon, year, month0, day, asrShadow).mapped { floor(it + 0.5) }

// ---------------------------------------------------------------- Jordan

/** Before rounding: Morocco's kind of program with Jordan's figures — 18° and 18°, the zone's horizon allowances, its Fajr margin. */
fun jordanRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double = 0.0, asrShadow: Double = 1.0, dipMaghribDeg: Double? = null, fajrMinutes: Double = 0.0): DayMinutes {
    val dipMaghrib = dipMaghribDeg ?: dipDeg
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    val T = (d0 + noon / 1440) / 36525
    val Ma = (357.52911 + 35999.05029 * T) * RAD
    val horizon = -(34.0 / 60 + 0.26667 / (1.00014 - 0.016708 * cos(Ma) - 0.00014 * cos(2 * Ma)))
    fun event(alt: Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val s = at(t)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    val noonTrue = 90 - abs(lat - at(noon).dec / RAD)
    val noonApparent = noonTrue + refractionFromTrue(noonTrue)
    val asrApparent = atan(1 / (asrShadow + 1 / tan(noonApparent * RAD))) / RAD
    val asrTrue = asrApparent - refractionFromApparent(asrApparent)
    return DayMinutes(
        fajr = event(-18.0, -1.0, noon - 420) + fajrMinutes,
        sunrise = event(horizon - dipDeg, -1.0, noon - 360),
        dhuhr = noon,
        asr = event(asrTrue, 1.0, noon + 200),
        maghrib = event(horizon - dipMaghrib, 1.0, noon + 360),
        isha = event(-18.0, 1.0, noon + 420),
    )
}

/** Rounded to the nearest minute. Null where a time does not form. */
fun jordanMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double = 0.0, asrShadow: Double = 1.0, dipMaghribDeg: Double? = null, fajrMinutes: Double = 0.0): DayMinutes? {
    val r = jordanRawMinutes(lat, lon, year, month0, day, dipDeg, asrShadow, dipMaghribDeg, fajrMinutes)
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- Tatarstan

/** As printed, whole minutes: the dawn at 18° rounded down, the rest rounded up, Asr at two shadows on the apparent sun, Isha at 15°; where the 18° twilight does not form, the dawn 121 minutes before sunrise and Isha 90 after Maghrib. Null where a time does not form. */
fun tatarstanMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double = 0.0): DayMinutes? {
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    fun event(alt: Double, sign: Double): Double {
        var t = noon + sign * 300
        var forms = true
        repeat(6) {
            val s = at(t)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            forms = abs(c) <= 1
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(maxOf(-1.0, minOf(1.0, c)))) / RAD
        }
        return if (forms) t else Double.NaN
    }
    val noonTrue = 90 - abs(lat - at(noon).dec / RAD)
    val noonApparent = noonTrue + refractionFromTrue(noonTrue)
    val asrApparent = atan(1 / (2 + 1 / tan(noonApparent * RAD))) / RAD
    val asr = event(asrApparent - refractionFromApparent(asrApparent), 1.0)
    val rise = event(-(0.8333 + dipDeg), -1.0)
    val sset = event(-(0.8333 + dipDeg), 1.0)
    if (!(rise.isFinite() && sset.isFinite() && asr.isFinite())) return null
    val sunrise = ceil(rise)
    val maghrib = ceil(sset)
    val dawn = event(-18.0, -1.0)
    val dusk = event(-18.0, 1.0)
    return DayMinutes(
        fajr = if (dawn.isFinite()) floor(dawn) else sunrise - 121,
        sunrise = sunrise,
        dhuhr = ceil(noon),
        asr = ceil(asr),
        maghrib = maghrib,
        isha = if (dusk.isFinite()) ceil(event(-15.0, 1.0)) else maghrib + 90,
    )
}

// ---------------------------------------------------------------- Russia: the Central Muftiate

/** The six with margin and rounding, whole minutes; NaN where the sun does not reach a time's altitude. */
private fun cdumPrinted(lat: Double, lon: Double, year: Int, month0: Int, day: Int): DayMinutes {
    val jd = kzJulian(year, month0 + 1, day) - lon / 360
    fun midday(t: Double) = kzFix(12 - kzSun(jd + t)[1], 24.0)
    fun at(angle: Double, t: Double, before: Boolean): Double {
        val decl = kzSun(jd + t)[0]
        val x = (-sin(angle * RAD) - sin(decl * RAD) * sin(lat * RAD)) / (cos(decl * RAD) * cos(lat * RAD))
        if (!(abs(x) <= 1)) return Double.NaN
        val h = acos(x) / RAD / 15
        return midday(t) + (if (before) -h else h)
    }
    val asrAngle = -atan(1 / (2 + tan(abs(lat - kzSun(jd + 13.0 / 24)[0]) * RAD))) / RAD
    fun minute(h: Double, margin: Double) = floor((h - lon / 15) * 60 + margin + 0.5)
    return DayMinutes(
        fajr = minute(at(18.0, 5.0 / 24, true), -2.0),
        sunrise = minute(at(0.833, 6.0 / 24, true), -2.0),
        dhuhr = minute(midday(12.0 / 24), 2.0),
        asr = minute(at(asrAngle, 13.0 / 24, false), 2.0),
        maghrib = minute(at(0.833, 18.0 / 24, false), 2.0),
        isha = minute(at(17.0, 18.0 / 24, false), 2.0),
    )
}

/** As printed, whole minutes: Kazakhstan's sun and arithmetic, Fajr at 18° and Isha at 17°, Asr at two shadows, 2 minutes' margin on every time and the nearest minute; where the twilight does not form, the 45th parallel's share of the night, on the printed minutes, cut to the minute. Null where the sun does not rise or set. */
fun cdumMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int): DayMinutes? {
    val p = cdumPrinted(lat, lon, year, month0, day)
    if (!(p.sunrise.isFinite() && p.dhuhr.isFinite() && p.asr.isFinite() && p.maghrib.isFinite())) return null
    if (p.fajr.isFinite() && p.isha.isFinite()) return p
    val r = cdumPrinted(45.0, lon, year, month0, day)
    val night = 1440 - (p.maghrib - p.sunrise)
    val there = 1440 - (r.maghrib - r.sunrise)
    return DayMinutes(
        fajr = if (p.fajr.isFinite()) p.fajr else p.sunrise - ceil((r.sunrise - r.fajr) * night / there),
        sunrise = p.sunrise,
        dhuhr = p.dhuhr,
        asr = p.asr,
        maghrib = p.maghrib,
        isha = if (p.isha.isFinite()) p.isha else p.maghrib + floor((r.isha - r.maghrib) * night / there),
    )
}

// ---------------------------------------------------------------- Albania and Bulgaria: a reference town's table

/** The town a table is computed at, when the day's sun is taken (days after 0h UT of the date), and the margins. */
class TownTable(val lat: Double, val lon: Double, val sunAt: Double, val margins: DoubleArray)

val ALBANIA_TABLE = TownTable(41.3333, 19.8167, 0.0, doubleArrayOf(0.0, -7.0, 5.0, 4.0, 7.0, 0.0))
val BULGARIA_TABLE = TownTable(42.708, 23.3219, -13.0 / 24, doubleArrayOf(-1.0, -7.0, 5.0, 4.0, 7.0, 0.0))

/** The whole minutes a town adds to the reference town's table (west later, east earlier). */
fun townMinutes(table: TownTable, lon: Double): Double = floor((table.lon - lon) * 4 + 0.5)

/** Before rounding: the reference town's table — the sun taken once for the whole day — plus the town's minutes. */
fun townTableRawMinutes(table: TownTable, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val s = meeusApparentSun(d0Of(year, month0, day) + table.sunAt)
    val add = townMinutes(table, lon)
    val noon = 720 - 4 * table.lon - s.eot
    val sp = sin(table.lat * RAD)
    val cp = cos(table.lat * RAD)
    fun event(altitude: Double, sign: Double): Double {
        val c = (sin(altitude * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
        return noon + (sign * 4 * acos(c)) / RAD
    }
    val asrAltitude = atan(1 / (asrShadow + tan(abs(table.lat * RAD - s.dec)))) / RAD
    val m = table.margins
    return DayMinutes(
        fajr = event(-18.0, -1.0) + m[0] + add,
        sunrise = event(-0.8333, -1.0) + m[1] + add,
        dhuhr = noon + m[2] + add,
        asr = event(asrAltitude, 1.0) + m[3] + add,
        maghrib = event(-0.8333, 1.0) + m[4] + add,
        isha = event(-17.0, 1.0) + m[5] + add,
    )
}

/** Tirana's table, the sun taken at 0h UT of the date; rounded to the nearest minute. */
fun albaniaMinutes(lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? =
    townTableRawMinutes(ALBANIA_TABLE, lon, year, month0, day, asrShadow).mapped { floor(it + 0.5) }

/** Sofia's table, the sun taken at 11h UT of the day before; rounded to the nearest minute. */
fun bulgariaMinutes(lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? =
    townTableRawMinutes(BULGARIA_TABLE, lon, year, month0, day, asrShadow).mapped { floor(it + 0.5) }

// ---------------------------------------------------------------- Pakistan: Jamia Banuri Town

/** As printed, whole minutes: Kazakhstan's sun and arithmetic, Fajr and Isha at 18°, the zenith as Dhuhr, Asr at two shadows (one where asked), no margins, the nearest minute. Null where a time does not form. */
fun banuriMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Int = 2): DayMinutes? {
    val jd = kzJulian(year, month0 + 1, day) - lon / 360
    fun midday(t: Double) = kzFix(12 - kzSun(jd + t)[1], 24.0)
    fun at(angle: Double, t: Double, before: Boolean): Double {
        val decl = kzSun(jd + t)[0]
        val x = (-sin(angle * RAD) - sin(decl * RAD) * sin(lat * RAD)) / (cos(decl * RAD) * cos(lat * RAD))
        if (!(abs(x) <= 1)) return Double.NaN
        val h = acos(x) / RAD / 15
        return midday(t) + (if (before) -h else h)
    }
    val asrAngle = -atan(1 / (asrShadow + tan(abs(lat - kzSun(jd + 13.0 / 24)[0]) * RAD))) / RAD
    fun minute(h: Double) = floor((h - lon / 15) * 60 + 0.5)
    val p = DayMinutes(
        fajr = minute(at(18.0, 5.0 / 24, true)),
        sunrise = minute(at(0.833, 6.0 / 24, true)),
        dhuhr = minute(midday(12.0 / 24)),
        asr = minute(at(asrAngle, 13.0 / 24, false)),
        maghrib = minute(at(0.833, 18.0 / 24, false)),
        isha = minute(at(18.0, 18.0 / 24, false)),
    )
    if (!(p.fajr.isFinite() && p.sunrise.isFinite() && p.dhuhr.isFinite() && p.asr.isFinite() && p.maghrib.isFinite() && p.isha.isFinite())) return null
    return p
}

// ---------------------------------------------------------------- United Arab Emirates

/** Before rounding: Jordan's kind of program with the Emirates' figures — 18° and 18°, the zone's horizon allowances, its morning margin on Fajr and sunrise, Dhuhr two minutes after the transit, the noon shadow taken at Dhuhr. */
fun uaeRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double = 0.0, asrShadow: Double = 1.0, dipMaghribDeg: Double? = null, morningMinutes: Double = 0.0): DayMinutes {
    val dipMaghrib = dipMaghribDeg ?: dipDeg
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    val T = (d0 + noon / 1440) / 36525
    val Ma = (357.52911 + 35999.05029 * T) * RAD
    val horizon = -(34.0 / 60 + 0.26667 / (1.00014 - 0.016708 * cos(Ma) - 0.00014 * cos(2 * Ma)))
    fun event(alt: Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val s = at(t)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    val dhuhr = noon + 2
    val sd = at(dhuhr)
    val noonTrue = asin(sp * sin(sd.dec) + cp * cos(sd.dec) * cos(((dhuhr - (720 - 4 * lon - sd.eot)) / 4) * RAD)) / RAD
    val noonApparent = noonTrue + refractionFromTrue(noonTrue)
    val asrApparent = atan(1 / (asrShadow + 1 / tan(noonApparent * RAD))) / RAD
    val asrTrue = asrApparent - refractionFromApparent(asrApparent)
    return DayMinutes(
        fajr = event(-18.0, -1.0, noon - 420) + morningMinutes,
        sunrise = event(horizon - dipDeg, -1.0, noon - 360) + morningMinutes,
        dhuhr = dhuhr,
        asr = event(asrTrue, 1.0, noon + 200),
        maghrib = event(horizon - dipMaghrib, 1.0, noon + 360),
        isha = event(-18.0, 1.0, noon + 420),
    )
}

/** Rounded to the nearest minute. Null where a time does not form. */
fun uaeMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, dipDeg: Double = 0.0, asrShadow: Double = 1.0, dipMaghribDeg: Double? = null, morningMinutes: Double = 0.0): DayMinutes? {
    val r = uaeRawMinutes(lat, lon, year, month0, day, dipDeg, asrShadow, dipMaghribDeg, morningMinutes)
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- Iran: the Institute of Geophysics, Tehran

/** Before rounding: the Institute of Geophysics' plain program — Meeus's apparent sun iterated, Fajr 17.7°, sunrise −0.8333°, Dhuhr the transit, Asr at the noon shadow plus the lengths asked, Maghrib 4.5°, Isha 14°; no margins. */
fun tehranRawMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes {
    val d0 = d0Of(year, month0, day)
    fun at(t: Double) = meeusApparentSun(d0 + t / 1440)
    var noon = 720 - 4 * lon
    repeat(3) { noon = 720 - 4 * lon - at(noon).eot }
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    fun event(alt: Double, sign: Double, start: Double): Double {
        var t = start
        repeat(3) {
            val s = at(t)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    val asrAltitude = atan(1 / (asrShadow + tan(abs(lat * RAD - at(noon).dec)))) / RAD
    return DayMinutes(
        fajr = event(-17.7, -1.0, noon - 420),
        sunrise = event(-0.8333, -1.0, noon - 360),
        dhuhr = noon,
        asr = event(asrAltitude, 1.0, noon + 200),
        maghrib = event(-4.5, 1.0, noon + 380),
        isha = event(-14.0, 1.0, noon + 420),
    )
}

/** Rounded to the nearest minute. Null where a time does not form. */
fun tehranMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0): DayMinutes? {
    val r = tehranRawMinutes(lat, lon, year, month0, day, asrShadow)
    return if (r.allFinite) r.mapped { floor(it + 0.5) } else null
}

// ---------------------------------------------------------------- United Kingdom: Wifaqul Ulama

/** Wifaqul Ulama's timetables: Fajr 18° (on the sun of 0h UT where the event's own does not reach it, else the middle of that date's sunset and the day before's sunrise), sunrise −0.8333°, Zuhr transit + 4, Asr on the noon shadow of the sun 90 minutes before 0h UT, Maghrib sunset + 5, Isha the earlier of 15° and a seventh of the night; nearest minute, the Shafi'i Asr rounded down. Null where a time does not form. */
fun wifaqMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 2.0): DayMinutes? {
    val sp = sin(lat * RAD)
    val cp = cos(lat * RAD)
    fun noonOf(d0: Double): Double {
        var noon = 720 - 4 * lon - meeusApparentSun(d0 + 720.0 / 1440).eot
        repeat(2) { noon = 720 - 4 * lon - meeusApparentSun(d0 + noon / 1440).eot }
        return noon
    }
    fun event(d0: Double, alt: Double, sign: Double, start: Double, fixed: Double? = null): Double {
        var t = start
        repeat(3) {
            val s = meeusApparentSun(d0 + (fixed ?: t) / 1440)
            val c = (sin(alt * RAD) - sp * sin(s.dec)) / (cp * cos(s.dec))
            if (!(abs(c) <= 1)) return Double.NaN
            t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / RAD
        }
        return t
    }
    val d0 = d0Of(year, month0, day)
    val noon = noonOf(d0)
    val sunrise = event(d0, -0.8333, -1.0, noon - 360)
    val sunset = event(d0, -0.8333, 1.0, noon + 360)
    var fajr = event(d0, -18.0, -1.0, noon - 420)
    if (!fajr.isFinite()) fajr = event(d0, -18.0, -1.0, noon - 420, 0.0)
    if (!fajr.isFinite()) fajr = (sunset + event(d0 - 1, -0.8333, -1.0, noonOf(d0 - 1) - 360)) / 2 - 720
    val asrAltitude = atan(1 / (asrShadow + tan(abs(lat * RAD - meeusApparentSun(d0 - 90.0 / 1440).dec)))) / RAD
    val asr = event(d0, asrAltitude, 1.0, noon + 200)
    val seventh = sunset + (event(d0 + 1, -0.8333, -1.0, noonOf(d0 + 1) - 360) + 1440 - sunset) / 7
    val isha15 = event(d0, -15.0, 1.0, noon + 420)
    if (!doubleArrayOf(fajr, sunrise, noon + 4, asr, sunset + 5, seventh).all { it.isFinite() }) return null
    fun near(v: Double) = floor(v + 0.5)
    val isha = if (isha15.isFinite()) minOf(near(isha15), near(seventh)) else near(seventh)
    return DayMinutes(near(fajr), near(sunrise), near(noon + 4), if (asrShadow == 1.0) floor(asr) else near(asr), near(sunset + 5), isha)
}

// ---------------------------------------------------------------- Sweden and Diyanet: the Congress method

private const val RISE_SET = -0.833
private const val FAJR_ANGLE = -18.0
const val CONGRESS_ISHA_DEG = 16.0
const val DIYANET_ISHA_DEG = 17.0
private const val TEMKIN_SUNRISE = -7.0
private const val TEMKIN_DHUHR = 5.0
private const val TEMKIN_ASR = 4.0
private const val TEMKIN_MAGHRIB = 7.0
private const val FLOOR = 300.0
private const val BAND = 20.0
private const val ANCHOR_SLACK = 1.0
private const val SEARCH_DAYS = 200
private const val SUN_INSTANT_S = -45.0
private const val EOT_ADD_MIN = 0.00176
private const val DAY_MS = 86_400_000.0

private fun midsummerOf(k: Long): Long = dayKey(yearOf(k), 5, 21)

private fun eotResidualS(L: Double): Double =
    0.033377 * sin(L) + 0.007721 * cos(L) - 0.000229 * sin(2 * L) + 0.004198 * cos(2 * L) -
        0.02346 * sin(3 * L) - 0.026434 * cos(3 * L)

private fun decResidualDeg(L: Double): Double =
    -1.1539e-5 - 3.6174e-5 * sin(L) - 2.1101e-5 * cos(L) + 2.0235e-5 * sin(2 * L) - 2.2534e-5 * cos(2 * L)

private fun congressSun(utcMs: Double): SunPosition {
    val T = (utcMs / DAY_MS - 10957.5) / 36525
    val L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    val M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD
    val C = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(M) +
        (0.019993 - 0.000101 * T) * sin(2 * M) +
        0.000289 * sin(3 * M)
    val om = (125.04 - 1934.136 * T) * RAD
    val Ls = (280.4665 + 36000.7698 * T) * RAD
    val Lm = (218.3165 + 481267.8813 * T) * RAD
    val nut = (9.2 * cos(om) + 0.57 * cos(2 * Ls) + 0.1 * cos(2 * Lm) - 0.09 * cos(2 * om)) / 3600
    val eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + nut
    val lam = (L0 + C) * RAD
    val ra = wrap360(atan2(cos(eps * RAD) * sin(lam), cos(lam)) / RAD)
    val dec = asin(sin(eps * RAD) * sin(lam)) + decResidualDeg(L0 * RAD) * RAD
    val eot = (wrap360(L0 - ra + 180) - 180) * 4 + EOT_ADD_MIN - eotResidualS(L0 * RAD) / 60
    return SunPosition(dec, eot)
}

private class Solar(day: Long, val lat: Double, lon: Double) {
    val dec: Double
    val transit: Double

    init {
        val s = congressSun(day.toDouble() * DAY_MS + SUN_INSTANT_S * 1000)
        dec = s.dec
        transit = 720 - 4 * lon - s.eot
    }

    private fun hourAngle(alt: Double): Double? {
        val c = (sin(alt * RAD) - sin(lat * RAD) * sin(dec)) / (cos(lat * RAD) * cos(dec))
        if (c < -1 || c > 1) return null
        return (acos(c) / RAD) * 4
    }

    fun rising(alt: Double): Double? = hourAngle(alt)?.let { transit - it }
    fun setting(alt: Double): Double? = hourAngle(alt)?.let { transit + it }

    fun asr(shadow: Double): Double? {
        val noonAlt = 90 - abs(lat - dec / RAD)
        if (noonAlt <= 0) return null
        val alt = atan(1 / (shadow + tan((90 - noonAlt) * RAD))) / RAD
        return setting(alt)
    }
}

private class RiseSet(val sr: Double, val ss: Double, val held: Boolean)
private class Ramp(val edge: Long, val T: Double, val far: Long?, val bump: Boolean)

/** The method for one place and one year; what it needs of the year is worked out once. */
class CongressYear(val lat: Double, val lon: Double, val year: Int, ishaDeg: Double = CONGRESS_ISHA_DEG, val clockOffset: Int? = null) {
    private val ishaAngle = -ishaDeg
    private val solars = HashMap<Long, Solar>()
    private val riseSets = HashMap<Long, RiseSet>()
    private val ramps = HashMap<String, Ramp>()
    private val extremes = HashMap<Long, DoubleArray>()
    private val carriedCache = HashMap<Long, DoubleArray>()
    private var ratioDone = false
    private var ratioValue: Double? = null
    private var gapDone = false
    private var gapValue: LongArray? = null
    private var floors: Boolean? = null

    private fun solar(day: Long): Solar = solars.getOrPut(day) { Solar(day, lat, lon) }

    /** Printed sunrise and Maghrib with the five-hour floors. */
    private fun riseSet(day: Long): RiseSet {
        riseSets[day]?.let { return it }
        val s = solar(day)
        val dhuhr = s.transit + TEMKIN_DHUHR
        val half = FLOOR / 2
        val rawSr = s.rising(RISE_SET)
        val rawSs = s.setting(RISE_SET)
        val nsr: Double
        val nss: Double
        if (midsummerFloors(day)) {
            val e = dhuhrExtremes(day)
            nsr = e[0] - 720 + half
            nss = e[1] + 720 - half
        } else {
            nsr = dhuhr - 720 + half
            nss = dhuhr + 720 - half
        }
        var sr: Double
        var ss: Double
        if (rawSr == null || rawSs == null) {
            val noonUp = 90 - abs(lat - s.dec / RAD) > RISE_SET
            sr = if (noonUp) nsr else dhuhr - half
            ss = if (noonUp) nss else dhuhr + half
        } else {
            sr = rawSr + TEMKIN_SUNRISE
            ss = rawSs + TEMKIN_MAGHRIB
        }
        sr = maxOf(minOf(sr, dhuhr - half), nsr)
        ss = minOf(maxOf(ss, dhuhr + half), nss)
        var held = false
        if (midsummerFloors(day)) {
            val mid = midsummerOf(day)
            if (day == mid) {
                held = true
            } else if (day > mid) {
                val prev = riseSet(day - 1)
                if (prev.held && ss > prev.ss) {
                    ss = prev.ss
                    held = true
                }
            }
        }
        val rs = RiseSet(sr, ss, held)
        riseSets[day] = rs
        return rs
    }

    private fun dhuhrOf(day: Long): Double = solar(day).transit + TEMKIN_DHUHR

    private fun maghribFloored(day: Long): Boolean {
        val s = solar(day)
        val st = s.setting(RISE_SET) ?: return true
        return st + TEMKIN_MAGHRIB > s.transit + TEMKIN_DHUHR + 720 - FLOOR / 2
    }

    private fun dhuhrExtremes(day: Long): DoubleArray {
        extremes[day]?.let { return it }
        val mid = midsummerOf(day)
        val out: DoubleArray
        if (day <= mid) {
            var maxRun = dhuhrOf(day)
            if (maghribFloored(day)) {
                var d = day - 1
                while (d > day - 120 && maghribFloored(d)) {
                    maxRun = maxOf(maxRun, dhuhrOf(d))
                    d -= 1
                }
            }
            out = doubleArrayOf(maxOf(dhuhrOf(day), dhuhrOf(mid)), minOf(maxRun, dhuhrOf(mid)))
        } else {
            var hi = Double.NEGATIVE_INFINITY
            var lo = Double.POSITIVE_INFINITY
            for (d in mid..day) {
                val v = dhuhrOf(d)
                hi = maxOf(hi, v)
                lo = minOf(lo, v)
            }
            out = doubleArrayOf(hi, lo)
        }
        extremes[day] = out
        return out
    }

    private fun midsummerFloors(day: Long): Boolean {
        floors?.let { return it }
        val s = solar(midsummerOf(day))
        val sr = s.rising(RISE_SET)
        val ss = s.setting(RISE_SET)
        val dhuhr = s.transit + TEMKIN_DHUHR
        val half = FLOOR / 2
        val result = if (sr == null || ss == null) {
            true
        } else {
            val psr = maxOf(sr + TEMKIN_SUNRISE, dhuhr - 720 + half)
            val pss = minOf(ss + TEMKIN_MAGHRIB, dhuhr + 720 - half)
            1440 - (pss - psr) <= FLOOR + ANCHOR_SLACK
        }
        floors = result
        return result
    }

    private fun night(day: Long): Double {
        val rs = riseSet(day)
        return 1440 - (rs.ss - rs.sr)
    }

    private fun fajr18(day: Long): Double? = solar(day).rising(FAJR_ANGLE)
    private fun isha16(day: Long): Double? = solar(day).setting(ishaAngle)
    private fun trueTime(fajr: Boolean, day: Long): Double? = if (fajr) fajr18(day) else isha16(day)

    private fun gapDays(): LongArray? {
        if (gapDone) return gapValue
        val mid = dayKey(year, 5, 21)
        val g: LongArray?
        if (fajr18(mid) != null) {
            val isha = solar(mid).setting(-CONGRESS_ISHA_DEG)
            g = if (lat > 0 && isha != null && carriedRaw(mid)[1] < isha) longArrayOf(mid, mid) else null
        } else {
            var a = mid
            while (fajr18(a - 1) == null && mid - a < SEARCH_DAYS) a -= 1
            var b = mid
            while (fajr18(b + 1) == null && b - mid < SEARCH_DAYS) b += 1
            g = longArrayOf(a, b)
        }
        gapValue = g
        gapDone = true
        return g
    }

    private fun ratio(): Double? {
        if (ratioDone) return ratioValue
        var d = dayKey(year, 5, 21)
        var f = fajr18(d)
        var steps = 0
        while (f == null && steps < SEARCH_DAYS) {
            d -= 1
            f = fajr18(d)
            steps += 1
        }
        val r: Double? = if (f == null) {
            null
        } else {
            val ss = riseSet(d).ss
            val S = f + 1440 - ss
            S / 3 / night(d)
        }
        ratioValue = r
        ratioDone = true
        return r
    }

    private fun carriedRaw(day: Long): DoubleArray {
        val r = ratio() ?: 0.0
        val rs = riseSet(day)
        val n = night(day)
        return doubleArrayOf(rs.sr - r * (FAJR_ANGLE / -CONGRESS_ISHA_DEG) * n, rs.ss + r * n)
    }

    private fun carried(day: Long): DoubleArray {
        carriedCache[day]?.let { return it }
        val mid = midsummerOf(day)
        val out: DoubleArray
        if (!midsummerFloors(day) || day == mid) {
            out = carriedRaw(day)
        } else if (day < mid) {
            val c = carriedRaw(day)
            val m = carried(mid)
            out = doubleArrayOf(maxOf(c[0], m[0]), minOf(c[1], m[1]))
        } else {
            var prev = carried(mid)
            for (d in (mid + 1) until day) {
                var c = carriedCache[d]
                if (c == null) {
                    val raw = carriedRaw(d)
                    c = doubleArrayOf(maxOf(raw[0], prev[0]), minOf(raw[1], prev[1]))
                    carriedCache[d] = c
                }
                prev = c
            }
            val raw = carriedRaw(day)
            out = doubleArrayOf(maxOf(raw[0], prev[0]), minOf(raw[1], prev[1]))
        }
        carriedCache[day] = out
        return out
    }

    private fun rampOf(sideIn: Boolean, fajr: Boolean): Ramp? {
        val gap = gapDays() ?: return null
        val cacheKey = (if (sideIn) "in" else "out") + (if (fajr) "fajr" else "isha")
        ramps[cacheKey]?.let { return it }
        val edge = if (sideIn) gap[0] else gap[1]
        val T = carried(edge)[if (fajr) 0 else 1]
        val step = if (sideIn) -1L else 1L
        var far: Long? = null
        val first = trueTime(fajr, edge + step)
        var wrapped = false
        val off = clockOffset
        if (!sideIn && fajr && off != null && first != null) {
            wrapped = floor((first + off) / 1440) != floor((T + off) / 1440)
        }
        var d = edge + step
        while (!wrapped && kotlin.math.abs(d - edge) < SEARCH_DAYS) {
            val t = trueTime(fajr, d)
            if (t != null && abs(t - T) <= BAND) {
                far = d
            } else if (far != null) {
                break
            }
            d += step
        }
        val r = Ramp(edge, T, far, wrapped)
        ramps[cacheKey] = r
        return r
    }

    private fun ramp(day: Long, sideIn: Boolean, fajr: Boolean): Double? {
        val r = rampOf(sideIn, fajr) ?: return trueTime(fajr, day)
        val far = r.far ?: return trueTime(fajr, day)
        val inside = if (sideIn) (far <= day && day < r.edge) else (r.edge < day && day <= far)
        if (!inside) return trueTime(fajr, day)
        val sign = if (fajr) 1.0 else -1.0
        return r.T + (sign * BAND * kotlin.math.abs(day - r.edge).toDouble()) / kotlin.math.abs(far - r.edge).toDouble()
    }

    fun times(day: Long, asrShadow: Double = 1.0): DayMinutes {
        val s = solar(day)
        val rs = riseSet(day)
        val dhuhr = s.transit + TEMKIN_DHUHR
        val rawAsr = s.asr(asrShadow)
        var asr = if (rawAsr == null) dhuhr else rawAsr + TEMKIN_ASR
        asr = maxOf(dhuhr, minOf(asr, rs.ss))
        var fajr = fajr18(day)
        var isha = isha16(day)
        val gap = gapDays()
        if (gap != null) {
            if (gap[0] <= day && day <= gap[1]) {
                val c = carried(day)
                fajr = c[0]
                isha = c[1]
                if (day == gap[0] || day == gap[1]) {
                    val sideIn = day == gap[0]
                    if (rampOf(sideIn, true)?.bump == true) fajr = c[0] + BAND
                    if (rampOf(sideIn, false)?.bump == true) isha = c[1] - BAND
                }
            } else if (day < gap[0]) {
                fajr = ramp(day, true, true)
                isha = ramp(day, true, false)
            } else {
                fajr = ramp(day, false, true)
                isha = ramp(day, false, false)
            }
        }
        return DayMinutes(fajr ?: (rs.sr - 60), rs.sr, dhuhr, asr, rs.ss, isha ?: (rs.ss + 60))
    }
}

private val congressYears = object : LinkedHashMap<String, CongressYear>() {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, CongressYear>?): Boolean = size > 12
}

/** The Congress method's times, minutes past 00:00 UT of the date, unrounded. */
@Synchronized
fun congressMinutes(lat: Double, lon: Double, year: Int, month0: Int, day: Int, asrShadow: Double = 1.0, ishaDeg: Double = CONGRESS_ISHA_DEG, clockOffset: Int? = null): DayMinutes {
    val key = "$lat|$lon|$year|$ishaDeg|$clockOffset"
    val cy = congressYears.getOrPut(key) { CongressYear(lat, lon, year, ishaDeg, clockOffset) }
    return cy.times(dayKey(year, month0, day), asrShadow)
}
