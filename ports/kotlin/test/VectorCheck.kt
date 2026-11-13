// Holds the Kotlin port to test/vectors.json, the sample the TypeScript library
// writes for ports. From ports/kotlin:
//
//     kotlinc src test -include-runtime -d build/mihrab-methods.jar
//     java -jar build/mihrab-methods.jar ../..
//
// The argument is the repository root; a second one names another vectors file.
import mihrab.methods.Authority
import mihrab.methods.CorrectionList
import mihrab.methods.Place
import mihrab.methods.Prayer
import mihrab.methods.REVISIONS
import mihrab.methods.timesFor
import java.io.File
import java.time.LocalDate
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import kotlin.system.exitProcess

/** JSON, read into maps, lists, strings, doubles, booleans and null: enough for the vectors and the lists. */
private class Json(private val s: String) {
    private var i = 0

    fun parse(): Any? {
        val v = value()
        ws()
        check(i == s.length) { "trailing text at $i" }
        return v
    }

    private fun ws() {
        while (i < s.length && s[i].isWhitespace()) i++
    }

    private fun value(): Any? {
        ws()
        return when (val c = s[i]) {
            '{' -> {
                i++
                val m = LinkedHashMap<String, Any?>()
                ws()
                if (s[i] == '}') { i++; return m }
                while (true) {
                    ws()
                    val k = string()
                    ws()
                    check(s[i++] == ':')
                    m[k] = value()
                    ws()
                    if (s[i++] == '}') return m
                }
                @Suppress("UNREACHABLE_CODE")
                m
            }
            '[' -> {
                i++
                val l = ArrayList<Any?>()
                ws()
                if (s[i] == ']') { i++; return l }
                while (true) {
                    l.add(value())
                    ws()
                    if (s[i++] == ']') return l
                }
                @Suppress("UNREACHABLE_CODE")
                l
            }
            '"' -> string()
            't' -> { i += 4; true }
            'f' -> { i += 5; false }
            'n' -> { i += 4; null }
            else -> {
                val start = i
                while (i < s.length && (s[i].isDigit() || s[i] in "+-.eE")) i++
                check(i > start) { "unexpected '$c' at $start" }
                s.substring(start, i).toDouble()
            }
        }
    }

    private fun string(): String {
        check(s[i++] == '"')
        val b = StringBuilder()
        while (true) {
            when (val c = s[i++]) {
                '"' -> return b.toString()
                '\\' -> when (val e = s[i++]) {
                    'n' -> b.append('\n')
                    't' -> b.append('\t')
                    'r' -> b.append('\r')
                    'b' -> b.append('\b')
                    'f' -> b.append('\u000C')
                    'u' -> { b.append(s.substring(i, i + 4).toInt(16).toChar()); i += 4 }
                    else -> b.append(e)
                }
                else -> b.append(c)
            }
        }
    }
}

@Suppress("UNCHECKED_CAST")
private fun obj(v: Any?) = v as Map<String, Any?>

@Suppress("UNCHECKED_CAST")
private fun arr(v: Any?) = v as List<Any?>

private fun pair(v: Any?): Pair<Double, Double> = arr(v).let { (it[0] as Double) to (it[1] as Double) }

fun main(args: Array<String>) {
    val root = args.getOrElse(0) { "../.." }
    val vectors = obj(Json(File(args.getOrElse(1) { "$root/test/vectors.json" }).readText()).parse())
    val revisions = obj(vectors["revisions"]).mapValues { (it.value as Double).toInt() }
    if (revisions != REVISIONS) {
        println("The vectors are of revisions $revisions; this port is of $REVISIONS.")
        exitProcess(1)
    }
    val lists = REVISIONS.keys.associateWith { a ->
        val file = obj(Json(File("$root/data/corrections/$a.json").readText()).parse())
        CorrectionList(obj(file["points"]).mapValues { e -> arr(e.value).map { it as String } })
    }
    val iso = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'.000Z'")
    var off = 0
    var checked = 0
    val cases = arr(vectors["cases"])
    for (raw in cases) {
        val c = obj(raw)
        val p = obj(c["place"])
        val id = p["id"] as String
        val authority = id.substringBefore(':')
        val place = Place(
            authority = Authority.valueOf(authority),
            lat = p["lat"] as Double,
            lon = p["lon"] as Double,
            tz = p["tz"] as String,
            ishaDeg = p["ishaDeg"] as Double?,
            clock = p["clock"]?.let { cl -> arr(cl).map { e -> arr(e).let { (it[0] as String) to (it[1] as Double).toInt() } } },
            prayerPoints = p["prayerPoints"]?.let { pp -> obj(pp).entries.associate { it.key.toInt() to arr(it.value).map(::pair) } },
            dipDeg = p["dipDeg"] as Double?,
            dipMaghribDeg = p["dipMaghribDeg"] as Double?,
            fajrMinutes = p["fajrMinutes"] as Double?,
            highland = p["highland"] == true,
            twilightDip = p["twilightDip"] == true,
            afternoon = p["afternoon"]?.let(::pair),
            temkin = p["temkin"] as Double?,
            dipDegEarlier = p["dipDegEarlier"] as Double?,
            dipDegUntil = (p["dipDegUntil"] as Double?)?.toInt(),
        )
        val date = c["date"] as String
        val want = c["printed"]?.let(::obj)
        val got = timesFor(place, date, lists[authority])
        if ((got == null) != (want == null)) {
            off++
            println("$id $date: ${if (got == null) "no times" else "times"}, expected ${if (want == null) "none" else "times"}")
            continue
        }
        if (got == null || want == null) continue
        val wantClock = (obj(c["clock"])["offsetMinutes"] as Double).toInt()
        if (got.clock != wantClock) {
            off++
            println("$id $date: clock ${got.clock}, expected $wantClock")
        }
        val instants = obj(c["instants"])
        val midnight = LocalDate.parse(date).atStartOfDay()
        for (k in Prayer.values()) {
            checked++
            val instant = midnight.plusMinutes(got.minutes.getValue(k).toLong()).atOffset(ZoneOffset.UTC).format(iso)
            if (got.printed(k) != want[k.name] || instant != instants[k.name]) {
                off++
                println("$id $date ${k.name}: ${got.printed(k)} ($instant), expected ${want[k.name]} (${instants[k.name]})")
            }
        }
    }
    println("${cases.size} cases, $checked times, $off off")
    exitProcess(if (off == 0) 0 else 1)
}
