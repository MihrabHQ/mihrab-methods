// A place and a date in, the day's six times out: the authority's method,
// then its correction list — what `timesFor` does in the TypeScript library.
package mihrab.methods

import java.lang.StrictMath.floor
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZoneOffset

enum class Authority { sweden, diyanet, morocco, algeria, indonesia, turkiyetakvimi, kazakhstan, egypt, brunei, qatar, kuwait, jordan, tatarstan, cdum, albania, bulgaria }

enum class Prayer { fajr, sunrise, dhuhr, asr, maghrib, isha }

/** The method revisions this port reproduces. A correction list belongs to one revision. */
val REVISIONS: Map<String, Int> = mapOf("sweden" to 1, "diyanet" to 2, "morocco" to 3, "algeria" to 1, "indonesia" to 2, "turkiyetakvimi" to 1, "kazakhstan" to 1, "egypt" to 1, "brunei" to 1, "qatar" to 1, "kuwait" to 1, "jordan" to 1, "tatarstan" to 1, "cdum" to 1, "albania" to 1, "bulgaria" to 1)

/**
 * A place as the library's lists have it (data/places). Use the coordinates
 * exactly as the list gives them: the correction lists are looked up by them.
 */
class Place(
    val authority: Authority,
    val lat: Double,
    val lon: Double,
    /** IANA zone; unused where `clock` is set. */
    val tz: String,
    /** Diyanet: Isha's depression where the list gives one (16 or 17). */
    val ishaDeg: Double? = null,
    /** The table's own clock where it keeps one no zone does: from 'YYYY-MM-DD' to minutes east of UTC, in order. */
    val clock: List<Pair<String, Int>>? = null,
    /** Türkiye's districts: per year, the six points (fajr … isha) as (lat, lon). */
    val prayerPoints: Map<Int, List<Pair<Double, Double>>>? = null,
    val dipDeg: Double? = null,
    val dipMaghribDeg: Double? = null,
    /** Jordan: the zone's margin on Fajr, minutes. */
    val fajrMinutes: Double? = null,
    val highland: Boolean = false,
    val twilightDip: Boolean = false,
    val afternoon: Pair<Double, Double>? = null,
    /** Türkiye Takvimi: the city's temkin, minutes. */
    val temkin: Double? = null,
)

/**
 * A number to three decimals as JavaScript's toFixed(3) writes it: the binary
 * value's exact decimal expansion, ties away from zero.
 */
internal fun toFixed3(x: Double): String {
    val s = BigDecimal(x).setScale(3, RoundingMode.HALF_UP).toPlainString()
    return if (x < 0 && !s.startsWith("-")) "-$s" else s
}

fun pointKey(lat: Double, lon: Double): String = toFixed3(lat) + "," + toFixed3(lon)

/** data/corrections/<authority>.json, indexed: point → date → prayer → minutes. */
class CorrectionList(points: Map<String, List<String>>) {
    private val index = HashMap<String, HashMap<String, HashMap<Prayer, Int>>>()

    init {
        for ((point, entries) in points) {
            val byDate = index.getOrPut(point) { HashMap() }
            for (e in entries) {
                val p = e.split(' ')
                byDate.getOrPut(p[0]) { HashMap() }[Prayer.valueOf(p[1])] = p[2].toInt()
            }
        }
    }

    fun correction(lat: Double, lon: Double, date: String): Map<Prayer, Int>? = index[pointKey(lat, lon)]?.get(date)
}

/** Minutes east of UTC that a zone keeps at noon UTC of a date. */
fun clockOffsetAt(tz: String, year: Int, month0: Int, day: Int): Int {
    val noon = LocalDate.ofEpochDay(dayKey(year, month0, day)).atTime(12, 0).toInstant(ZoneOffset.UTC)
    return Math.round(ZoneId.of(tz).rules.getOffset(noon).totalSeconds / 60.0).toInt()
}

/** The clock a place's table prints a date in: its own where it has one, else its zone's. */
fun placeClockAt(place: Place, year: Int, month0: Int, day: Int): Int {
    val clock = place.clock
    if (clock != null && clock.isNotEmpty()) {
        val date = "%04d-%02d-%02d".format(year, month0 + 1, day)
        var off = clock[0].second
        for ((from, o) in clock) if (from <= date) off = o
        return off
    }
    return clockOffsetAt(place.tz, year, month0, day)
}

