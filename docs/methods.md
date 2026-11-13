# The methods, in words and formulas

What each authority's program does, as read off its published tables, so
that a port in another language can do the same. The TypeScript under
`src/methods/` is the reference: where this page and the code differ, the
code is what the certification holds. `test/vectors.json` has a small sample
of places, dates and the times to expect, with the clock they print in.

Conventions throughout:

- Angles in degrees unless marked; φ the place's latitude, λ its longitude
  (east positive), δ the sun's declination, E the equation of time in
  minutes (apparent solar time less mean), T Julian centuries since J2000.0.
- The **hour angle** at which the sun's centre is at altitude *a*:
  `cos H = (sin a − sin φ · sin δ) / (cos φ · cos δ)`, H in degrees, 4 minutes per degree.
- **Transit** (local apparent noon) in minutes past 0h UT: `720 − 4λ − E`.
- A time that does not form (the sun never reaches the altitude that day)
  is null unless the method says otherwise.
- The **printed minute** is the instant on the table's clock. A table prints
  the whole day in the clock kept at noon of that day, so on the morning the
  clocks go forward a Fajr before the change is printed in the new time.
- Each method is followed by its **correction list**
  (`data/corrections/<authority>.json`): the few times the authority's own
  arithmetic puts a fraction of a second on the other side of a minute's
  rounding point. An entry moves one printed time of one point on one date by
  one minute. The lists are not part of the method; they are what remains
  after it.

## Sweden and Diyanet

`src/methods/sweden.ts`. The International Prayer Times Congress method
(Istanbul, 2021 — the Diyanet and the European Council for Fatwa and
Research) as Diyanet's program realises it. Islamiska Förbundet's Swedish
tables are Diyanet's, row for row. Diyanet's worldwide tables are the same
program with Isha's angle by country.

**Published rules** (awqatsalah.com, "Tespit Kriterleri"):

- Dhuhr five minutes after transit. Asr at one shadow length, four minutes
  late; where the shadow never forms, Asr is printed at Dhuhr's time.
- Sunrise seven minutes early, Maghrib seven minutes late ("temkin"), at
  the standard −0.833°.
- True Fajr at −18°, true Isha at −16° (the Congress) or −17° (Diyanet's own,
  outside the countries listed below).
- Neither the day nor the night is shorter than five hours.
- Where the 18° dawn no longer forms, the share of the night that the sharia
  night's third took on the last day it did is carried: Isha that share of
  the night after Maghrib, Fajr the same share scaled by 18/16 before sunrise.
- The move from the true times to the carried ones is gradual, starting
  twenty minutes before (Isha) or after (Fajr) the takdir.

**What the tables do with them**, read off Diyanet's own tables for 160
Swedish places and 8 000 places worldwide, 2024–2027:

- The **sun is taken once a day**, at 0h UT less 45 seconds, from Meeus's
  mean elements:
  - `L0 = 280.46646 + 36000.76983 T + 0.0003032 T²` (mean longitude)
  - `M = 357.52911 + 35999.05029 T − 0.0001537 T²` (mean anomaly)
  - `C = (1.914602 − 0.004817 T − 0.000014 T²) sin M + (0.019993 − 0.000101 T) sin 2M + 0.000289 sin 3M`
  - true longitude `λ☉ = L0 + C` (the *true*, not the apparent, longitude:
    no aberration, no nutation in longitude);
  - obliquity `ε = 23°26′21.448″ − 46.815″ T − 0.00059″ T² + 0.001813″ T³`
    plus the nutation in obliquity `9.2 cos Ω + 0.57 cos 2L☉ + 0.1 cos 2L☾ − 0.09 cos 2Ω` arc-seconds,
    with `Ω = 125.04 − 1934.136 T`, `L☉ = 280.4665 + 36000.7698 T`, `L☾ = 218.3165 + 481267.8813 T`;
  - right ascension `α = atan2(cos ε · sin λ☉, cos λ☉)`, declination `δ = asin(sin ε · sin λ☉)`;
  - equation of time `E = 4 (L0 − α)` minutes, wrapped to ±720, plus 0.00176 min;
  - and two small waves in the mean longitude the formula leaves out, read
    off the tables (`eotResidualS`, `decResidualDeg` in the code): a few
    hundredths of a second on the transit, a tenth of an arc-second on the
    declination. A port that omits them will be a minute off on a few times
    in ten thousand.
