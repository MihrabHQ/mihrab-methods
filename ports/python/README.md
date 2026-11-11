# mihrab-methods in Python

The methods of [mihrab-methods](../../README.md) — Sweden, Diyanet,
Morocco, Algeria, Indonesia, Türkiye Takvimi, Kazakhstan and Egypt — in plain Python, with no dependencies
beyond the standard library (Python 3.9 or later, for `zoneinfo`).

The TypeScript library is the reference. This port follows it line for
line, is held to `test/vectors.json`, and names the method revisions it
reproduces in `mihrab_methods.REVISIONS`. A correction list belongs to one
revision: when a method's revision is raised in the library, this port is
behind until it is raised here too.

```sh
pip install mihrab-methods
```

The package carries the correction lists of its release; a version has the
same number as the npm package it was built with.

```python
from mihrab_methods import load_corrections, times_for

lists = load_corrections()          # the package's own; or a directory laid out as data/corrections
stockholm = {'authority': 'sweden', 'lat': 59.33, 'lon': 18.034, 'tz': 'Europe/Stockholm'}
day = times_for(stockholm, '2026-11-12', lists['sweden'])
print(day['printed'])     # the six times as 'HH:MM' on the clock the table prints
print(day['instants'])    # the same six times as timezone-aware datetimes
```

A place is a dict shaped like the library's `Place`: `authority`, `lat`,
`lon`, `tz`, and the fields a list gives some of its places (`ishaDeg`,
`clock`, `prayerPoints`, `dipDeg`, `dipMaghribDeg`, `highland`,
`twilightDip`, `afternoon`, `temkin`). The places themselves are in `data/places/`;
use the coordinates exactly as the list has them, since the correction
lists are looked up by them.

Without a correction list `times_for` gives the bare method: within a
minute of the full answer on the days a list has an entry for, the same on
every other day.

## Check

From the repository root:

```sh
python3 ports/python/test_vectors.py
```

The zone offsets come from the machine's time-zone database, as they do in
the library; two machines with different editions of it can differ on a
zone whose rules changed between them.

## What is where

| File | What |
| --- | --- |
| `mihrab_methods/sun.py` | The three positions of the sun the methods use |
| `mihrab_methods/methods.py` | The methods: the Congress method (Sweden, Diyanet), Morocco, Algeria, Indonesia, Türkiye Takvimi, Kazakhstan, Egypt |
| `mihrab_methods/api.py` | Place and date in, the day out: clock, correction list, printing |
| `test_vectors.py` | Holds the port to `test/vectors.json` |