/** The day as a table prints it. */
class Day(
    /** Minutes east of UTC of the clock the table prints the day in. */
    val clock: Int,
    /** Whole minutes past 00:00 UT of the date. */
    val minutes: Map<Prayer, Int>,
) {
    /** 'HH:MM' on the table's clock. */
    fun printed(p: Prayer): String {
        val m = Math.floorMod(minutes.getValue(p) + clock, 1440)
        return "%02d:%02d".format(m / 60, m % 60)
    }
}

private fun congress(place: Place, year: Int, month0: Int, day: Int, asrShadow: Double, clock: Int): DayMinutes {
    val ishaDeg = place.ishaDeg ?: CONGRESS_ISHA_DEG
    val byYear = place.prayerPoints
    val raw: DayMinutes
    if (byYear != null && byYear.isNotEmpty()) {
        val years = byYear.keys.sorted()
        var best = years[0]
        for (y in years) if (Math.abs(y - year) < Math.abs(best - year)) best = y
        val p = byYear.getValue(best)
        fun at(i: Int) = congressMinutes(p[i].first, p[i].second, year, month0, day, asrShadow, ishaDeg, clock)
        raw = DayMinutes(at(0).fajr, at(1).sunrise, at(2).dhuhr, at(3).asr, at(4).maghrib, at(5).isha)
    } else {
        raw = congressMinutes(place.lat, place.lon, year, month0, day, asrShadow, ishaDeg, clock)
    }
    // the library carries an instant in whole milliseconds, then rounds it to the minute
    return raw.mapped { floor((it * 60000).toLong() / 60000.0 + 0.5) }
}

/**
 * The day as a table prints it for `date` ('YYYY-MM-DD'), or null where the
 * method gives no times.
 *
 * `corrections` is the authority's list; without it the times are the bare
 * method's, which is the published table to within the list's few minutes.
 */
fun timesFor(place: Place, date: String, corrections: CorrectionList? = null, asrShadow: Double = 1.0): Day? {
    val parts = date.split('-').map { it.toInt() }
    val year = parts[0]
    val month0 = parts[1] - 1
    val day = parts[2]
    val clock = placeClockAt(place, year, month0, day)
    val t: DayMinutes = when (place.authority) {
        Authority.sweden, Authority.diyanet -> congress(place, year, month0, day, asrShadow, clock)
        Authority.morocco -> moroccoMinutes(place.lat, place.lon, year, month0, day, place.dipDeg, asrShadow, place.dipMaghribDeg)
        Authority.algeria -> algeriaMinutes(place.lat, place.lon, year, month0, day, asrShadow)
        Authority.indonesia -> kemenagMinutes(place.lat, place.lon, year, month0, day, place.highland, place.twilightDip, asrShadow, place.afternoon)
        Authority.kazakhstan -> kazakhstanMinutes(place.lat, place.lon, year, month0, day)
        Authority.egypt -> egyptMinutes(place.lat, place.lon, year, month0, day, asrShadow)
        Authority.brunei -> bruneiMinutes(place.lon, year, month0, day, asrShadow)
        Authority.qatar -> qatarMinutes(place.lat, place.lon, year, month0, day, asrShadow)
        Authority.kuwait -> kuwaitMinutes(place.lon, year, month0, day, asrShadow)
        Authority.jordan -> jordanMinutes(place.lat, place.lon, year, month0, day, place.dipDeg ?: 0.0, asrShadow, place.dipMaghribDeg, place.fajrMinutes ?: 0.0)
        Authority.tatarstan -> tatarstanMinutes(place.lat, place.lon, year, month0, day, place.dipDeg ?: 0.0)
        Authority.cdum -> cdumMinutes(place.lat, place.lon, year, month0, day)
        Authority.albania -> albaniaMinutes(place.lon, year, month0, day, asrShadow)
        Authority.bulgaria -> bulgariaMinutes(place.lon, year, month0, day, asrShadow)
        Authority.turkiyetakvimi -> takvimMinutes(place.lat, place.lon, year, month0, day, place.temkin, asrShadow)
    } ?: return null
    val out = linkedMapOf(
        Prayer.fajr to t.fajr.toInt(), Prayer.sunrise to t.sunrise.toInt(), Prayer.dhuhr to t.dhuhr.toInt(),
        Prayer.asr to t.asr.toInt(), Prayer.maghrib to t.maghrib.toInt(), Prayer.isha to t.isha.toInt(),
    )
    corrections?.correction(place.lat, place.lon, date)?.forEach { (k, step) ->
        // the lists are of the standard Asr only
        if (!(k == Prayer.asr && asrShadow != 1.0)) out[k] = out.getValue(k) + step
    }
    return Day(clock, out)
}
