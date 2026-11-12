"""The methods: Sweden and Diyanet (the Congress method), Morocco, Algeria,
Indonesia, Türkiye Takvimi, Kazakhstan, Egypt, Brunei, Qatar, Kuwait, Jordan, Tatarstan, Russia's Central Muftiate, Albania, Bulgaria, Pakistan's Jamia Banuri Town, the United Arab Emirates, Iran's Institute of Geophysics and the United Kingdom's Wifaqul Ulama. A port of src/methods/*.ts — the TypeScript is the reference,
docs/methods.md says what each does, and test_vectors.py holds this to it.

Every function takes a civil date with the month 0-based, as the TypeScript
does, and gives minutes past 00:00 UT of that date.
"""
import datetime
import math

from .sun import RAD, _wrap360, meeus_apparent_sun, noaa_sun, precise_apparent_sun

_EPOCH = datetime.date(1970, 1, 1)
_J2000_DAYS = (datetime.date(2000, 1, 1) - _EPOCH).days


def day_key(year, month0, day):
    """Whole days since 1970-01-01 of a civil date; a day past the month's end rolls over, as Date.UTC does."""
    return (datetime.date(year, month0 + 1, 1) - _EPOCH).days + day - 1


def _d0(year, month0, day):
    """Days from J2000.0 (noon) of the date's 00:00 UT."""
    return day_key(year, month0, day) - _J2000_DAYS - 0.5


NAN = float('nan')


# ---------------------------------------------------------------- Morocco

MOROCCO_SUNRISE_MARGIN = -1.0
MOROCCO_MAGHRIB_MARGIN = 1.8


def morocco_dip_east(height_m):
    return 0.32 + 0.025 * math.sqrt(max(height_m, 0))


def morocco_dip_west(height_m):
    return 0.37 + 0.021 * math.sqrt(max(height_m, 0))


def _refraction_from_true(h):
    return (1.02 / math.tan((h + 10.3 / (h + 5.11)) * RAD)) / 60


def _refraction_from_apparent(h):
    return (1 / math.tan((h + 7.31 / (h + 4.4)) * RAD)) / 60


def morocco_raw_minutes(lat, lon, year, month0, day, dip_deg=None, asr_shadow=1, dip_maghrib_deg=None):
    if dip_deg is None:
        dip_deg = morocco_dip_east(0)
    if dip_maghrib_deg is None:
        dip_maghrib_deg = dip_deg + (morocco_dip_west(0) - morocco_dip_east(0))
    d0 = _d0(year, month0, day)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)
    T = (d0 + noon / 1440) / 36525
    Ma = (357.52911 + 35999.05029 * T) * RAD
    horizon = -(34 / 60 + 0.26667 / (1.00014 - 0.016708 * math.cos(Ma) - 0.00014 * math.cos(2 * Ma)))

    def event(alt, sign, start):
        t = start
        for _ in range(3):
            dec, eot = at(t)
            c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = 720 - 4 * lon - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    noon_dec = at(noon)[0]
    noon_true = 90 - abs(lat - noon_dec / RAD)
    noon_apparent = noon_true + _refraction_from_true(noon_true)
    asr_apparent = math.atan(1 / (asr_shadow + 1 / math.tan(noon_apparent * RAD))) / RAD
    asr_true = asr_apparent - _refraction_from_apparent(asr_apparent)
    return {
        'fajr': event(-19, -1, noon - 420) - 0.5,
        'sunrise': event(horizon - dip_deg, -1, noon - 360) + MOROCCO_SUNRISE_MARGIN,
        'dhuhr': noon + 5,
        'asr': event(asr_true, 1, noon + 200),
        'maghrib': event(horizon - dip_maghrib_deg, 1, noon + 360) + MOROCCO_MAGHRIB_MARGIN,
        'isha': event(-17, 1, noon + 420),
    }