- Coordinates are kept to **three decimals** of a degree.
- The night a share is taken of is the day's own: 24 h less the printed day
  (sunrise to Maghrib, after temkin).
- The **five-hour floors** hold each end separately: 150 minutes from the
  printed Dhuhr, or from the midnight after it. Where midsummer's night is
  floored at both ends (to within a minute), that night anchors the season,
  and the floored times never step back: before midsummer no sunrise earlier
  than midsummer's and a floored Maghrib no earlier than the day before;
  after it no sunrise earlier nor Maghrib later than on any day since
  midsummer — and Fajr and Isha carried the same way.
- The **gradual transition** is a straight line across the days next to the
  gap on which the true time lies within twenty minutes of the takdir at the
  gap's edge: twenty minutes away at the far end, the takdir at the edge.
- Where the dawn forms all summer but midsummer's true Isha (at 16°) falls
  later than the share carried from that night, **midsummer is the takdir's
  day** — a gap of one day, with its ramps (from about 44.4° north).
- **Isha by country:** 16° in most of Europe, Russia, Ukraine, Belarus,
  Kazakhstan, Mongolia, China, the United States and Canada; 17° elsewhere.
  The high-latitude rules are worked at 16° either way.
- **Türkiye's districts** (and Northern Cyprus's): each prayer is computed at
  a point of its own in the district, and the points move by a few
  thousandths of a degree from one year's tables to the next
  (`Place.prayerPoints`: a point per prayer per year; the nearest year's
  beyond the tables).
- **Past local midnight:** where the first true dawn after the summer gap
  falls before local midnight on the table's clock (far east of a zone's
  meridian), there is no transition: the gap's last day is printed twenty
  minutes after the takdir and the true times follow.
- **Tables on their own clocks:** some of Diyanet's tables are printed on a
  clock other than their place's zone (Alberta keeping summer time, Xinjiang
  on Beijing time, and so on); `Place.clock` gives that clock, read off the
  table. The instants are the method's; only the labels differ.
- Every time is rounded to the nearest minute after the temkin.

The full algorithm — the search for the gap, the anchoring, the ramps — is
`CongressYear` in the code, about four hundred lines; there is no shorter
statement of it that gives the tables.

## Morocco

`src/methods/morocco.ts`. The Ministry of Habous and Islamic Affairs, read
off its tables for 164 cities: 96 days of 2026 for all of them, and — through
the Internet Archive's copies of its pages — 2014 to 2025 for Rabat, Figuig,
Tangier, Casablanca, Laayoune and a dozen more, every month of the year,
and the summer of 2022 for nearly every city. The ministry's program
changed in April or May 2022 (until then Asr was the noon shadow on the
true sun); this is the program it has used since.

- The sun is **Meeus's apparent sun** with the full nutation (the mean
  elements above; apparent longitude `L0 + C − 0.00569 + Δψ`, with
  `Δψ = −17.2 sin Ω − 1.32 sin 2L☉ − 0.23 sin 2L☾ + 0.21 sin 2Ω` arc-seconds)
  and his chapter-28 equation of time
  `E = L0 − 0.0057183 − α + Δψ cos ε`, taken at **each prayer's own
  moment** (iterated), declination and equation of time alike.
