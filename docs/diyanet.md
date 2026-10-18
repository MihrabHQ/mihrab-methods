# Sweden's and Diyanet's methods, worldwide

## The correction lists

The method reproduces Diyanet's computation; what it cannot reproduce is the
arithmetic of Diyanet's program, which puts a few times
(<!--fig:sweden.correctionsPct-->0.018<!--/fig--> % in Sweden) on the other side of a minute's rounding point — a fraction of a second
away, independently from place to place and day to day.
`data/corrections/sweden.json` lists those times (point, date, prayer, a
minute either way: <!--fig:sweden.corrections-->270<!--/fig--> over
<!--fig:sweden.span-->1 Jan 2024 → 31 Dec 2027<!--/fig-->) and `timesFor` applies them. The list covers the
dates the timetables do, and certification holds over those dates only:
outside them `timesFor` answers with `status: 'method-only'` (or refuses,
with `strict`). Diyanet's worldwide list (`data/corrections/diyanet.json`)
is the same kind: <!--fig:diyanet.corrections-->9,118<!--/fig--> entries against
<!--fig:diyanet.timesCompact-->69.9 million<!--/fig--> times. Each year, once the next year's timetables are
out:

```sh
npm run corrections && for a in diyanet morocco algeria indonesia; do npm run corrections -- $a; done && npm run certify
```

## What Diyanet's worldwide tables add to the Swedish method

- **Isha by country:** 16° (the Congress's) in most of Europe, Russia,
  Ukraine, Belarus, Kazakhstan, Mongolia, China, the United States and
  Canada; 17° elsewhere. The high-latitude rules are worked at 16° either way.
- **The takdir at midsummer:** where the dawn forms all summer but
  midsummer's true Isha falls later than the share carried from that night,
  midsummer is the takdir's day, with the twenty-minute ramps (from about
  44.4° north).
- **Türkiye's districts:** each prayer is computed at a point of its own in
  the district, and the points move by a few thousandths of a degree from one
  year's tables to the next (`data/places/diyanetTurkeyPoints.json`, a point
  per prayer per year; Northern Cyprus the same).
- **Past local midnight:** where the first true dawn after the summer gap
  falls before local midnight on the table's clock (far east of a zone's
  meridian, as at Aihui in China), there is no transition: the gap's last
  day is printed twenty minutes after the takdir and the true times follow.
- **Tables on their own clocks:** some of Diyanet's tables are printed on a
  clock other than their place's zone — Alberta's keep summer time from 2026
  on; Mexico's had it again in 2025; Queensland's and Western Australia's
  have it in 2024, 2025 and 2027; Paraguay's keep the summer time the country
  gave up in October 2024 until the end of 2025; Xinjiang's are Beijing time;
  western Brazil's, Armenia's and some of Russia's and Mongolia's are a zone
  or two away from their own; Alchevsk's are Moscow time with summer time.
  For those the table's clock is read off the table itself (`clock` in
  `data/places/diyanetWorldPoints.json`); the instants are the method's.
- **The day's clock:** a table prints the whole day in the clock kept at
  noon, so on the morning the clocks go forward a Fajr before the change is
  printed in the new time.
