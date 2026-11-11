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
Tangier, Casablanca, Laayoune and a dozen more, every month of the year. The
ministry's program changed between 2019 and 2023 (until then Asr was the
noon shadow on the true sun); this is the program it has used since.

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