- Fajr −19°, Isha −17°, true altitudes.
- Dhuhr five minutes after the transit.
- Asr on the **apparent** sun, by the classical rule: with δ the noon
  declination, the noon altitude `h = 90° − |φ − δ|` is raised by
  refraction, `h' = h + R(h)`, `R(h) = 1.02′ / tan(h + 10.3/(h + 5.11))`
  (Sæmundsson, Meeus 16.4, h in degrees); the gnomon's shadow is `cot h'`,
  and Asr is when the apparent sun's shadow is one length more:
  apparent altitude `a' = arctan(1 / (1 + cot h'))`, and the true altitude
  the hour angle is solved for, `a = a' − R'(a')`,
  `R'(a') = 1′ / tan(a' + 7.31/(a' + 4.4))` (Bennett, Meeus 16.3), with the
  declination at the event. Hanafi takes two lengths.
- Sunrise one minute before, and Maghrib 1.8 minutes after, the sun on the
  altitude `−(34′ + s) − dip`, with s the sun's semi-diameter for its
  distance that day and dip the city's own horizon allowance — eastward at
  sunrise (`Place.dipDeg`), westward at Maghrib (`Place.dipMaghribDeg`),
  each fitted from the tables with the city's point. It is an angle: the
  minutes it is worth grow towards the solstices, as the ministry's do.
  It follows the city's height (92 % correlation), and a city not fitted
  gets `0.32° + 0.025°·√height(m)` east and `0.37° + 0.021°·√height(m)`
  west.
- Fajr rounded **down** to the minute, every other time to the nearest.
- The ministry's clock is GMT+1 until 17 September 2026 and GMT from then
  on (`Place.clock`); the zone databases still move Morocco's clock, so the
  table's clock is not a zone's.

## Algeria

`src/methods/algeria.ts`. The Ministry of Religious Affairs and Wakfs, read
off its 1448 AH table for 68 cities.

- The sun from **NOAA's solar-calculator formulas**: the mean elements above
  with the eccentricity `e = 0.016708634 − 0.000042037 T − 0.0000001267 T²`,
  NOAA's series for the equation of time
  `E = 4 [ y sin 2L0 − 2e sin M + 4e y sin M cos 2L0 − ½ y² sin 4L0 − 1¼ e² sin 2M ]`
  with `y = tan²(ε₀/2)` (the mean obliquity), and its declination from the
  apparent longitude `L0 + C − 0.00569 − 0.00478 sin Ω` and the obliquity
  `ε₀ + 0.00256 cos Ω`. They fit the table far better than a precise
  ephemeris, so this is what the ministry's program uses.
- Dhuhr at the sun's transit, the equation of time taken there.
- Every other time is the transit plus or minus the hour angle, with the
  declination taken at that prayer's own moment (three iterations) and the
  equation of time kept at noon's value (itself iterated three times).
- Fajr −18°, Isha −17°, sunrise and sunset at −0.833°.
- Asr from the noon shadow `tan(φ − δ)` **with its sign**, so where the sun
  culminates north of the zenith (the far south around June) Asr comes
  earlier, up to thirteen minutes.
- Maghrib three minutes after sunset.
- Every time rounded **up** to the minute.

## Indonesia

`src/methods/indonesia.ts`. Kemenag's tables for all 517 regencies and
cities.

- The **precise apparent sun** (`src/sun/preciseSun.ts`: a VSOP87 series
  after Astronomy Engine, within 0.05 s and 0.5″ of JPL's DE421), taken at
  each prayer's own moment, iterated three times. Meeus's shorter series
  drifts by a second and leaves a minute in two hundred off.
- **No ΔT**: the ministry's program takes the clock's Universal Time for
  the ephemeris' own time, so its sun stands about 70 seconds behind and
  every time of the day comes a fifth of a second early
  (`preciseApparentSun(d, 0)`). A port that adds ΔT is a minute off on
  about one time in two hundred.
- Fajr −20°, Isha −18°.
- Sunrise and Maghrib at −1°, and at −2° in the regencies the ministry
  classes as highland (`Place.highland`); in six highland regencies of Papua
  the degree is taken off Fajr and Isha too (`Place.twilightDip`).
- Asr when the shadow is its length plus the noon shadow, the noon shadow
  from the sun's declination at 00:00 UT of the day (as an almanac's daily
  entry gives it), the hour angle from the sun at Asr (four iterations).
- Every time rounded **up**, after a margin: +2 minutes on Fajr, Asr,
  Maghrib and Isha, +3 on Dhuhr, −3 on sunrise.
- Each regency at the **coordinates the ministry gives for it**, to a
  hundredth of an arc-second. Nothing is fitted. One is written with a minus
  and a hemisphere both (Pekajang, "−01° 12′ S"), and the ministry's program
  reads it as −1° + 12′ and then south of that: 0.8° north, which is where
  its table is computed.
- Each regency is printed in its province's zone (WIB, WITA or WIT).

## Türkiye Takvimi

`src/methods/turkiyeTakvimi.ts`. The calendar's own years for its cities
(namazvakti.com), read off cities from 42°S to 60°N.

- The **precise apparent sun** of Indonesia's method — here with ΔT added
  to Universal Time, as the ephemeris asks — taken at each event's own
  moment: three iterations from the transit, itself iterated
  three times.
- A **temkin `T`** per city, in minutes with its fraction: the time the sun
  takes on the summer solstice (declination 23.38°) at the city's latitude
  `φ` to go from the level horizon to the city's own, `d` below it,
  `T = 4 [ H(−d) − H(0) ]` with `cos H(a) = (sin a − sin φ sin 23.38°) / (cos φ cos 23.38°)`
  and `d = 0.8416° + 0.03924° √h` for the height `h` the calendar gives the
  city (250 m: 1.462°; 500 m: 1.719°). A listed place carries the `T` its
  table shows (`Place.temkin`), which strays from the formula by a few
  hundredths of a minute.
- **Fajr** is the calendar's Sabâh: the sun 18° below the horizon, with no
  temkin. (Its İmsâk, which the library does not give among the six, is the
  sun at 19° less `T`, rounded down.)
- **Sunrise**: the sun's centre on the level horizon (altitude 0°, no
  refraction), less `T` and two minutes.
