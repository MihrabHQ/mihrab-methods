"""A place and a date in, the day's six times out: the authority's method,
then its correction list — what `timesFor` does in the TypeScript library.

A place is a dict shaped like the library's `Place` (see docs/api.md):
`authority`, `lat`, `lon`, `tz`, and where the list has them `ishaDeg`,
`clock`, `prayerPoints`, `dipDeg`, `dipMaghribDeg`, `highland`,
`twilightDip`, `afternoon`, `temkin`.
"""
import datetime
import json
import math
import os
from decimal import ROUND_HALF_UP, Decimal
from zoneinfo import ZoneInfo

from . import methods

PRAYERS = ('fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha')
#: The method revisions this port reproduces. A correction list belongs to one revision.
REVISIONS = {'sweden': 1, 'diyanet': 1, 'morocco': 2, 'algeria': 1, 'indonesia': 2, 'turkiyetakvimi': 1}

_UTC = datetime.timezone.utc


def _to_fixed(x):
    """A coordinate to three decimals, as JavaScript's toFixed(3) writes it:
    the binary value's exact decimal expansion, ties away from zero."""
    return str(Decimal(float(x) + 0.0).quantize(Decimal('0.001'), rounding=ROUND_HALF_UP))  # + 0.0: -0 is written 0.000


def point_key(lat, lon):
    return '%s,%s' % (_to_fixed(lat), _to_fixed(lon))


class CorrectionList:
    """data/corrections/<authority>.json, indexed: point -> date -> {prayer: minutes}."""

    def __init__(self, source):
        self.source = source
        self._index = {}
        for point, entries in source.get('points', {}).items():
            by_date = self._index.setdefault(point, {})
            for e in entries:
                date, key, step = e.split(' ')
                by_date.setdefault(date, {})[key] = int(step)

    @classmethod
    def load(cls, path):
        with open(path, encoding='utf-8') as f:
            return cls(json.load(f))

    def correction(self, lat, lon, date):
        return self._index.get(point_key(lat, lon), {}).get(date)


def clock_offset_at(tz, year, month0, day):
    """Minutes east of UTC that a zone keeps at noon UTC of a date."""
    at = datetime.datetime(year, month0 + 1, 1, 12, tzinfo=_UTC) + datetime.timedelta(days=day - 1)
    return round(at.astimezone(ZoneInfo(tz)).utcoffset().total_seconds() / 60)


def place_clock_at(place, year, month0, day):
    """The clock a place's table prints a date in: its own where it has one, else its zone's."""
    clock = place.get('clock')
    if clock:
        date = '%04d-%02d-%02d' % (year, month0 + 1, day)
        off = clock[0][1]
        for start, o in clock:
            if start <= date:
                off = o
        return off
    return clock_offset_at(place['tz'], year, month0, day)


def _congress(place, year, month0, day, asr_shadow):
    clock = place_clock_at(place, year, month0, day)
    isha_deg = place.get('ishaDeg', methods.CONGRESS_ISHA_DEG)
    pts_by_year = place.get('prayerPoints')
    if pts_by_year:
        years = sorted(int(y) for y in pts_by_year)
        best = years[0]
        for y in years:
            if abs(y - year) < abs(best - year):
                best = y
        pts = pts_by_year[str(best)]
        raw = {k: methods.congress_minutes(pts[i][0], pts[i][1], year, month0, day, asr_shadow, isha_deg, clock)[k]
               for i, k in enumerate(PRAYERS)}
    else:
        raw = methods.congress_minutes(place['lat'], place['lon'], year, month0, day, asr_shadow, isha_deg, clock)
    # the library carries an instant in whole milliseconds, then rounds it to the minute
    return {k: math.floor(math.trunc(v * 60000) / 60000 + 0.5) for k, v in raw.items()}


def minutes_for(place, date, corrections=None, asr_shadow=1):
    """Minutes past 00:00 UT of `date` ('YYYY-MM-DD') for the six times, or None where the method gives none."""
    year, month, day = (int(p) for p in date.split('-'))
    month0 = month - 1
    a = place['authority']
    if a in ('sweden', 'diyanet'):
        t = _congress(place, year, month0, day, asr_shadow)
    elif a == 'morocco':
        t = methods.morocco_minutes(place['lat'], place['lon'], year, month0, day, place.get('dipDeg'), asr_shadow,
                                    place.get('dipMaghribDeg'))
    elif a == 'algeria':
        t = methods.algeria_minutes(place['lat'], place['lon'], year, month0, day, asr_shadow)
    elif a == 'indonesia':
        t = methods.kemenag_minutes(place['lat'], place['lon'], year, month0, day, bool(place.get('highland')),
                                    bool(place.get('twilightDip')), asr_shadow, place.get('afternoon'))
    elif a == 'turkiyetakvimi':
        t = methods.takvim_minutes(place['lat'], place['lon'], year, month0, day, place.get('temkin'), asr_shadow)
    else:
        raise ValueError('unknown authority: %r' % (a,))
    if t is None:
        return None
    c = corrections.correction(place['lat'], place['lon'], date) if corrections else None
    if c:
        for k, step in c.items():
            if not (k == 'asr' and asr_shadow != 1):  # the lists are of the standard Asr only
                t[k] += step
    return t


def printed(minutes, offset_minutes):
    """'HH:MM' of a time on a clock, as a table prints it."""
    m = (minutes + offset_minutes) % 1440
    return '%02d:%02d' % (m // 60, m % 60)


def times_for(place, date, corrections=None, asr_shadow=1):
    """The day as a table prints it: {'clock': minutes east of UTC, 'printed': {...}, 'instants': {...}} or None.

    `corrections` is the authority's CorrectionList; without it the times are the bare method's,
    which is the published table to within the list's few minutes, not on every one.
    """
    t = minutes_for(place, date, corrections, asr_shadow)
    if t is None:
        return None
    year, month, day = (int(p) for p in date.split('-'))
    off = place_clock_at(place, year, month - 1, day)
    start = datetime.datetime(year, month, day, tzinfo=_UTC)
    return {
        'clock': off,
        'printed': {k: printed(t[k], off) for k in PRAYERS},
        'instants': {k: start + datetime.timedelta(minutes=t[k]) for k in PRAYERS},
    }


#: The lists the installed package carries (those of its release); absent in a source checkout.
BUNDLED_CORRECTIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'corrections')


def load_corrections(directory=None):
    """Every list in a directory laid out as the repository's data/corrections;
    with no directory, the lists the installed package carries."""
    if directory is None:
        directory = BUNDLED_CORRECTIONS
    out = {}
    for a in REVISIONS:
        p = os.path.join(directory, a + '.json')
        if os.path.exists(p):
            out[a] = CorrectionList.load(p)
    return out