def morocco_minutes(lat, lon, year, month0, day, dip_deg=None, asr_shadow=1, dip_maghrib_deg=None):
    """On the minute (Fajr down, the rest to the nearest); None where a time does not form."""
    r = morocco_raw_minutes(lat, lon, year, month0, day, dip_deg, asr_shadow, dip_maghrib_deg)
    if any(math.isnan(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- Algeria

def algeria_raw_minutes(lat, lon, year, month0, day, asr_shadow=1):
    d0 = _d0(year, month0, day)

    def at(t):
        return noaa_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    transit = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def event(altitude_of, sign, start):
        t = start
        for _ in range(3):
            dec = at(t)[0]
            c = (math.sin(altitude_of(dec) * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = transit + (sign * 4 * math.acos(c)) / RAD
        return t

    def asr_altitude(dec):
        # the signed noon shadow is a northern one: south of the equator, its length
        noon_shadow = math.tan((lat - dec / RAD) * RAD)
        return math.atan(1 / (asr_shadow + (noon_shadow if lat >= 0 else abs(noon_shadow)))) / RAD

    return {
        'fajr': event(lambda dec: -18, -1, noon - 420),
        'sunrise': event(lambda dec: -0.833, -1, noon - 360),
        'dhuhr': noon,
        'asr': event(asr_altitude, 1, noon + 200),
        'sunset': event(lambda dec: -0.833, 1, noon + 360),
        'isha': event(lambda dec: -17, 1, noon + 420),
    }


def algeria_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Rounded up to the minute, Maghrib three minutes after sunset; None where a time does not form."""
    r = algeria_raw_minutes(lat, lon, year, month0, day, asr_shadow)
    if any(math.isnan(v) for v in r.values()):
        return None
    up = lambda m: math.ceil(m - 1e-9)
    return {'fajr': up(r['fajr']), 'sunrise': up(r['sunrise']), 'dhuhr': up(r['dhuhr']), 'asr': up(r['asr']),
            'maghrib': up(r['sunset'] + 3), 'isha': up(r['isha'])}


# ---------------------------------------------------------------- Indonesia

_KEMENAG_MARGIN = {'fajr': 2, 'sunrise': -3, 'dhuhr': 3, 'asr': 2, 'maghrib': 2, 'isha': 2}


def kemenag_raw_minutes(lat, lon, year, month0, day, highland=False, twilight_dip=False, asr_shadow=1):
    d0 = _d0(year, month0, day)

    def at(t):  # the ministry's program takes Universal Time for the ephemeris' time: no ΔT
        return precise_apparent_sun(d0 + t / 1440, 0)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def hour_angle(alt, dec):
        c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
        return (4 * math.acos(c)) / RAD if abs(c) <= 1 else NAN

    def event(alt, sign, start):
        t = start
        for _ in range(3):
            dec, eot = at(t)
            t = 720 - 4 * lon - eot + sign * hour_angle(alt, dec)
            if not math.isfinite(t):
                return NAN
        return t

    twilight = 1 if twilight_dip else 0
    horizon = -2 if highland else -1
    shadow_dec = at(0)[0]
    asr_alt = math.atan(1 / (asr_shadow + math.tan(abs(lat * RAD - shadow_dec)))) / RAD
    asr = noon + 200
    for _ in range(4):
        dec, eot = at(asr)
        asr = 720 - 4 * lon - eot + hour_angle(asr_alt, dec)
    m = _KEMENAG_MARGIN
    return {
        'fajr': event(-20 - twilight, -1, noon - 420) + m['fajr'],
        'sunrise': event(horizon, -1, noon - 360) + m['sunrise'],
        'dhuhr': noon + m['dhuhr'],
        'asr': asr + m['asr'],
        'maghrib': event(horizon, 1, noon + 360) + m['maghrib'],
        'isha': event(-18 - twilight, 1, noon + 420) + m['isha'],
    }


def kemenag_minutes(lat, lon, year, month0, day, highland=False, twilight_dip=False, asr_shadow=1, afternoon=None):
    r = kemenag_raw_minutes(lat, lon, year, month0, day, highland, twilight_dip, asr_shadow)
    if afternoon:
        pm = kemenag_raw_minutes(afternoon[0], afternoon[1], year, month0, day, highland, twilight_dip, asr_shadow)
        for k in ('asr', 'maghrib', 'isha'):
            r[k] = pm[k]
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.ceil(v - 1e-9) for k, v in r.items()}


# ---------------------------------------------------------------- Türkiye Takvimi

_SOLSTICE_DECLINATION = 23.38
_HORIZON_MARGIN = 2
_HOLD_SEARCH_DAYS = 200


def takvim_temkin(lat, height_m=250):
    """The calendar's temkin by its formula, minutes; a listed place carries its own."""
    phi = min(abs(lat), 62) * RAD
    dec = _SOLSTICE_DECLINATION * RAD
    depth = 0.8416 + 0.03924 * math.sqrt(max(0, height_m))

    def hour_angle(alt):
        return math.acos(max(-1, min(1, (math.sin(alt * RAD) - math.sin(phi) * math.sin(dec)) / (math.cos(phi) * math.cos(dec)))))

    return ((hour_angle(-depth) - hour_angle(0)) / RAD) * 4


class _TakvimEvents:
    """The sun's events of a day at a point, minutes past the day's 00:00 UT; NaN where one does not happen."""

    def __init__(self, lat, lon, key):
        self.lat, self.lon = lat, lon
        self.d0 = key - _J2000_DAYS - 0.5
        noon = 720 - 4 * lon
        for _ in range(3):
            noon = 720 - 4 * lon - self._at(noon)[1]
        self.noon = noon
        self.noon_dec = self._at(noon)[0]
        self.sp, self.cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def _at(self, t):
        return precise_apparent_sun(self.d0 + t / 1440)

    def event(self, alt, sign, start):
        t = start
        for _ in range(3):
            dec, eot = self._at(t)
            c = (math.sin(alt * RAD) - self.sp * math.sin(dec)) / (self.cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = 720 - 4 * self.lon - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    def asr(self, shadow):
        alt = math.atan(1 / (shadow + math.tan(abs(self.lat * RAD - self.noon_dec)))) / RAD
        return self.event(alt, 1, self.noon + 200)


def _takvim_reaches19(lat, lon, key):
    d0 = key - _J2000_DAYS - 0.5

    def lowest(d):
        return abs(lat + precise_apparent_sun(d)[0] / RAD) - 90

    return min(lowest(d0 - lon / 360), lowest(d0 + 0.5)) <= -19


def takvim_held_night(lat, lon, key):
    """The day whose night times stand for this one: itself, or the last before it whose night reached 19°."""
    for i in range(_HOLD_SEARCH_DAYS + 1):
        if _takvim_reaches19(lat, lon, key - i):
            return key - i
    return key


def takvim_raw_minutes(lat, lon, year, month0, day, temkin=None, asr_shadow=1):
    """The calendar's times before rounding: the six the library gives, and 'imsak'."""
    if temkin is None:
        temkin = takvim_temkin(lat)
    key = day_key(year, month0, day)
    today = _TakvimEvents(lat, lon, key)
    night = takvim_held_night(lat, lon, key)
    night_sun = today if night == key else _TakvimEvents(lat, lon, night)
    isha_night = takvim_held_night(lat, lon, key + 1)
    isha_day = key if isha_night == key + 1 else isha_night - 1
    isha_sun = today if isha_day == key else _TakvimEvents(lat, lon, isha_day)
    return {
        'imsak': night_sun.event(-19, -1, night_sun.noon - 420) - temkin,
        'fajr': night_sun.event(-18, -1, night_sun.noon - 420),
        'sunrise': today.event(0, -1, today.noon - 360) - temkin - _HORIZON_MARGIN,
        'dhuhr': today.noon + temkin,
        'asr': today.asr(asr_shadow) + temkin,
        'maghrib': today.event(0, 1, today.noon + 360) + temkin + _HORIZON_MARGIN,
        'isha': isha_sun.event(-17, 1, isha_sun.noon + 420) + temkin,
    }


def takvim_minutes(lat, lon, year, month0, day, temkin=None, asr_shadow=1):
    """Rounded up to the minute; Fajr is the calendar's Sabâh. None where a time does not form."""
    r = takvim_raw_minutes(lat, lon, year, month0, day, temkin, asr_shadow)
    del r['imsak']
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.ceil(v - 1e-9) for k, v in r.items()}


# ---------------------------------------------------------------- Kazakhstan

def _kz_fix(a, b):
    return a - b * math.floor(a / b)


def _kz_julian(year, month, day):
    if month <= 2:
        year -= 1
        month += 12
    a = math.floor(year / 100)
    b = 2 - a + math.floor(a / 4)
    return math.floor(365.25 * (year + 4716)) + math.floor(30.6001 * (month + 1)) + day + b - 1524.5


def _kz_sun(jd):
    """The method's sun: declination (degrees), equation of time (hours)."""
    D = jd - 2451545.0
    g = _kz_fix(357.529 + 0.98560028 * D, 360)
    q = _kz_fix(280.459 + 0.98564736 * D, 360)
    L = _kz_fix(q + 1.915 * math.sin(g * RAD) + 0.02 * math.sin(2 * g * RAD), 360)
    e = 23.439 - 0.00000036 * D
    ra = math.atan2(math.cos(e * RAD) * math.sin(L * RAD), math.cos(L * RAD)) / RAD / 15
    return math.asin(math.sin(e * RAD) * math.sin(L * RAD)) / RAD, q / 15 - _kz_fix(ra, 24)


def kazakhstan_margin(lat):
    return 5 if lat >= 48 else 3


def kazakhstan_raw_minutes(lat, lon, year, month0, day):
    """Before rounding; 'sunset' is the one the method prints beside Maghrib."""
    jd = _kz_julian(year, month0 + 1, day) - lon / 360

    def midday(t):
        return _kz_fix(12 - _kz_sun(jd + t)[1], 24)

    def at(angle, t, before):
        decl = _kz_sun(jd + t)[0]
        x = (-math.sin(angle * RAD) - math.sin(decl * RAD) * math.sin(lat * RAD)) / (math.cos(decl * RAD) * math.cos(lat * RAD))
        if not abs(x) <= 1:
            return NAN
        h = math.acos(x) / RAD / 15
        return midday(t) + (-h if before else h)

    def asr_angle(t):
        return -math.atan(1 / (2 + math.tan(abs(lat - _kz_sun(jd + t)[0]) * RAD))) / RAD

    fajr = at(15, 5 / 24, True)
    sunrise = at(0.833, 6 / 24, True)
    dhuhr = midday(12 / 24)
    asr = at(asr_angle(13 / 24), 13 / 24, False)
    sunset = at(0.833, 18 / 24, False)
    isha = at(15, 18 / 24, False)
    portion = (15 / 60) * _kz_fix(sunrise - sunset, 24)
    if not math.isfinite(fajr) or _kz_fix(sunrise - fajr, 24) > portion:
        fajr = sunrise - portion
    if not math.isfinite(isha) or _kz_fix(isha - sunset, 24) > portion:
        isha = sunset + portion
    margin = kazakhstan_margin(lat)

    def ut(h):
        return (h - lon / 15) * 60

    return {'fajr': ut(fajr), 'sunrise': ut(sunrise) - margin, 'dhuhr': ut(dhuhr) + margin, 'asr': ut(asr) + margin,
            'sunset': ut(sunset), 'maghrib': ut(sunset) + margin, 'isha': ut(isha)}


def kazakhstan_minutes(lat, lon, year, month0, day):
    """Rounded to the nearest minute; Asr is the Hanafi one the table carries. None where a time does not form."""
    r = kazakhstan_raw_minutes(lat, lon, year, month0, day)
    del r['sunset']
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- Egypt

EGYPT_FAJR = 19.5
EGYPT_ISHA = 17.5
EGYPT_HORIZON = 0.845


def egypt_raw_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Before rounding: Meeus's sun at each time's own moment; Asr's noon shadow from the declination of local noon."""
    d0 = _d0(year, month0, day)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)
    asr_altitude = math.atan(1 / (asr_shadow + math.tan(abs(lat * RAD - at(noon)[0])))) / RAD

    def event(altitude, sign, start):
        t = noon + start
        for _ in range(4):
            dec, eot = at(t)
            c = (math.sin(altitude * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = 720 - 4 * lon - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    return {
        'fajr': event(-EGYPT_FAJR, -1, -420),
        'sunrise': event(-EGYPT_HORIZON, -1, -360),
        'dhuhr': noon,
        'asr': event(asr_altitude, 1, 200),
        'maghrib': event(-EGYPT_HORIZON, 1, 360),
        'isha': event(-EGYPT_ISHA, 1, 420),
    }


def egypt_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Rounded to the nearest minute. None where a time does not form."""
    r = egypt_raw_minutes(lat, lon, year, month0, day, asr_shadow)
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- Brunei

BRUNEI_LAT = 4.892
BRUNEI_LON = 114.9355
BRUNEI_DHUHR_AFTER_TRANSIT = 1.06


def brunei_district_minutes(lon):
    """The whole minutes a district adds to the capital's table: those its longitude lies west of the capital's."""
    return max(0, math.floor((BRUNEI_LON - lon) * 4 + 0.5))


def brunei_raw_minutes(lon, year, month0, day, asr_shadow=1):
    """Before rounding: the capital's table from Meeus's sun at 0h UT of the date, plus the district's minutes."""
    dec, eot = meeus_apparent_sun(_d0(year, month0, day))
    add = brunei_district_minutes(lon)
    transit = 720 - 4 * BRUNEI_LON - eot
    sp, cp = math.sin(BRUNEI_LAT * RAD), math.cos(BRUNEI_LAT * RAD)

    def event(altitude, sign):
        c = (math.sin(altitude * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
        return transit + (sign * 4 * math.acos(c)) / RAD

    asr_altitude = math.atan(1 / (asr_shadow + math.tan(abs(BRUNEI_LAT * RAD - dec)))) / RAD
    return {
        'fajr': event(-20, -1) + add,
        'sunrise': event(-0.833, -1) + add,
        'dhuhr': transit + BRUNEI_DHUHR_AFTER_TRANSIT + add,
        'asr': event(asr_altitude, 1) + add,
        'maghrib': event(-0.833, 1) + add,
        'isha': event(-18, 1) + add,
    }


def brunei_minutes(lon, year, month0, day, asr_shadow=1):
    """Rounded to the nearest minute."""
    return {k: math.floor(v + 0.5) for k, v in brunei_raw_minutes(lon, year, month0, day, asr_shadow).items()}


# ---------------------------------------------------------------- Qatar

QATAR_FAJR = 18
QATAR_HORIZON = 0.8333
QATAR_MARGIN = {'fajr': -1.12, 'sunrise': -0.1, 'dhuhr': 0.95, 'asr': 0.87, 'maghrib': 2.02}
QATAR_ISHA_AFTER_MAGHRIB = 90


def qatar_raw_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Before rounding: Meeus's sun at each time's own moment, the calendar's margins; Isha ninety minutes on the rounded Maghrib."""
    d0 = _d0(year, month0, day)
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def event(altitude, sign, asr=False):
        t = 720 - 4 * lon
        for _ in range(4):
            dec, eot = meeus_apparent_sun(d0 + t / 1440)
            transit = 720 - 4 * lon - eot
            if sign == 0:
                t = transit
                continue
            a = math.atan(1 / (asr_shadow + math.tan(abs(lat * RAD - dec)))) / RAD if asr else altitude
            c = (math.sin(a * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = transit + (sign * 4 * math.acos(c)) / RAD
        return t

    maghrib = event(-QATAR_HORIZON, 1) + QATAR_MARGIN['maghrib']
    return {
        'fajr': event(-QATAR_FAJR, -1) + QATAR_MARGIN['fajr'],
        'sunrise': event(-QATAR_HORIZON, -1) + QATAR_MARGIN['sunrise'],
        'dhuhr': event(0, 0) + QATAR_MARGIN['dhuhr'],
        'asr': event(0, 1, True) + QATAR_MARGIN['asr'],
        'maghrib': maghrib,
        'isha': math.floor(maghrib + 0.5) + QATAR_ISHA_AFTER_MAGHRIB if math.isfinite(maghrib) else NAN,
    }


def qatar_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Rounded to the nearest minute. None where a time does not form."""
    r = qatar_raw_minutes(lat, lon, year, month0, day, asr_shadow)
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- Kuwait

KUWAIT_LAT = 29.33
KUWAIT_LON = 48.005
KUWAIT_TABLE_YEAR = 1978


def kuwait_area_minutes(lon):
    """The whole minutes an area adds to the city's table (west later, east earlier)."""
    return math.floor((KUWAIT_LON - lon) * 4 + 0.5)


def kuwait_raw_minutes(lon, year, month0, day, asr_shadow=1):
    """Before rounding: Kuwait City's table — the day of 1978, whatever the year — plus the area's minutes."""
    d0 = _d0(KUWAIT_TABLE_YEAR, month0, 28 if month0 == 1 and day == 29 else day)
    add = kuwait_area_minutes(lon)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * KUWAIT_LON
    for _ in range(3):
        noon = 720 - 4 * KUWAIT_LON - at(noon)[1]
    sp, cp = math.sin(KUWAIT_LAT * RAD), math.cos(KUWAIT_LAT * RAD)
    asr_altitude = math.atan(1 / (asr_shadow + math.tan(abs(KUWAIT_LAT * RAD - at(noon)[0])))) / RAD

    def event(altitude, sign, start):
        t = noon + start
        for _ in range(4):
            dec, eot = at(t)
            c = (math.sin(altitude * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            t = 720 - 4 * KUWAIT_LON - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    return {
        'fajr': event(-18, -1, -420) + add,
        'sunrise': event(-0.8333, -1, -360) + add,
        'dhuhr': noon + add,
        'asr': event(asr_altitude, 1, 200) + 0.15 + add,
        'maghrib': event(-0.8333, 1, 360) + add,
        'isha': event(-17.5, 1, 420) + add,
    }


def kuwait_minutes(lon, year, month0, day, asr_shadow=1):
    """Rounded to the nearest minute."""
    return {k: math.floor(v + 0.5) for k, v in kuwait_raw_minutes(lon, year, month0, day, asr_shadow).items()}


# ---------------------------------------------------------------- Jordan


def jordan_raw_minutes(lat, lon, year, month0, day, dip_deg=0, asr_shadow=1, dip_maghrib_deg=None, fajr_minutes=0):
    """Before rounding: Morocco's kind of program with Jordan's figures — 18° and 18°, the zone's horizon allowances, its Fajr margin."""
    if dip_maghrib_deg is None:
        dip_maghrib_deg = dip_deg
    d0 = _d0(year, month0, day)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)
    T = (d0 + noon / 1440) / 36525
    Ma = (357.52911 + 35999.05029 * T) * RAD
    horizon = -(34 / 60 + 0.26667 / (1.00014 - 0.016708 * math.cos(Ma) - 0.00014 * math.cos(2 * Ma)))

    def event(alt, sign, start):
        t = start
        for _ in range(3):
            dec, eot = at(t)
            c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = 720 - 4 * lon - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    noon_true = 90 - abs(lat - at(noon)[0] / RAD)
    noon_apparent = noon_true + _refraction_from_true(noon_true)
    asr_apparent = math.atan(1 / (asr_shadow + 1 / math.tan(noon_apparent * RAD))) / RAD
    asr_true = asr_apparent - _refraction_from_apparent(asr_apparent)
    return {
        'fajr': event(-18, -1, noon - 420) + fajr_minutes,
        'sunrise': event(horizon - dip_deg, -1, noon - 360),
        'dhuhr': noon,
        'asr': event(asr_true, 1, noon + 200),
        'maghrib': event(horizon - dip_maghrib_deg, 1, noon + 360),
        'isha': event(-18, 1, noon + 420),
    }


def jordan_minutes(lat, lon, year, month0, day, dip_deg=0, asr_shadow=1, dip_maghrib_deg=None, fajr_minutes=0):
    """Rounded to the nearest minute. None where a time does not form."""
    r = jordan_raw_minutes(lat, lon, year, month0, day, dip_deg, asr_shadow, dip_maghrib_deg, fajr_minutes)
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- Tatarstan


def tatarstan_minutes(lat, lon, year, month0, day, dip_deg=0):
    """As printed, whole minutes: the dawn at 18° rounded down, the rest rounded up, Asr at two shadows on the apparent sun, Isha at 15°; where the 18° twilight does not form, the dawn 121 minutes before sunrise and Isha 90 after Maghrib. None where a time does not form."""
    d0 = _d0(year, month0, day)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def event(alt, sign):
        t = noon + sign * 300
        forms = True
        for _ in range(6):
            dec, eot = at(t)
            c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            forms = abs(c) <= 1
            t = 720 - 4 * lon - eot + (sign * 4 * math.acos(max(-1.0, min(1.0, c)))) / RAD
        return t if forms else NAN

    noon_true = 90 - abs(lat - at(noon)[0] / RAD)
    noon_apparent = noon_true + _refraction_from_true(noon_true)
    asr_apparent = math.atan(1 / (2 + 1 / math.tan(noon_apparent * RAD))) / RAD
    asr = event(asr_apparent - _refraction_from_apparent(asr_apparent), 1)
    rise, sset = event(-(0.8333 + dip_deg), -1), event(-(0.8333 + dip_deg), 1)
    if not (math.isfinite(rise) and math.isfinite(sset) and math.isfinite(asr)):
        return None
    sunrise, maghrib = math.ceil(rise), math.ceil(sset)
    dawn, dusk = event(-18, -1), event(-18, 1)
    return {
        'fajr': math.floor(dawn) if math.isfinite(dawn) else sunrise - 121,
        'sunrise': sunrise,
        'dhuhr': math.ceil(noon),
        'asr': math.ceil(asr),
        'maghrib': maghrib,
        'isha': math.ceil(event(-15, 1)) if math.isfinite(dusk) else maghrib + 90,
    }


# ---------------------------------------------------------------- Russia: the Central Muftiate


def _cdum_printed(lat, lon, year, month0, day):
    """The six with margin and rounding, whole minutes; NAN where the sun does not reach a time's altitude."""
    jd = _kz_julian(year, month0 + 1, day) - lon / 360

    def midday(t):
        return _kz_fix(12 - _kz_sun(jd + t)[1], 24)

    def at(angle, t, before):
        decl = _kz_sun(jd + t)[0]
        x = (-math.sin(angle * RAD) - math.sin(decl * RAD) * math.sin(lat * RAD)) / (math.cos(decl * RAD) * math.cos(lat * RAD))
        if not abs(x) <= 1:
            return NAN
        h = math.acos(x) / RAD / 15
        return midday(t) + (-h if before else h)

    asr_angle = -math.atan(1 / (2 + math.tan(abs(lat - _kz_sun(jd + 13 / 24)[0]) * RAD))) / RAD

    def minute(h, margin):
        return math.floor((h - lon / 15) * 60 + margin + 0.5) if math.isfinite(h) else NAN

    return [minute(at(18, 5 / 24, True), -2), minute(at(0.833, 6 / 24, True), -2), minute(midday(12 / 24), 2),
            minute(at(asr_angle, 13 / 24, False), 2), minute(at(0.833, 18 / 24, False), 2), minute(at(17, 18 / 24, False), 2)]


def cdum_minutes(lat, lon, year, month0, day):
    """As printed, whole minutes: Kazakhstan's sun and arithmetic, Fajr at 18° and Isha at 17°, Asr at two shadows, 2 minutes' margin on every time and the nearest minute; where the twilight does not form, the 45th parallel's share of the night, on the printed minutes, cut to the minute. None where the sun does not rise or set."""
    p = _cdum_printed(lat, lon, year, month0, day)
    if not all(math.isfinite(v) for v in p[1:5]):
        return None
    fajr, isha = p[0], p[5]
    if not (math.isfinite(fajr) and math.isfinite(isha)):
        r = _cdum_printed(45, lon, year, month0, day)
        night, there = 1440 - (p[4] - p[1]), 1440 - (r[4] - r[1])
        if not math.isfinite(fajr):
            fajr = p[1] - math.ceil((r[1] - r[0]) * night / there)
        if not math.isfinite(isha):
            isha = p[4] + math.floor((r[5] - r[4]) * night / there)
    return {'fajr': fajr, 'sunrise': p[1], 'dhuhr': p[2], 'asr': p[3], 'maghrib': p[4], 'isha': isha}


# ---------------------------------------------------------------- Albania and Bulgaria: a reference town's table

# lat, lon of the town the table is computed at; when the day's sun is taken (days after 0h UT of the date);
# the margins on Fajr, sunrise, Dhuhr, Asr, Maghrib, Isha
ALBANIA_TABLE = (41.3333, 19.8167, 0.0, (0, -7, 5, 4, 7, 0))
BULGARIA_TABLE = (42.708, 23.3219, -13 / 24, (-1, -7, 5, 4, 7, 0))


def town_minutes(table, lon):
    """The whole minutes a town adds to the reference town's table (west later, east earlier)."""
    return math.floor((table[1] - lon) * 4 + 0.5)


def town_table_raw_minutes(table, lon, year, month0, day, asr_shadow=1):
    """Before rounding: the reference town's table — the sun taken once for the whole day — plus the town's minutes."""
    lat, lon0, sun_at, margins = table
    dec, eot = meeus_apparent_sun(_d0(year, month0, day) + sun_at)
    add = town_minutes(table, lon)
    noon = 720 - 4 * lon0 - eot
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def event(altitude, sign):
        c = (math.sin(altitude * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
        return noon + (sign * 4 * math.acos(c)) / RAD

    asr_altitude = math.atan(1 / (asr_shadow + math.tan(abs(lat * RAD - dec)))) / RAD
    return {
        'fajr': event(-18, -1) + margins[0] + add,
        'sunrise': event(-0.8333, -1) + margins[1] + add,
        'dhuhr': noon + margins[2] + add,
        'asr': event(asr_altitude, 1) + margins[3] + add,
        'maghrib': event(-0.8333, 1) + margins[4] + add,
        'isha': event(-17, 1) + margins[5] + add,
    }


def albania_minutes(lon, year, month0, day, asr_shadow=1):
    """Tirana's table, the sun taken at 0h UT of the date; rounded to the nearest minute."""
    return {k: math.floor(v + 0.5) for k, v in town_table_raw_minutes(ALBANIA_TABLE, lon, year, month0, day, asr_shadow).items()}


def bulgaria_minutes(lon, year, month0, day, asr_shadow=1):
    """Sofia's table, the sun taken at 11h UT of the day before; rounded to the nearest minute."""
    return {k: math.floor(v + 0.5) for k, v in town_table_raw_minutes(BULGARIA_TABLE, lon, year, month0, day, asr_shadow).items()}


# ---------------------------------------------------------------- Pakistan: Jamia Banuri Town


def banuri_minutes(lat, lon, year, month0, day, asr_shadow=2):
    """As printed, whole minutes: Kazakhstan's sun and arithmetic, Fajr and Isha at 18°, the zenith as Dhuhr, Asr at two shadows (one where asked), no margins, the nearest minute. None where a time does not form."""
    jd = _kz_julian(year, month0 + 1, day) - lon / 360

    def midday(t):
        return _kz_fix(12 - _kz_sun(jd + t)[1], 24)

    def at(angle, t, before):
        decl = _kz_sun(jd + t)[0]
        x = (-math.sin(angle * RAD) - math.sin(decl * RAD) * math.sin(lat * RAD)) / (math.cos(decl * RAD) * math.cos(lat * RAD))
        if not abs(x) <= 1:
            return NAN
        h = math.acos(x) / RAD / 15
        return midday(t) + (-h if before else h)

    asr_angle = -math.atan(1 / (asr_shadow + math.tan(abs(lat - _kz_sun(jd + 13 / 24)[0]) * RAD))) / RAD
    hours = [at(18, 5 / 24, True), at(0.833, 6 / 24, True), midday(12 / 24), at(asr_angle, 13 / 24, False), at(0.833, 18 / 24, False), at(18, 18 / 24, False)]
    if not all(math.isfinite(h) for h in hours):
        return None
    p = [math.floor((h - lon / 15) * 60 + 0.5) for h in hours]
    return {'fajr': p[0], 'sunrise': p[1], 'dhuhr': p[2], 'asr': p[3], 'maghrib': p[4], 'isha': p[5]}


# ---------------------------------------------------------------- United Arab Emirates


def uae_raw_minutes(lat, lon, year, month0, day, dip_deg=0, asr_shadow=1, dip_maghrib_deg=None, morning_minutes=0):
    """Before rounding: Jordan's kind of program with the Emirates' figures — 18° and 18°, the zone's horizon allowances, its morning margin on Fajr and sunrise, Dhuhr two minutes after the transit, the noon shadow taken at Dhuhr."""
    if dip_maghrib_deg is None:
        dip_maghrib_deg = dip_deg
    d0 = _d0(year, month0, day)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)
    T = (d0 + noon / 1440) / 36525
    Ma = (357.52911 + 35999.05029 * T) * RAD
    horizon = -(34 / 60 + 0.26667 / (1.00014 - 0.016708 * math.cos(Ma) - 0.00014 * math.cos(2 * Ma)))

    def event(alt, sign, start):
        t = start
        for _ in range(3):
            dec, eot = at(t)
            c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = 720 - 4 * lon - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    dhuhr = noon + 2
    dec_d, eot_d = at(dhuhr)
    noon_true = math.asin(sp * math.sin(dec_d) + cp * math.cos(dec_d) * math.cos(((dhuhr - (720 - 4 * lon - eot_d)) / 4) * RAD)) / RAD
    noon_apparent = noon_true + _refraction_from_true(noon_true)
    asr_apparent = math.atan(1 / (asr_shadow + 1 / math.tan(noon_apparent * RAD))) / RAD
    asr_true = asr_apparent - _refraction_from_apparent(asr_apparent)
    return {
        'fajr': event(-18, -1, noon - 420) + morning_minutes,
        'sunrise': event(horizon - dip_deg, -1, noon - 360) + morning_minutes,
        'dhuhr': dhuhr,
        'asr': event(asr_true, 1, noon + 200),
        'maghrib': event(horizon - dip_maghrib_deg, 1, noon + 360),
        'isha': event(-18, 1, noon + 420),
    }


def uae_minutes(lat, lon, year, month0, day, dip_deg=0, asr_shadow=1, dip_maghrib_deg=None, morning_minutes=0):
    """Rounded to the nearest minute. None where a time does not form."""
    r = uae_raw_minutes(lat, lon, year, month0, day, dip_deg, asr_shadow, dip_maghrib_deg, morning_minutes)
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- Iran: the Institute of Geophysics, Tehran


def tehran_raw_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Before rounding: the Institute of Geophysics' plain program — Meeus's apparent sun iterated, Fajr 17.7°, sunrise −0.8333°, Dhuhr the transit, Asr at the noon shadow plus the lengths asked, Maghrib 4.5°, Isha 14°; no margins."""
    d0 = _d0(year, month0, day)

    def at(t):
        return meeus_apparent_sun(d0 + t / 1440)

    noon = 720 - 4 * lon
    for _ in range(3):
        noon = 720 - 4 * lon - at(noon)[1]
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def event(alt, sign, start):
        t = start
        for _ in range(3):
            dec, eot = at(t)
            c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
            if not abs(c) <= 1:
                return NAN
            t = 720 - 4 * lon - eot + (sign * 4 * math.acos(c)) / RAD
        return t

    asr_altitude = math.atan(1 / (asr_shadow + math.tan(abs(lat * RAD - at(noon)[0])))) / RAD
    return {
        'fajr': event(-17.7, -1, noon - 420),
        'sunrise': event(-0.8333, -1, noon - 360),
        'dhuhr': noon,
        'asr': event(asr_altitude, 1, noon + 200),
        'maghrib': event(-4.5, 1, noon + 380),
        'isha': event(-14, 1, noon + 420),
    }


def tehran_minutes(lat, lon, year, month0, day, asr_shadow=1):
    """Rounded to the nearest minute. None where a time does not form."""
    r = tehran_raw_minutes(lat, lon, year, month0, day, asr_shadow)
    if not all(math.isfinite(v) for v in r.values()):
        return None
    return {k: math.floor(v + 0.5) for k, v in r.items()}


# ---------------------------------------------------------------- United Kingdom: Wifaqul Ulama


def wifaq_minutes(lat, lon, year, month0, day, asr_shadow=2):
    """Wifaqul Ulama's timetables: Fajr 18° (on the sun of 0h UT where the event's own does not reach it, else the middle of that date's sunset and the day before's sunrise), sunrise −0.8333°, Zuhr transit + 4, Asr on the noon shadow of the sun 90 minutes before 0h UT, Maghrib sunset + 5, Isha the earlier of 15° and a seventh of the night; nearest minute, the Shafi'i Asr rounded down. None where a time does not form."""
    sp, cp = math.sin(lat * RAD), math.cos(lat * RAD)

    def program(d0):
        def at(t):
            return meeus_apparent_sun(d0 + t / 1440)

        noon = 720 - 4 * lon - at(720)[1]
        for _ in range(2):
            noon = 720 - 4 * lon - at(noon)[1]

        def event(alt, sign, start, fixed=None):
            t = start
            for _ in range(3):
                dec, eot = at(t if fixed is None else fixed)
                c = (math.sin(alt * RAD) - sp * math.sin(dec)) / (cp * math.cos(dec))
                if not abs(c) <= 1:
                    return NAN
                t = 720 - 4 * lon - eot + (sign * 4 * math.acos(c)) / RAD
            return t

        return noon, event, at

    d0 = _d0(year, month0, day)
    noon, event, at = program(d0)
    sunrise = event(-0.8333, -1, noon - 360)
    sunset = event(-0.8333, 1, noon + 360)
    fajr = event(-18, -1, 0)  # the first pass reads the sun at 0h UT
    if not math.isfinite(fajr):
        fajr = event(-18, -1, noon - 420, 0)
    if not math.isfinite(fajr):
        noon_b, event_b, _ = program(d0 - 1)
        fajr = (sunset + event_b(-0.8333, -1, noon_b - 360)) / 2 - 720
    asr_altitude = math.atan(1 / (asr_shadow + math.tan(abs(lat * RAD - at(-90)[0])))) / RAD
    asr = event(asr_altitude, 1, noon + 200)
    noon_n, event_n, _ = program(d0 + 1)
    seventh = sunset + (event_n(-0.8333, -1, noon_n - 360) + 1440 - sunset) / 7
    isha15 = event(-15, 1, noon + 420)
    raw = [fajr, sunrise, noon + 4, asr, sunset + 5, seventh]
    if not all(math.isfinite(v) for v in raw):
        return None
    near = lambda v: math.floor(v + 0.5)
    isha = min(near(isha15), near(seventh)) if math.isfinite(isha15) else near(seventh)
    return {'fajr': near(fajr), 'sunrise': near(sunrise), 'dhuhr': near(noon + 4), 'asr': math.floor(asr) if asr_shadow == 1 else near(asr),
            'maghrib': near(sunset + 5), 'isha': isha}


# ---------------------------------------------------------------- Sweden and Diyanet: the Congress method

RISE_SET = -0.833
FAJR_ANGLE = -18
CONGRESS_ISHA_DEG = 16
DIYANET_ISHA_DEG = 17
TEMKIN = {'sunrise': -7, 'dhuhr': 5, 'asr': 4, 'maghrib': 7}
FLOOR = 300
BAND = 20
ANCHOR_SLACK = 1
SEARCH_DAYS = 200
SUN_INSTANT_S = -45
EOT_ADD_MIN = 0.00176
DAY_MS = 86_400_000


def _year_of(k):
    return (_EPOCH + datetime.timedelta(days=k)).year


def _midsummer_of(k):
    return day_key(_year_of(k), 5, 21)


def _eot_residual_s(L):
    return (0.033377 * math.sin(L) + 0.007721 * math.cos(L) - 0.000229 * math.sin(2 * L) + 0.004198 * math.cos(2 * L)
            - 0.02346 * math.sin(3 * L) - 0.026434 * math.cos(3 * L))


def _dec_residual_deg(L):
    return -1.1539e-5 - 3.6174e-5 * math.sin(L) - 2.1101e-5 * math.cos(L) + 2.0235e-5 * math.sin(2 * L) - 2.2534e-5 * math.cos(2 * L)


def _congress_sun(utc_ms):
    T = (utc_ms / DAY_MS - 10957.5) / 36525
    L0 = _wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T))
    M = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * RAD
    C = ((1.914602 - T * (0.004817 + 0.000014 * T)) * math.sin(M)
         + (0.019993 - 0.000101 * T) * math.sin(2 * M)
         + 0.000289 * math.sin(3 * M))
    om = (125.04 - 1934.136 * T) * RAD
    Ls = (280.4665 + 36000.7698 * T) * RAD
    Lm = (218.3165 + 481267.8813 * T) * RAD
    eps = (23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
           + (9.2 * math.cos(om) + 0.57 * math.cos(2 * Ls) + 0.1 * math.cos(2 * Lm) - 0.09 * math.cos(2 * om)) / 3600)
    lam = (L0 + C) * RAD
    ra = _wrap360(math.atan2(math.cos(eps * RAD) * math.sin(lam), math.cos(lam)) / RAD)
    dec = math.asin(math.sin(eps * RAD) * math.sin(lam)) + _dec_residual_deg(L0 * RAD) * RAD
    eot = (_wrap360(L0 - ra + 180) - 180) * 4 + EOT_ADD_MIN - _eot_residual_s(L0 * RAD) / 60
    return dec, eot


class _Solar:
    def __init__(self, day, lat, lon):
        self.lat = lat
        self.dec, eot = _congress_sun(day * DAY_MS + SUN_INSTANT_S * 1000)
        self.transit = 720 - 4 * lon - eot

    def _hour_angle(self, alt):
        c = (math.sin(alt * RAD) - math.sin(self.lat * RAD) * math.sin(self.dec)) / (math.cos(self.lat * RAD) * math.cos(self.dec))
        if c < -1 or c > 1:
            return None
        return (math.acos(c) / RAD) * 4

    def rising(self, alt):
        h = self._hour_angle(alt)
        return None if h is None else self.transit - h

    def setting(self, alt):
        h = self._hour_angle(alt)
        return None if h is None else self.transit + h

    def asr(self, shadow):
        noon_alt = 90 - abs(self.lat - self.dec / RAD)
        if noon_alt <= 0:
            return None
        alt = math.atan(1 / (shadow + math.tan((90 - noon_alt) * RAD))) / RAD
        return self.setting(alt)


class CongressYear:
    """The method for one place and one year; what it needs of the year is worked out once."""

    def __init__(self, lat, lon, year, isha_deg=CONGRESS_ISHA_DEG, clock_offset=None):
        self.lat, self.lon, self.year, self.clock_offset = lat, lon, year, clock_offset
        self.isha_angle = -isha_deg
        self._solars, self._rise_sets, self._ramps, self._extremes, self._carried = {}, {}, {}, {}, {}
        self._ratio = 'unset'
        self._gap = 'unset'
        self._floors = None

    def solar(self, day):
        s = self._solars.get(day)
        if s is None:
            s = self._solars[day] = _Solar(day, self.lat, self.lon)
        return s

    def rise_set(self, day):
        """Printed sunrise and Maghrib with the five-hour floors: (sr, ss, held)."""
        cached = self._rise_sets.get(day)
        if cached:
            return cached
        s = self.solar(day)
        dhuhr = s.transit + TEMKIN['dhuhr']
        half = FLOOR / 2
        raw_sr, raw_ss = s.rising(RISE_SET), s.setting(RISE_SET)
        if self.midsummer_floors(day):
            hi, lo = self._dhuhr_extremes(day)
            nsr, nss = hi - 720 + half, lo + 720 - half
        else:
            nsr, nss = dhuhr - 720 + half, dhuhr + 720 - half
        if raw_sr is None or raw_ss is None:
            noon_up = 90 - abs(self.lat - s.dec / RAD) > RISE_SET
            sr, ss = (nsr, nss) if noon_up else (dhuhr - half, dhuhr + half)
        else:
            sr, ss = raw_sr + TEMKIN['sunrise'], raw_ss + TEMKIN['maghrib']
        sr = max(min(sr, dhuhr - half), nsr)
        ss = min(max(ss, dhuhr + half), nss)
        held = None
        if self.midsummer_floors(day):
            mid = _midsummer_of(day)
            if day == mid:
                held = True
            elif day > mid:
                prev = self.rise_set(day - 1)
                if prev[2] and ss > prev[1]:
                    ss = prev[1]
                    held = True
        rs = (sr, ss, held)
        self._rise_sets[day] = rs
        return rs

    def _dhuhr_of(self, day):
        return self.solar(day).transit + TEMKIN['dhuhr']

    def _maghrib_floored(self, day):
        s = self.solar(day)
        st = s.setting(RISE_SET)
        return st is None or st + TEMKIN['maghrib'] > s.transit + TEMKIN['dhuhr'] + 720 - FLOOR / 2

    def _dhuhr_extremes(self, day):
        cached = self._extremes.get(day)
        if cached:
            return cached
        mid = _midsummer_of(day)
        if day <= mid:
            max_run = self._dhuhr_of(day)
            if self._maghrib_floored(day):
                d = day - 1
                while d > day - 120 and self._maghrib_floored(d):
                    max_run = max(max_run, self._dhuhr_of(d))
                    d -= 1
            out = (max(self._dhuhr_of(day), self._dhuhr_of(mid)), min(max_run, self._dhuhr_of(mid)))
        else:
            hi, lo = -math.inf, math.inf
            for d in range(mid, day + 1):
                v = self._dhuhr_of(d)
                hi, lo = max(hi, v), min(lo, v)
            out = (hi, lo)
        self._extremes[day] = out
        return out

    def midsummer_floors(self, day):
        if self._floors is None:
            s = self.solar(_midsummer_of(day))
            sr, ss = s.rising(RISE_SET), s.setting(RISE_SET)
            dhuhr = s.transit + TEMKIN['dhuhr']
            half = FLOOR / 2
            if sr is None or ss is None:
                self._floors = True
            else:
                psr = max(sr + TEMKIN['sunrise'], dhuhr - 720 + half)
                pss = min(ss + TEMKIN['maghrib'], dhuhr + 720 - half)
                self._floors = 1440 - (pss - psr) <= FLOOR + ANCHOR_SLACK
        return self._floors

    def night(self, day):
        sr, ss, _ = self.rise_set(day)
        return 1440 - (ss - sr)

    def fajr18(self, day):
        return self.solar(day).rising(FAJR_ANGLE)

    def isha16(self, day):
        return self.solar(day).setting(self.isha_angle)

    def true_time(self, key, day):
        return self.fajr18(day) if key == 'fajr' else self.isha16(day)

    def gap_days(self):
        if self._gap != 'unset':
            return self._gap
        mid = day_key(self.year, 5, 21)
        if self.fajr18(mid) is not None:
            isha = self.solar(mid).setting(-CONGRESS_ISHA_DEG)
            self._gap = (mid, mid) if (self.lat > 0 and isha is not None and self._carried_raw(mid)[1] < isha) else None
            return self._gap
        a = mid
        while self.fajr18(a - 1) is None and mid - a < SEARCH_DAYS:
            a -= 1
        b = mid
        while self.fajr18(b + 1) is None and b - mid < SEARCH_DAYS:
            b += 1
        self._gap = (a, b)
        return self._gap

    def ratio(self):
        if self._ratio != 'unset':
            return self._ratio
        d = day_key(self.year, 5, 21)
        f = self.fajr18(d)
        steps = 0
        while f is None and steps < SEARCH_DAYS:
            d -= 1
            f = self.fajr18(d)
            steps += 1
        if f is None:
            self._ratio = None
            return None
        ss = self.rise_set(d)[1]
        S = f + 1440 - ss
        self._ratio = S / 3 / self.night(d)
        return self._ratio

    def _carried_raw(self, day):
        r = self.ratio() or 0
        sr, ss, _ = self.rise_set(day)
        n = self.night(day)
        return (sr - r * (FAJR_ANGLE / -CONGRESS_ISHA_DEG) * n, ss + r * n)

    def carried(self, day):
        cached = self._carried.get(day)
        if cached:
            return cached
        mid = _midsummer_of(day)
        if not self.midsummer_floors(day) or day == mid:
            out = self._carried_raw(day)
        elif day < mid:
            f, i = self._carried_raw(day)
            mf, mi = self.carried(mid)
            out = (max(f, mf), min(i, mi))
        else:
            prev = self.carried(mid)
            for d in range(mid + 1, day):
                c = self._carried.get(d)
                if not c:
                    f, i = self._carried_raw(d)
                    c = (max(f, prev[0]), min(i, prev[1]))
                    self._carried[d] = c
                prev = c
            f, i = self._carried_raw(day)
            out = (max(f, prev[0]), min(i, prev[1]))
        self._carried[day] = out
        return out

    def ramp(self, day, side, key):
        gap = self.gap_days()
        if not gap:
            return self.true_time(key, day)
        d1, d2 = gap
        idx = 0 if key == 'fajr' else 1
        cache_key = side + key
        ramp = self._ramps.get(cache_key)
        if ramp is None:
            edge = d1 if side == 'in' else d2
            T = self.carried(edge)[idx]
            step = -1 if side == 'in' else 1
            far = None
            first = self.true_time(key, edge + step)
            local_day = lambda m: math.floor((m + (self.clock_offset or 0)) / 1440)
            wrapped = (side == 'out' and key == 'fajr' and self.clock_offset is not None and first is not None
                       and local_day(first) != local_day(T))
            d = edge + step
            while not wrapped and abs(d - edge) < SEARCH_DAYS:
                t = self.true_time(key, d)
                if t is not None and abs(t - T) <= BAND:
                    far = d
                elif far is not None:
                    break
                d += step
            ramp = {'edge': edge, 'T': T, 'far': far, 'bump': wrapped}
            self._ramps[cache_key] = ramp
        edge, T, far = ramp['edge'], ramp['T'], ramp['far']
        if far is None:
            return self.true_time(key, day)
        inside = (far <= day < edge) if side == 'in' else (edge < day <= far)
        if not inside:
            return self.true_time(key, day)
        sign = 1 if key == 'fajr' else -1
        return T + (sign * BAND * abs(day - edge)) / abs(far - edge)

    def times(self, day, asr_shadow=1):
        s = self.solar(day)
        sr, ss, _ = self.rise_set(day)
        dhuhr = s.transit + TEMKIN['dhuhr']
        raw_asr = s.asr(asr_shadow)
        asr = dhuhr if raw_asr is None else raw_asr + TEMKIN['asr']
        asr = max(dhuhr, min(asr, ss))
        fajr, isha = self.fajr18(day), self.isha16(day)
        gap = self.gap_days()
        if gap:
            d1, d2 = gap
            if d1 <= day <= d2:
                fajr, isha = self.carried(day)
                if day == d1 or day == d2:
                    side = 'in' if day == d1 else 'out'
                    self.ramp(day, side, 'fajr')
                    self.ramp(day, side, 'isha')
                    if self._ramps[side + 'fajr']['bump'] and fajr is not None:
                        fajr += BAND
                    if self._ramps[side + 'isha']['bump'] and isha is not None:
                        isha -= BAND
            elif day < d1:
                fajr, isha = self.ramp(day, 'in', 'fajr'), self.ramp(day, 'in', 'isha')
            else:
                fajr, isha = self.ramp(day, 'out', 'fajr'), self.ramp(day, 'out', 'isha')
        return {'fajr': fajr if fajr is not None else sr - 60, 'sunrise': sr, 'dhuhr': dhuhr, 'asr': asr, 'maghrib': ss,
                'isha': isha if isha is not None else ss + 60}


_years = {}


def congress_minutes(lat, lon, year, month0, day, asr_shadow=1, isha_deg=CONGRESS_ISHA_DEG, clock_offset=None):
    """The Congress method's times, minutes past 00:00 UT of the date, unrounded."""
    key = ('%.5f' % lat, '%.5f' % lon, year, isha_deg, clock_offset)
    cy = _years.get(key)
    if cy is None:
        if len(_years) >= 12:
            _years.pop(next(iter(_years)))
        cy = _years[key] = CongressYear(lat, lon, year, isha_deg, clock_offset)
    return cy.times(day_key(year, month0, day), asr_shadow)