- **Dhuhr**: the transit plus `T`.
- **Asr**: the altitude `arccot(s + tan|φ − δ|)` with `δ` the declination
  of local noon (the hour angle from the sun at Asr itself), plus `T`.
- **Maghrib**: the sun's centre on the level horizon, plus `T` and two
  minutes.
- **Isha**: the sun 17° below the horizon, plus `T`.
- Every time rounded **up** to the minute.
- **Where the sun does not get 19° below the horizon** (north of about
  47.5° in summer), İmsâk, Fajr and Isha are held at the times of the last
  night it did. A night counts as reaching 19° when the sun's lowest point,
  `|φ + δ| − 90°`, does at the declination of either the local solar
  midnight that begins the day or 12:00 UT of the day. The certified list
  has no place that far north; the rule is as the calendar's northern
  cities show it, and no table here holds it.
- The calendar's files give a city's point to the whole arc-minute and it
  computes at a finer one; each place is at the point its year shows.

## Kazakhstan

`src/methods/kazakhstan.ts`. The Spiritual Administration of Muslims of
Kazakhstan's times, read off its cities from 40.8° to 54.9° N.

- A **short series for the sun**: the mean anomaly `g = 357.529° + 0.98560028° D`
  and the mean longitude `q = 280.459° + 0.98564736° D`, with `D` the days
  from J2000.0; the ecliptic longitude `L = q + 1.915° sin g + 0.020° sin 2g`;
  the obliquity `23.439° − 0.00000036° D`; the declination and the equation
  of time from those.
- The day is counted from **0h of the civil date at the place's own
  meridian**: the Julian day of the date less `longitude / 360`.
- Each time is computed **once**, with the sun taken at a fixed first guess
  of its hour — Fajr 5h, sunrise 6h, Dhuhr 12h, Asr 13h, sunset and Isha
  18h — and not iterated.
- **Fajr** and **Isha**: the sun 15° below the horizon.
- **Sunrise** and sunset: the sun 0.833° below the horizon.
- **Asr**: two shadow lengths beyond the noon shadow (Hanafi), the one Asr
  the Administration prints.
- **Where Fajr would fall more than a quarter of the night before sunrise,
  or Isha more than a quarter of the night after sunset** — or the sun does
  not reach 15° — the quarter of the night is taken, the night being from
  sunset to sunrise.
- A **margin** of 3 minutes, 5 minutes from 48° N: sunrise that much
  earlier, Dhuhr and Asr that much later, Maghrib that much after sunset.
  None on Fajr or Isha.
- Every time rounded to the **nearest** minute.
- The whole country is on UTC+5, and every place is printed on it.

## Egypt

`src/methods/egypt.ts`. The Egyptian General Authority of Survey's times,
read off its places from 22.2° to 31.5° N.

- **Meeus's apparent sun** (Morocco's), taken at each time's own moment:
  the declination and the equation of time both, iterated four times from
  the transit.
- **Dhuhr** at the sun's transit.
- **Fajr**: the sun 19.5° below the horizon. **Isha**: 17.5°.
- **Sunrise** and **Maghrib**: the sun's centre 0.845° below the horizon.
- **Asr**: one shadow length beyond the noon shadow — the altitude
  `arccot(s + tan|φ − δ|)` with `δ` the declination of local noon, and the
  hour angle from the sun at Asr itself.
- No margin on any time.
- Every time rounded to the **nearest** minute.
- The whole country is on one clock, summer time included.
- Each place is at the point its published year shows.

## Brunei

`src/methods/brunei.ts`. The Ministry of Religious Affairs' times, read off
its published years.

- **One table for the country**, computed at Bandar Seri Begawan
  (4.892° N, 114.9355° E). A district's times are that table's plus whole
  minutes — Tutong one, Belait three, Brunei-Muara and Temburong none: the
  minutes its seat lies west of the capital, four to a degree, rounded. A
  listed district's point carries them in its longitude.
