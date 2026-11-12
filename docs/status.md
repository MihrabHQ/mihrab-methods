# Where each method stands

Every figure in the table and in the paragraphs below is generated from
[`certification.json`](../certification.json) (`node scripts/readme.mjs`),
except inside the blocks marked **Research note**: those are a dated record
of the research, kept so nothing is lost, and their counts are not part of
the certification.

## The gate: 100 % or not at all

A method may be used only once it reproduces **every** time of its
authority's timetable on the printed minute — not one minute off, anywhere.
`npm run certify` checks each method day by day and writes
`certification.json`; `timesFor` throws `UncertifiedMethodError` for any
method not certified there, and says `status: 'method-only'` for a date
beyond the span it was checked over. `candidateTimes` runs a method
regardless, for research and for the check itself — not for showing anyone
their prayer times.

Days the timetable itself gets wrong (another town's times under a name, a
previous year's figures for the date, a figure that differs from the
authority's own) are set aside and listed in the record, so each can be
judged.

The goal is 100 % on the printed minute, for every time of a full year, for
each method.

<!-- certification-table:start -->
| Authority | Tables matched | Places | Times checked | Off the printed minute | By the method alone | Correction entries | Checked over |
|---|---|---:|---:|---:|---:|---:|---|
| **Sweden** | Islamiska Förbundet’s tables | 107 | 63,114 | **0** | 99.968 % | 270 | 11 Oct 2026 → 14 Dec 2027 |
|  | Diyanet’s own tables | 159 | 1,393,794 | **0** | 99.981 % |  | 1 Jan 2024 → 31 Dec 2027 |
| **Diyanet** | its tables worldwide | 8,318 | 71,630,078 | **0** | 99.987 % | 9,101 | 1 Jan 2024 → 31 Dec 2027 |
| **Morocco** | Habous | 164 | 94,350 | **0** | 99.885 % | 108 | 27 Aug 2026 → 30 Nov 2026 |
| **Algeria** | Ministry of Religious Affairs | 68 | 101,184 | **0** | 99.365 % | 642 | 1 Oct 2026 → 5 Jun 2027 |
| **Indonesia** | Kemenag | 517 | 362,934 | **0** | 99.935 % | 234 | 7 Oct 2026 → 31 Jan 2027 |
| **Türkiye Takvimi** | its cities’ years | 821 | 1,812,768 | **0** | 99.952 % | 860 | 31 Dec 2025 → 2 Jan 2027 |
| **Kazakhstan** | the Spiritual Administration’s times | 84 | 551,880 | **0** | 100.000 % | 0 | 1 Jan 2025 → 31 Dec 2027 |
| **Egypt** | the Survey Authority’s times | 77 | 168,630 | **0** | 99.373 % | 1,056 | 1 Jan 2026 → 31 Dec 2026 |
| **Brunei** | the Ministry’s times | 4 | 17,064 | **0** | 99.671 % | 56 | 9 Jan 2025 → 31 Dec 2026 |
| **Qatar** | the Calendar House’s times | 1 | 708 | **0** | 96.186 % | 27 | 16 Jun 2026 → 11 Oct 2026 |
| **Kuwait** | the Ministry’s table | 46 | 201,480 | **0** | 95.205 % | 9,660 | 1 Jan 2026 → 31 Dec 2027 |
| **Jordan** | the Ministry’s times | 17 | 37,230 | **0** | 98.380 % | 603 | 1 Jan 2026 → 31 Dec 2026 |
| **Tatarstan** | the Administration’s timetable | 44 | 96,360 | **0** | 98.071 % | 1,858 | 1 Jan 2026 → 31 Dec 2026 |
| **Russia (Central Muftiate)** | the Central Muftiate’s timetables | 18 | 39,342 | **0** | 99.877 % | 48 | 1 Jan 2026 → 31 Dec 2026 |
| **Albania** | the Community’s calendar | 22 | 48,180 | **0** | 98.082 % | 924 | 1 Jan 2026 → 31 Dec 2026 |
| **Bulgaria** | the Grand Mufti’s Office’s timetable | 48 | 105,120 | **0** | 97.671 % | 2,448 | 1 Jan 2026 → 31 Dec 2026 |

16 of 16 methods certified; 0 of 76,724,216 times off the printed minute. Last checked 9 November 2026. Generated from [`certification.json`](../certification.json) by `scripts/readme.mjs`.
<!-- certification-table:end -->

## Sweden

Certified over <!--fig:sweden.check1.span-->1 Jan 2024 → 31 Dec 2027<!--/fig--> against Diyanet's own
tables for Sweden (<!--fig:sweden.check1.places-->159<!--/fig--> places), and over
<!--fig:sweden.check0.span-->11 Oct 2026 → 14 Dec 2027<!--/fig--> against Islamiska Förbundet's published tables
(<!--fig:sweden.check0.places-->107<!--/fig--> of its towns). Set aside from Islamiska
Förbundet's: <!--fig:sweden.check0.sourceFaults-->35,491<!--/fig--> times that differ from Diyanet's own
table for the day (its next year's rows repeat this year's figures), and
<!--fig:sweden.check0.copiedRows-->696<!--/fig--> rows copied from another day. On each, the method
gives Diyanet's own table.

> **Research note, 2026-10-16** (not generated): Kiruna, printed with
> Umeå's times, is not compared; Islamiska Förbundet lists 108 towns.

## Diyanet

Certified over <!--fig:diyanet.span-->1 Jan 2024 → 31 Dec 2027<!--/fig--> for <!--fig:diyanet.check0.places-->8,318<!--/fig-->
places in Türkiye, Northern Cyprus and abroad (Sweden's are under Sweden).
Each place is computed at a point of its own, checked to lie in the place's
country.

> **Research note, 2026-10-16** (not generated). Of the 8 528 places
> Diyanet lists, 8 291 were included, with Sweden's 159. Not yet included:
>
> - 147 places that could not be placed — seven of them Diyanet serves no
>   table for (Grozny, Gudermes, Shali and Urus-Martan, Rožaje, Monte
>   Carlo, Punta Arenas), the rest names the gazetteer does not match;
> - 75 whose tables the method does not yet follow over all four years —
>   about half of them in Mexico and Australia, whose tables keep a clock of
>   their own, the rest scattered (Kazan, Fez, Ushuaia, Svalbard among them);
> - 12 whose tables Diyanet computes at a point elsewhere — in another
>   country, at sea or in the other hemisphere (Tupiza, Ribeirão das Neves,
>   Montería, Hami, Kungälv and Galena among them);
> - Syktyvkar, whose 2024 and 2027 tables print a Fajr hours from its 2025
>   and 2026 ones;
> - Ping Tung City and Rilchingen-Hanweiler, each listed again at the same
>   point (as Pingtung and Kleinblittersdorf) with a table a minute apart on
>   two days.
>
> **Research note, 2026-11-11, the places not yet included** (not
> generated). The 237 were gone through again, blind: each table's latitude
> from its day length, its longitude and clock from its Dhuhr, then the
> gazetteer by name and zone, then the 0.001° lattice. 186 more are now
> included, 61 of them on a clock of their table's own. Still out:
>
> - 7 Diyanet serves no table for, and 22 that could not be placed;
> - 9 the method does not follow: Lugano, Mistelbach, Zemplín, Ushuaia,
>   Syktyvkar, Kløfta, Ukhta and Río Gallegos, and Le Pont-de-Claix, whose
>   Fajr is 2–23 minutes from its table's between 18 May and 20 June 2026;
> - 7 whose table is another place's than the name says (listed as Uliastay,
>   Amur, Boro Burgaasa, Karatau, Awash, Pokachi and Velikiye Luki);
> - 4 listed a second time at the same point as a place already included;
> - Brazzaville and Pointe-Noire, which Diyanet lists under no country.
>
> **Research note, 2026-11-11** (not generated). Every place with two or
> more corrections was tried one step of the 0.001° lattice away in each
> direction (2,086 places). Fifteen sit a step from where their table is
> computed, and moving them takes 256 corrections off the list: Logoysk
> 55 → 13 times off by the method alone, Alchevsk 35 → 2, Changchun 31 → 1,
> Nuuk 28 → 1, Bad Dürrheim 34 → 11, Keshan 26 → 10, Okazaki 15 → 0, Playa
> del Carmen 12 → 0, Sandgate 12 → 1, Gosnells 12 → 1, Al Fayyum 10 → 0,
> Ayr 9 → 0, Guaymas 7 → 0, Mérida 6 → 1, Ciudad Delicias 5 → 0. The other
> 2,071 are where they should be. The fifteen are for Diyanet's next
> revision: moving a point changes what the method prints there, and a
> revision raised for fifteen places would ask every reader of Diyanet's
> times to update for nothing they would see.

## Morocco

Certified over <!--fig:morocco.span-->27 Aug 2026 → 30 Nov 2026<!--/fig--> (<!--fig:morocco.check0.places-->164<!--/fig-->
cities): the method gives <!--fig:morocco.alonePct-->99.885<!--/fig--> % alone, and a list of
<!--fig:morocco.corrections-->108<!--/fig--> corrections the rest. Certification covers only the dates
in the table: each newly published month is checked against the method, and
its corrections are added in a new list.

> **Research note, 2026-11-12** (not generated). Revision 2's points were
> fitted on the autumn of 2026, and autumn is the season that says least
> about a city's latitude. The ministry's pages of July and August 2022, in
> the Internet Archive for nearly every city, are the same program in
> summer. On those days and the rest since May 2022 revision 2 gave the
> printed minute for 98.95 % (185 of 17,580 times off). Refitting each
> city's point on the 2026 tables and half of those days took the misses on
> the other half from 185 to 147, so revision 3 is the refit on all of
> them: 112 points moved, none by more than 0.014° of latitude or 0.01° of
> horizon, and on every day held the misses fell by half. Only Rabat has
> every season of this program; winter and spring are still seen through
> one city.

## Algeria

Certified over <!--fig:algeria.span-->1 Oct 2026 → 5 Jun 2027<!--/fig--> (<!--fig:algeria.check0.places-->68<!--/fig-->
cities): the method gives <!--fig:algeria.alonePct-->99.365<!--/fig--> % alone, and a list of
<!--fig:algeria.corrections-->642<!--/fig--> corrections the rest. The method is at its limit: the
angles, horizon, Maghrib margin, rounding, sun series, iterations and city
points are each sharp optima, and the corrections are independent
differences of about a second or less (no pattern by prayer, city, date or
season; refitting the points to them only fits noise, and is worse on days
held out).

## Indonesia

Certified over <!--fig:indonesia.span-->7 Oct 2026 → 31 Jan 2027<!--/fig--> (<!--fig:indonesia.check0.places-->517<!--/fig-->
regencies and cities): the method gives <!--fig:indonesia.alonePct-->99.935<!--/fig--> % alone, and a
list of <!--fig:indonesia.corrections-->234<!--/fig--> corrections the rest. Since revision 2 nothing
is fitted: each regency is computed at the ministry's own coordinates, with
the sun taken without ΔT as the ministry's program takes it. The corrections
are independent differences at a minute's edge.

> **Research note, 2026-11-11** (not generated), on revision 1. Its points
> were fitted to October–December 2026, and on those months the method
> alone was a minute off once in 3,200 times; on January 2027, which the
> fit had not seen, once in 300. The fitted points had taken up a fifth of
> a second that belongs to the sun (ΔT), which no point can carry through
> the seasons. A figure "by the method alone" over the months a method's
> points were fitted to says less than it seems: Morocco's and Algeria's
> points are fitted too (Morocco's against every season of 2014–2025;
> refitting them freely to the 2026 autumn made unseen days three times
> worse, so they stand).
>
> Revision 1 said: Karawang's Asr, Maghrib
and Isha are computed at a second point, about 2 km north-east of its first
> (its afternoon fits it, and it holds on days held out). The corrections are
> independent differences at a minute's edge, and refitting points to them
> only fits noise.

> **Research note, 2026-10-16** (not generated), on the list of 84 then:
> median 0.2 s from the minute's edge, nine in ten under 1.3 s, the largest
> 3.9 s — eight of them at Sibolga, whose mornings no point fits. Certification covers only the dates in the tables:
each newly published month is checked against the method, and its
corrections are added in a new list.

> **Research note, 2026-11-11, eleven earlier months** (not generated).
> Revision 2 was run, without its list, against the ministry's tables for
> November 2025 → September 2026, which it had never seen: 1,036,068 times,
> never more than a minute off, and month by month off 0.03–0.14 % of the
> time, as over the certified months. The exception is two days, 21 and 22
> March 2026, when a third of the ministry's own times are a minute later
> than on the days around them, in every prayer and across the country. A
> small yearly wave fitted to what is left halves it on the months it was
> fitted to and does nothing for the months after, so the method was left
> as it is.

## Türkiye Takvimi

Certified over <!--fig:turkiyetakvimi.span-->31 Dec 2025 → 2 Jan 2027<!--/fig--> (<!--fig:turkiyetakvimi.check0.places-->821<!--/fig-->
cities — Türkiye's province centres and districts): the method gives <!--fig:turkiyetakvimi.alonePct-->99.952<!--/fig--> %
alone, and a list of <!--fig:turkiyetakvimi.corrections-->860<!--/fig--> corrections the rest.
Fajr is the calendar's Sabâh; its İmsâk is not among the six times the
library gives. Each city is at the point and with the temkin its year
shows: the calendar's own files give the point only to the arc-minute.

> **Research note, 2026-11-11, the districts** (not generated). For each
> district Diyanet lists in Türkiye the calendar's city of the same name
> was looked for within 20 km of it: 833 of 869 have one. Each was fitted
> to its year (latitude within 0.02° of the calendar's file, then the
> longitude and the temkin) and taken in when the method alone was off at
> most six times in the year: 740 were, beside the 81 centres. The 16 left
> out are all on the northern edge, the Black Sea coast of Kastamonu and
> Sinop and three districts of Edirne and Kırklareli, off 8–39 times a
> year; Sinop itself needed a point outside its file's arc-minute, so the
> calendar does something there that is not read yet. Districts named
> alike carry their province in the name.
>
> **Research note, 2026-11-11** (not generated). The calendar lists about
> 120,000 cities; the first list was Türkiye's 81 province centres, where
> the method alone is a minute off about once in 3,400 times and never
> more. Each point and temkin was then searched within 0.03° for the
> fewest times off (71 → 52). İstanbul keeps ten corrections, all on
> sunrise and Maghrib in December 2026 with one in March, which no point
> or temkin within 0.12° removes; no other city has more than three. The rule for the nights that do not reach 19° (north of about
> 47.5°) is in the method as the calendar's northern cities show it, and no
> place of the list holds it to a table. A sample of 40 cities elsewhere in
> Türkiye and 38 in the rest of the world below 60°, fitted the same way,
> came out at about the same rate.

## Kazakhstan

Certified over <!--fig:kazakhstan.span-->1 Jan 2025 → 31 Dec 2027<!--/fig--> (<!--fig:kazakhstan.check0.places-->84<!--/fig-->
cities and towns, each at the coordinates the Administration gives it):
the method gives <!--fig:kazakhstan.alonePct-->100.000<!--/fig--> % alone, and its correction list has
<!--fig:kazakhstan.corrections-->0<!--/fig--> entries. Asr is the Hanafi one, the only Asr the Administration
prints; the library's Hanafi switch leaves it as it is, and there is no
table to hold a one-shadow Asr to.

> **Research note, 2026-11-11** (not generated). The method was read off
> ten cities' year first and then run against every place: nothing was
> fitted per place, and no point was moved. The margin steps from three
> minutes to five between 47.97° and 48.00° N in the places listed (three
> at 47.967°, five at 48.001°); 48° is taken as the step. Five more places the Administration
> lists have no year to check against and are left out.

## Egypt

Certified over <!--fig:egypt.span-->1 Jan 2026 → 31 Dec 2026<!--/fig--> (<!--fig:egypt.check0.places-->77<!--/fig-->
cities and towns): the method gives <!--fig:egypt.alonePct-->99.373<!--/fig--> % alone, and a list of
<!--fig:egypt.corrections-->1,056<!--/fig--> corrections the rest. The Authority publishes the
current year, so the span goes on a year at a time.

> **Research note, 2026-11-11** (not generated). The times off by the
> method alone are spread evenly over the six prayers, Dhuhr included
> (about 0.6 % each), and each is a single minute. No sun tried in its
> place — NOAA's series, the precise ephemeris with or without ΔT, the
> equation of time at a fixed hour — and no rounding by the second first
> removes them, so they are taken as the Authority's own program's and
> left to the list. Two things moved the fit most: Asr's noon shadow from
> the declination of local noon (about twenty times off a year per place
> down to two), and the equation of time at each time's own moment rather
> than noon's. The horizon was read as 0.845°, between 0.84° and 0.85°.
> Each place's point is fitted to its year; five more names the Authority
> lists carry no table and are left out.

## Brunei

Certified over <!--fig:brunei.span-->9 Jan 2025 → 31 Dec 2026<!--/fig--> (<!--fig:brunei.check0.places-->4<!--/fig-->
districts): the method gives <!--fig:brunei.alonePct-->99.671<!--/fig--> % alone, and a list of
<!--fig:brunei.corrections-->56<!--/fig--> corrections the rest. The Ministry prints one table
for the country and the districts as minutes on it, so the four districts
are one check counted four times.

> **Research note, 2026-11-11** (not generated). The Ministry's published
> list is entered by hand and carries slips: days with a figure that cannot
> be read as a time or that puts the day's times out of order, three dates
> entered twice, and a few days whose figure on one prayer stands more than
> two minutes from both the day before and the day after. Those days —
> eleven over the two years — are left out of the check and are not taught
> to the correction list: the method is held to the days the list prints
> soundly. What the sound days show: the sun is taken once for the day, at
> 0h UT (with it at each time's own moment the afternoon and evening times
> are off about one day in nine; taken once, one in three hundred); and
> Dhuhr is 1.06 minutes after the transit, not a whole minute (55 days off
> with a whole one, four with 1.06). The first eight days of January 2025
> are not in the list.

## Qatar

Certified over <!--fig:qatar.span-->16 Jun 2026 → 11 Oct 2026<!--/fig--> (<!--fig:qatar.check0.places-->1<!--/fig-->
place, Doha): the method gives <!--fig:qatar.alonePct-->96.186<!--/fig--> % alone, and a list of
<!--fig:qatar.corrections-->27<!--/fig--> corrections the rest.

> **Research note, 2026-11-12** (not generated). The span is short, and
> that is the thing to know about this method: the House changed its times
> with its 1448 calendar (Dhuhr and Asr moved a minute later, and the
> calendar carries a note about a new study), so only the months of 1448
> printed so far are this method's — 118 days, mid-June to mid-October.
> The margins were read from those days alone; winter has not been seen,
> and a margin that is slightly off would show there as more corrections
> and be refitted as a new revision. Nearly all of the days off are
> Maghrib's (and Isha's with it, being Maghrib plus ninety): its distance
> from the computed sunset drifts by about half a minute between June and
> September, which a fixed margin does not follow. Doha is the only place:
> the calendar prints Doha in full and, for Al-Shamal, Dukhan and Abu
> Samra, minutes to add at Fajr and Maghrib only.

## Kuwait

Certified over <!--fig:kuwait.span-->1 Jan 2026 → 31 Dec 2027<!--/fig--> (<!--fig:kuwait.check0.places-->46<!--/fig-->
areas): the method gives <!--fig:kuwait.alonePct-->95.205<!--/fig--> % alone, and a list of
<!--fig:kuwait.corrections-->9,660<!--/fig--> corrections the rest. The Ministry prints one table
for Kuwait City and the areas as minutes on it, so the 46 areas are one
check counted 46 times — and the list is one list of 105 times a year,
written out for each area and each year.

> **Research note, 2026-11-12** (not generated). The table has no year: it
> is 366 days, the same every year, and 29 February repeats 28 February.
> Its Dhuhr is the transit of the sun of a year two after a leap year, and
> of the 1970s rather than now (1974 and 1978 give 360 of 365 days; later
> years of the same phase a few fewer, other phases far fewer), which is
> why no present-day calculation reproduces it. With 1978's sun the
> standard angles give Fajr and Maghrib on 357 days of 365, Dhuhr on 360,
> sunrise and Isha on 341, and Asr on 334 — Asr only with the noon shadow
> taken from noon's declination. The rest are a minute off with no pattern
> found, September's Asr apart, which runs half a minute early for the
> whole month. A table that never changes is certified once: the same list
> serves every year, only its dates are rewritten.

## Jordan

Certified over <!--fig:jordan.span-->1 Jan 2026 → 31 Dec 2026<!--/fig--> (<!--fig:jordan.check0.places-->17<!--/fig-->
zones): the method gives <!--fig:jordan.alonePct-->98.380<!--/fig--> % alone, and a list of
<!--fig:jordan.corrections-->603<!--/fig--> corrections the rest.

> **Research note, 2026-11-12** (not generated). A quarter of the list is
> one prayer in one zone: Aqaba's Maghrib (148 of its 365 days). Against
> the computed sunset it is 3.7 minutes later in winter and 5.1 in summer,
> which is neither a fixed angle nor fixed minutes — it follows the sun's
> bearing, the way a real skyline to the west would, and a single horizon
> allowance cannot. Aqaba's sunrise shows nothing of the kind. Without it
> the method alone is at 99.0 %. Each zone's Fajr margin is read off its
> own year (nothing in the Valley, Azraq, Ma'an, Aqaba and Ruwayshid; a
> minute at Umm al-Qutan); no rule common to the zones was found for it.
> Asr settled the family of the program: with Morocco's rule on the
> apparent sun it is off on 81 days of 6,205, with the plain shadow on
> more than 200.

## Tatarstan

Certified over <!--fig:tatarstan.span-->1 Jan 2026 → 31 Dec 2026<!--/fig--> (<!--fig:tatarstan.check0.places-->44<!--/fig-->
places): the method gives <!--fig:tatarstan.alonePct-->98.071<!--/fig--> % alone, and a list of
<!--fig:tatarstan.corrections-->1,858<!--/fig--> corrections the rest.

> **Research note, 2026-11-12** (not generated). The check is of six
> columns of the timetable's eight: the end of sahur as Fajr, sunrise, the
> zenith as Dhuhr, Asr, Maghrib and Isha. The other two are the mosques'
> own: a morning prayer 91 minutes before sunrise on all 16,060 rows, and a
> Dhuhr at a fixed clock time — 12:00 in thirty-seven districts, 11:45,
> 11:50, 12:05 or 12:15 in six, and in one 12:05 for seven weeks of winter
> and 12:00 otherwise. A reader in Tatarstan who follows the mosque wants
> those two, and an app can show them from the same sunrise; they are not
> times of the sun and are not certified here. The white-night rule is
> exact: on every row but four the dawn is the rule's when the morning's
> 18° twilight does not form and Isha is the rule's when the evening's does
> not. Asr decided the family of the program, as in Jordan: at two shadows
> on the apparent sun it is off about one day in thirty, on the true sun
> one day in four.

## Russia: the Central Muftiate

Certified over <!--fig:cdum.span-->1 Jan 2026 → 31 Dec 2026<!--/fig--> (<!--fig:cdum.check0.places-->18<!--/fig-->
cities): the method gives <!--fig:cdum.alonePct-->99.877<!--/fig--> % alone, and a list of
<!--fig:cdum.corrections-->48<!--/fig--> corrections the rest.

> **Research note, 2026-11-12** (not generated). The Muftiate publishes
> twenty-one cities; eighteen are here. Kazan's page follows another rule
> (18° and 15°, no margins, fixed intervals in the white nights) and the
> city is in the Tatarstan method from its own Administration. Ufa's
> timetable is published as pictures. Salekhard, on the Arctic Circle,
> follows this method through the year — its days of midnight sun are the
> 45th parallel's own — but on five days at the edges of that season, when
> Maghrib falls after midnight, the page prints a Fajr in the evening and an
> Isha in the morning; a method should not give those, and the city is left
> out rather than certified around them. What decided the family of the
> program was sunrise: with an iterated sun one day in nine is a minute off
> at Moscow's latitude, with the sun taken once at 6h none is. The white-night
> rule was read from the ratio of the twilight to the night, which on any
> one date is the same in every northern city of the list and is the 45th
> parallel's; computed on the printed minutes and cut, it gives 2,525 of
> the 2,533 white-night times, and the other eight follow a neighbouring
> time that is itself on the other side of a minute.

## Albania

Certified over <!--fig:albania.span-->1 Jan 2026 → 31 Dec 2026<!--/fig--> (<!--fig:albania.check0.places-->22<!--/fig-->
towns): the method gives <!--fig:albania.alonePct-->98.082<!--/fig--> % alone, and a list of
<!--fig:albania.corrections-->924<!--/fig--> corrections the rest.

## Bulgaria

Certified over <!--fig:bulgaria.span-->1 Jan 2026 → 31 Dec 2026<!--/fig--> (<!--fig:bulgaria.check0.places-->48<!--/fig-->
towns): the method gives <!--fig:bulgaria.alonePct-->97.671<!--/fig--> % alone, and a list of
<!--fig:bulgaria.corrections-->2,448<!--/fig--> corrections the rest.

> **Research note, 2026-11-12** (not generated). Both are one town's table
> and a column of minutes, so a town's corrections are the reference town's
> own, on the same days: Tirana's 42 times and Sofia's 51 are all there is,
> each counted once a town. What the tables are not is a sun followed
> through the day. Fitted with the sun at each time's own moment, Sofia's
> mornings wanted the calendar three quarters of a day back and its evenings
> a day and a quarter; one sun for the whole day, read thirteen hours before
> the date begins, gives both. Tirana's is read at 0h UT. Neither moment is
> a round local hour, and the Bulgarian page names no year: whether its
> table is computed afresh each year or kept is not known from one year of
> it, and the next year's check will say. The margins are the old temkin:
> seven minutes at each end of the day, five on Dhuhr, four on Asr.

## Not here, and why

> **Research note, 2026-11-11** (not generated).
>
> - **MUIS (Singapore)** is not a method of this library and is not planned
>   as one. Its table cannot be put on the minute by a formula: what is left
>   after the best one is not a fraction of a second at a minute's edge but a
>   pattern (Dhuhr drifts by up to about 0.4 minutes over half a year, the
>   other way round the next year), so a correction list for it would cover
>   about one time in twenty and grow with every year published. MUIS
>   publishes its timetable itself, free to use; that is where to take it
>   from.
> - **JAKIM (Malaysia)**: the zone method stands at about 95 % on the
>   minute, with whole columns in some states that no formula tried
>   reproduces. Not added until that changes.
