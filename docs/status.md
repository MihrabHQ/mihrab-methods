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
| **Sweden** | Islamiska Förbundet’s tables | 107 | 59,640 | **0** | 99.966 % | 270 | 11 Oct 2026 → 19 Nov 2027 |
|  | Diyanet’s own tables | 159 | 1,393,794 | **0** | 99.981 % |  | 1 Jan 2024 → 31 Dec 2027 |
| **Diyanet** | its tables worldwide | 8,132 | 69,999,603 | **0** | 99.986 % | 9,118 | 1 Jan 2024 → 31 Dec 2027 |
| **Morocco** | Habous | 164 | 75,768 | **0** | 99.122 % | 665 | 27 Aug 2026 → 11 Nov 2026 |
| **Algeria** | Ministry of Religious Affairs | 68 | 101,184 | **0** | 99.365 % | 642 | 1 Oct 2026 → 5 Jun 2027 |
| **Indonesia** | Kemenag | 517 | 266,772 | **0** | 99.968 % | 84 | 7 Oct 2026 → 31 Dec 2026 |

5 of 5 methods certified; 0 of 71,896,761 times off the printed minute. Last checked 18 October 2026. Generated from [`certification.json`](../certification.json) by `scripts/readme.mjs`.
<!-- certification-table:end -->

## Sweden

Certified over <!--fig:sweden.check1.span-->1 Jan 2024 → 31 Dec 2027<!--/fig--> against Diyanet's own
tables for Sweden (<!--fig:sweden.check1.places-->159<!--/fig--> places), and over
<!--fig:sweden.check0.span-->11 Oct 2026 → 19 Nov 2027<!--/fig--> against Islamiska Förbundet's published tables
(<!--fig:sweden.check0.places-->107<!--/fig--> of its towns). Set aside from Islamiska
Förbundet's: <!--fig:sweden.check0.sourceFaults-->33,395<!--/fig--> times that differ from Diyanet's own
table for the day (its next year's rows repeat this year's figures), and
<!--fig:sweden.check0.copiedRows-->646<!--/fig--> rows copied from another day. On each, the method
gives Diyanet's own table.

> **Research note, 2026-10-16** (not generated): Kiruna, printed with
> Umeå's times, is not compared; Islamiska Förbundet lists 108 towns.

## Diyanet

Certified over <!--fig:diyanet.span-->1 Jan 2024 → 31 Dec 2027<!--/fig--> for <!--fig:diyanet.check0.places-->8,132<!--/fig-->
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

## Morocco

Certified over <!--fig:morocco.span-->27 Aug 2026 → 11 Nov 2026<!--/fig--> (<!--fig:morocco.check0.places-->164<!--/fig-->
cities): the method gives <!--fig:morocco.alonePct-->99.122<!--/fig--> % alone, and a list of
<!--fig:morocco.corrections-->665<!--/fig--> corrections the rest. Certification covers only the dates
in the table: each newly published month is checked against the method, and
its corrections are added in a new list.

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

Certified over <!--fig:indonesia.span-->7 Oct 2026 → 31 Dec 2026<!--/fig--> (<!--fig:indonesia.check0.places-->517<!--/fig-->
regencies and cities): the method gives <!--fig:indonesia.alonePct-->99.968<!--/fig--> % alone, and a
list of <!--fig:indonesia.corrections-->84<!--/fig--> corrections the rest. Karawang's Asr, Maghrib
and Isha are computed at a second point, about 2 km north-east of its first
(its afternoon fits it, and it holds on days held out). The corrections are
independent differences at a minute's edge, and refitting points to them
only fits noise.

> **Research note, 2026-10-16** (not generated), on the list of 84 then:
> median 0.2 s from the minute's edge, nine in ten under 1.3 s, the largest
> 3.9 s — eight of them at Sibolga, whose mornings no point fits. Certification covers only the dates in the tables:
each newly published month is checked against the method, and its
corrections are added in a new list.