- **Meeus's apparent sun** (Morocco's) taken **once for the day**, at 0h
  Universal Time of the civil date: that declination and equation of time
  serve every time of the day, and nothing is iterated.
- **Dhuhr**: 1.06 minutes after the sun's transit.
- **Fajr**: the sun 20° below the horizon. **Isha**: 18°.
- **Sunrise** and **Maghrib**: the sun's centre 0.833° below the horizon.
- **Asr**: one shadow length beyond the noon shadow.
- Every time rounded to the **nearest** minute.

## Qatar

`src/methods/qatar.ts`. The Qatar Calendar House's times for Doha, read off
its calendar from 1448 AH on — the year its times changed; the earlier
years are another method and are not this one. The House gives Doha's times
as the reference for the east coast, from Al Khor to Al Wakra.

- **Meeus's apparent sun** (Morocco's) at each time's own moment, its
  declination and equation of time iterated.
- **Fajr**: the sun 18° below the horizon, less 1.12 minutes.
- **Sunrise**: the sun's centre 0.8333° below the horizon, less 0.10.
- **Dhuhr**: 0.95 minutes after the sun's transit.
- **Asr**: one shadow length beyond the noon shadow, plus 0.87 minutes.
- **Maghrib**: sunset (the same 0.8333°) plus 2.02 minutes.
- Each of those rounded to the **nearest** minute.
- **Isha**: ninety minutes after the Maghrib printed.

The margins are the calendar's own, to the hundredth of a minute they can
be read to; computed at 25.29° N, 51.53° E.

## Kuwait

`src/methods/kuwait.ts`. The Ministry of Awqaf and Islamic Affairs' table,
read off the table itself.

- **One table for the country, the same every year.** A day's times are
  those of that day of **1978** — a year in the middle of a leap cycle —
  whatever the year asked for; 29 February has 28 February's.
- Computed at **Kuwait City** (29.33° N, 48.005° E). An area's times are
  the city's plus **whole minutes**, from four before (Qaruh) to six after
  (Salmy). A listed area's point carries its minutes in its longitude, a
  quarter of a degree from the city's to the minute; areas with the same
  minutes are told apart by a thousandth of a degree of latitude, which the
  method does not read. The points are not where the areas are.
- **Meeus's apparent sun** (Morocco's) at each time's own moment, its
  declination and equation of time iterated.
- **Fajr**: the sun 18° below the horizon. **Isha**: 17.5°.
- **Sunrise** and **Maghrib**: the sun's centre 0.8333° below the horizon.
- **Dhuhr**: the sun's transit.
- **Asr**: one shadow length beyond the noon shadow, the noon shadow taken
  from the declination of local noon; plus 0.15 minutes.
- Every time rounded to the **nearest** minute.

## Jordan

`src/methods/jordan.ts`. The Ministry of Awqaf, Islamic Affairs and Holy
Places' times, read off its year for seventeen zones. It is the same kind
of program as Morocco's ministry's, with Jordan's own figures.

- Each zone is computed **at its own point**; none is another zone's times
  plus minutes. Jerusalem is one of the zones, printed like the rest on
  Jordan's clock (UTC+3 all year).
- **Meeus's apparent sun** (Morocco's) at each time's own moment, its
  declination and equation of time iterated.
- **Fajr** and **Isha**: the sun 18° below the horizon. A zone's Fajr is
  earlier by that zone's own margin, between nothing and a minute
  (`Place.fajrMinutes`).
- **Sunrise** and **Maghrib**: the sun's upper limb on the horizon — 34′ of
  refraction and the semi-diameter for the sun's distance that day —
  lowered by the zone's horizon allowance, one eastward (`Place.dipDeg`)
  and one westward (`Place.dipMaghribDeg`): about 0.15° in the Jordan
  Valley, 0.8° to 1.6° on the plateau. No minutes are added.
- **Dhuhr**: the sun's transit.
- **Asr**: on the apparent sun, as Morocco's — the noon shadow from the
  refracted noon altitude, and the moment the refracted sun casts it plus
  one length.
- Every time rounded to the **nearest** minute.

## Tatarstan

`src/methods/tatarstan.ts`. The Spiritual Administration of Muslims of the
Republic of Tatarstan's yearly timetable, read off its year for forty-four
places.

- **Meeus's apparent sun** (Morocco's) at each time's own moment, its
  declination and equation of time iterated.
- **The dawn** — the end of sahur, and the Fajr printed here: the sun 18°
  below the horizon, rounded **down**.
- **Sunrise** and **Maghrib**: the sun's centre 0.8333° below the horizon
  and the place's small horizon allowance (`Place.dipDeg`, up to 0.017°).
  **Dhuhr** here is the timetable's zenith column, the sun's transit.
  **Isha**: 15°. Each rounded **up**.
- **Asr**: two shadow lengths, on the apparent sun as Morocco's is at one —
  the noon shadow from the refracted noon altitude, and the moment the
  refracted sun casts it plus two lengths. Rounded up. The method prints
  this Asr whatever shadow length is asked for.
- **Where the 18° twilight does not form** (May to early August at these
  latitudes): the dawn is 121 minutes before the printed sunrise, and Isha
  90 minutes after the printed Maghrib. Each follows its own twilight — the
  dawn the morning's, Isha the evening's — so the two rules begin and end a
  day apart at most.
- **Not computed here:** the timetable's two times of the mosques. The
  morning prayer as it is read in the mosques is 91 minutes before the
  printed sunrise on every day of the year, and the mosques' Dhuhr is a
  fixed clock time (12:00 in most districts, 11:45 to 12:15 in a few).

## Russia: the Central Muftiate

`src/methods/cdum.ts`. The Central Spiritual Administration of Muslims of
Russia's yearly timetables, read off its year for eighteen cities from
Rostov-on-Don to Saint Petersburg and Khabarovsk.

- **Kazakhstan's sun and arithmetic**: the short series for the sun, the day
  counted from 0h of the civil date at the place's own meridian, each time
  computed once with the sun taken at a fixed first guess of its hour (Fajr
  5h, sunrise 6h, Dhuhr 12h, Asr 13h, sunset and Isha 18h), not iterated.
- **Fajr** 18°, **Isha** 17°; **sunrise** and **Maghrib** at −0.833°;
  **Asr** at two shadow lengths beyond the noon shadow. The method prints
  this Asr whatever shadow length is asked for.
- **A margin of 2 minutes on every time**: Fajr and sunrise earlier; Dhuhr,
  Asr, Maghrib and Isha later. Then the nearest minute.
- **Where the twilight does not form** — the sun does not reach 18° in the
  morning, or 17° in the evening: late April to mid-August in the north of
  the list, never in the south of it — **the 45th parallel's share of the
  night**. The same day's six times are computed, margins and rounding
  included, at latitude 45° on the place's own meridian. With the night
  taken as 1440 minutes less Maghrib-minus-sunrise, on the printed minutes
  at both places:

      Fajr = sunrise − (Fajr-to-sunrise at 45°) × night / night at 45°
      Isha = Maghrib + (Maghrib-to-Isha at 45°) × night / night at 45°

  and the time's minute is cut off, not rounded. Everything in it is a whole
  number of minutes, so the cut is exact in any arithmetic. The morning and
  the evening are judged each on its own: at the edge of the season one may
  follow its angle while the other follows the parallel.
- **Where the sun does not rise or set** the timetable prints the 45th
  parallel's own day. No place listed is that far north, and the method
  gives no times there.

## A reference town's table: Albania and Bulgaria

`src/methods/townTable.ts`, with `albania.ts` and `bulgaria.ts`. Each
authority prints one table, computed for one town, and gives every other
town as a whole number of minutes on it.

- **The sun is taken once a day.** Meeus's apparent sun (Morocco's) is read
  at one fixed moment, and that one declination and one equation of time
  serve every time of the day: Dhuhr from the transit, the others the
  transit plus or minus the hour angle of their altitude. Nothing is
  iterated to a time's own moment — which is what told these tables from
  every other here: with the sun at each time's own moment the mornings fit
  one day and the evenings another.
- **Fajr** 18°, **Isha** 17°, **sunrise** and **Maghrib** with the sun's
  centre 0.8333° below the horizon, **Asr** one shadow length beyond the
  noon shadow (two, for a reader who asks for the Hanafi Asr).
- **Margins**, the old temkin: sunrise 7 minutes earlier, Dhuhr 5 later, Asr
  4 later, Maghrib 7 later; none on Isha. Then the nearest minute.
- **A town** is the reference town's table plus its whole minutes. A listed
  town's point carries them in its longitude — a quarter of a degree from
  the reference town's to the minute, west later — and towns with the same
  minutes are told apart by a thousandth of a degree of latitude, which the
  method does not read. The points are not where the towns are.

### Albania

The Muslim Community of Albania's calendar: Tirana, at the 41°20′ N,
19°49′ E the calendar itself gives, and twenty-one towns of Albania,
Kosovo, North Macedonia, Montenegro and the Preševo valley. The sun is
taken at **0h UT of the date**; Fajr — the calendar's Imsak — has no
margin.

### Bulgaria

The Grand Mufti's Office's timetable: Sofia (42.708° N, 23.3219° E) and
forty-seven towns. The sun is taken at **11h UT of the day before**; Fajr
is a minute earlier than 18°.

## Pakistan: Jamia Banuri Town

`src/methods/banuri.ts`. The prayer times Jamia Uloom-ul-Islamia, Banuri
Town (Karachi) gives on its own page for a hundred cities of Pakistan, read
off its year. This is the university the "Karachi" convention of 18° and
18° is named after; what follows is how its own times are computed, which
is more than the two angles.

- **Kazakhstan's sun and arithmetic**: the short series for the sun, the day
  counted from 0h of the civil date at the place's own meridian, each time
  computed once with the sun taken at a fixed first guess of its hour (Fajr
  5h, sunrise 6h, the zenith 12h, Asr 13h, sunset and Isha 18h), not
  iterated.
- **Fajr** and **Isha** at 18°; **sunrise** and **Maghrib** at −0.833°.
- **Dhuhr** is the zenith (zawal), the sun's transit: the page prints that
  moment and no Dhuhr of its own.
- **Asr** at two shadow lengths beyond the noon shadow, the Hanafi Asr the
  page gives by default; `banuriTimes` takes one shadow length as its last
  argument for the page's other setting. The library's places print the
  default.
- **No margin on any time.** Each is rounded to the nearest minute.
- Each city is computed at its own point (`data/places/banuriCities.json`),
  read off the timetable: the point at which the method prints the city's
  year.

## United Arab Emirates

`src/methods/uae.ts`. The prayer times the General Authority of Islamic
Affairs, Endowments and Zakat publishes for its forty-one zones, read off
its year. It is Jordan's and Morocco's kind of program, with the
Authority's own figures.

- **Meeus's apparent sun** at each time's own moment, the declination and
  the equation of time iterated.
- **Fajr** and **Isha** at 18°.
- **Sunrise** and **Maghrib** with the sun's upper limb on the horizon — 34′
  of refraction and the semi-diameter for the sun's distance that day —
  lowered by the zone's **horizon allowance**, one eastward and one
  westward: about 0.35° on the low islands, 0.54° in most towns, 1.2° on
  Jebel Hafeet and 1.6° on Jebel Jais.
- **The zone's morning**, Fajr and sunrise both, earlier by the zone's own
  margin: nothing in a zone of one place, up to 2.2 minutes in a wide one.
- **Dhuhr** two minutes after the sun's transit.
- **Asr** on the apparent sun, one shadow length beyond the noon shadow,
  and **the noon shadow is taken at Dhuhr**: the sun's refracted altitude
  two minutes after the transit. South of 24° N, where the midsummer sun
  passes almost overhead, those two minutes lengthen the shadow enough to
  move Asr by most of a minute.
- **Every time rounded to the nearest minute.**
- **Imsak**, which the Authority prints too, is Fajr less ten minutes.

Each zone is computed at its own point (`data/places/uaeZones.json`, with
its two allowances and its morning margin), read off the timetable.

## Iran: Institute of Geophysics, Tehran

`src/methods/tehran.ts`. The method the Institute of Geophysics of the
University of Tehran computes its Calendar Center's yearly sheets by, read
off two years of the sheets for the thirty-one province capitals. It is a
plain program with no margins.

- **Meeus's apparent sun** at each time's own moment, the declination and
  the equation of time iterated.
- **Fajr** with the sun 17.7° below the horizon.
- **Sunrise** and sunset with the sun's centre 0.8333° below it.
- **Dhuhr** at the sun's transit.
- **Maghrib** with the sun 4.5° below the horizon, after sunset.
- **Every time rounded to the nearest minute.**
- **Asr and Isha are not printed** by the Institute. The method computes
  them as it is given everywhere — Asr at one shadow length beyond the noon
  shadow, Isha with the sun 14° below the horizon — and no table holds
  them, so the certification is of Fajr, sunrise, Dhuhr and Maghrib.
- The sheets print two more columns, outside the six times this library
  gives: sunset, and **midnight, halfway from sunset to the next day's
  Fajr** (`tehranSunsetAndMidnight`, TypeScript only, without a correction
  list).

Each capital is computed at its own point (`data/places/tehranCities.json`):
the point its sheet names to two decimals, read to three.

## United Kingdom: Wifaqul Ulama

`src/methods/wifaq.ts`. The method Wifaqul Ulama (Britain) computes its
yearly timetables by, for some eighty towns from Aberdeen to Jersey. Its
page states the angles and the two margins; the rest is read off the
timetables of two years.

- **Meeus's apparent sun** at each time's own moment, the declination and
  the equation of time iterated.
- **Fajr** with the sun 18° below the horizon. The search for it starts
  from the sun of 0h UT of the date: on the last night of the twilight
  season, where 18° is reached for a few minutes only, that first reading
  decides whether Fajr forms at all.
- **Fajr in the summer twilight.** Where the sun of Fajr's own moment no
  longer reaches 18°, the sun of 0h UT of the date is asked instead — a
  night or two at each edge of the season. On the nights neither reaches
  it, Fajr is **the middle between that date's sunset and the sunrise of
  the day before**, twelve hours earlier: close to the middle of the night,
  a little after it in May and a little before it in late July.
- **Sunrise** and sunset with the sun's centre 0.8333° below the horizon.
- **Zuhr** four minutes after the sun's transit.
- **Asr** at one shadow length beyond the noon shadow (Shafi'i) or two
  (Hanafi). The noon shadow is taken from the sun's declination an hour and
  a half before 0h UT of the date, not at noon; the time itself is on its
  own sun.
- **Maghrib** five minutes after sunset.
- **Isha** with the sun 15° below the horizon, or **a seventh of the
  night** — sunset to the next sunrise — after sunset, whichever is
  earlier; the seventh alone where 15° is not reached.
- **Every time rounded to the nearest minute**; the Shafi'i Asr alone is
  rounded down.

The timetables print both Asrs. This library gives one Asr a place, and
for this authority it is the **Hanafi** one — the one the page names where
no local scholar says otherwise, and the one the correction list is for.
`wifaqTimes(…, 1)` gives the Shafi'i Asr by the same method, without the
list.

Each town is computed at its own point (`data/places/wifaqTowns.json`),
read off its timetable; the timetables print none.

## Tunisia

`src/methods/tunisia.ts`. The prayer times the Institut National de la
Météorologie gives for a place and a day, read off a year of its answers at
twenty-six places.

- **Meeus's apparent sun.**
- **Dhuhr** and **Asr** on *the sun of the day*: its declination and
  equation of time at 0 h UT, held for both. Dhuhr is seven minutes after
  that sun's transit; Asr is where its shadow is one length beyond the noon
  shadow, in plain geometry (no refraction).
- **Fajr** and **Isha** at 18°, the sun taken at each time's own moment
  (iterated), **the horizon lowered by the place's allowance**: the dip of
  its height, 0.06° on the coast, 0.5° at Béja and Tataouine, 0.88° at Le
  Kef.
- **Maghrib** two minutes after sunset; sunset with the sun's centre
  0.8333° below the horizon, lowered by the same allowance.
- **Every time rounded to the nearest minute.**
- **No sunrise is given.** The one the method returns is the mirror of its
  sunset — the same horizon and allowance, no margin — and is not checked
  against anything.

Each place is computed at its own point with its own allowance
(`data/places/tunisiaPlaces.json`). Two places, Kairouan and Sidi Bouzid,
take theirs at sunset only from 2026: their Fajr and Isha are at a plain
18°. Through 2025 the Institute lowered their Fajr and Isha by the same
allowance as their sunset, like every other place's; the place carries
that earlier allowance and the last year it applies to
(`Place.dipDegEarlier`, `Place.dipDegUntil`; revision 2).

## Checking a port

1. Take `test/vectors.json`. For each case, compute the six times at the
   given point (with the place's own fields: dips, highland class, Isha
   angle, per-prayer points, clock) and compare the instants and the printed
   minutes.
2. The vectors include the days the clocks change and a table on its own
   clock; a port that prints the wrong day's offset shows up there.
3. Then apply the correction list and compare against the authority's own
   published table for a place and a month. The list is small on purpose: if
   a port needs more than it, the port is not the method.
