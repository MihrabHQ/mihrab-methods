// The methods: Sweden and Diyanet (the Congress method), Morocco, Algeria,
// Indonesia, Türkiye Takvimi, Kazakhstan, Egypt, Brunei, Qatar, Kuwait, Jordan, Tatarstan, Russia's Central Muftiate, Albania, Bulgaria and Pakistan's Jamia Banuri Town. A port of src/methods/*.ts — the TypeScript is the reference,
// docs/methods.md says what each does, and the vector check holds this to it.
//
// Every function takes a civil date with the month 0-based, as the TypeScript
// does, and gives minutes past 00:00 UT of that date.
import 'dart:math';

import 'sun.dart';

/// Whole days since 1970-01-01 of a civil date; a day past the month's end rolls over, as Date.UTC does.
int dayKey(int year, int month0, int day) => DateTime.utc(year, month0 + 1, day).millisecondsSinceEpoch ~/ 86400000;

int _yearOf(int key) => DateTime.fromMillisecondsSinceEpoch(key * 86400000, isUtc: true).year;

const int _j2000Days = 10957;

/// Days from J2000.0 (noon) of the date's 00:00 UT.
double _d0Of(int year, int month0, int day) => (dayKey(year, month0, day) - _j2000Days).toDouble() - 0.5;

class DayMinutes {
  double fajr, sunrise, dhuhr, asr, maghrib, isha;
  DayMinutes(this.fajr, this.sunrise, this.dhuhr, this.asr, this.maghrib, this.isha);

  bool get allFinite => [fajr, sunrise, dhuhr, asr, maghrib, isha].every((v) => v.isFinite);
  DayMinutes mapped(double Function(double) f) => DayMinutes(f(fajr), f(sunrise), f(dhuhr), f(asr), f(maghrib), f(isha));
}

// ---------------------------------------------------------------- Morocco

const double moroccoSunriseMargin = -1.0;
const double moroccoMaghribMargin = 1.8;

double moroccoDipEast(double heightM) => 0.32 + 0.025 * sqrt(max(heightM, 0.0));
double moroccoDipWest(double heightM) => 0.37 + 0.021 * sqrt(max(heightM, 0.0));

double _refractionFromTrue(double h) => (1.02 / tan((h + 10.3 / (h + 5.11)) * rad)) / 60;
double _refractionFromApparent(double h) => (1 / tan((h + 7.31 / (h + 4.4)) * rad)) / 60;

DayMinutes moroccoRawMinutes(double lat, double lon, int year, int month0, int day,
    {double? dipDeg, double asrShadow = 1.0, double? dipMaghribDeg}) {
  final dip = dipDeg ?? moroccoDipEast(0.0);
  final dipMaghrib = dipMaghribDeg ?? (dip + (moroccoDipWest(0.0) - moroccoDipEast(0.0)));
  final d0 = _d0Of(year, month0, day);
  SunPosition at(double t) => meeusApparentSun(d0 + t / 1440);
  var noon = 720 - 4 * lon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * lon - at(noon).eot;
  }
  final sp = sin(lat * rad), cp = cos(lat * rad);
  final T = (d0 + noon / 1440) / 36525;
  final ma = (357.52911 + 35999.05029 * T) * rad;
  final horizon = -(34 / 60 + 0.26667 / (1.00014 - 0.016708 * cos(ma) - 0.00014 * cos(2 * ma)));
  double event(double alt, double sign, double start) {
    var t = start;
    for (var i = 0; i < 3; i++) {
      final s = at(t);
      final c = (sin(alt * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
      if (!(c.abs() <= 1)) return double.nan;
      t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  final noonDec = at(noon).dec;
  final noonTrue = 90 - (lat - noonDec / rad).abs();
  final noonApparent = noonTrue + _refractionFromTrue(noonTrue);
  final asrApparent = atan(1 / (asrShadow + 1 / tan(noonApparent * rad))) / rad;
  final asrTrue = asrApparent - _refractionFromApparent(asrApparent);
  return DayMinutes(
    event(-19.0, -1.0, noon - 420) - 0.5,
    event(horizon - dip, -1.0, noon - 360) + moroccoSunriseMargin,
    noon + 5,
    event(asrTrue, 1.0, noon + 200),
    event(horizon - dipMaghrib, 1.0, noon + 360) + moroccoMaghribMargin,
    event(-17.0, 1.0, noon + 420),
  );
}

/// On the minute; null where a time does not form.
DayMinutes? moroccoMinutes(double lat, double lon, int year, int month0, int day,
    {double? dipDeg, double asrShadow = 1.0, double? dipMaghribDeg}) {
  final r = moroccoRawMinutes(lat, lon, year, month0, day, dipDeg: dipDeg, asrShadow: asrShadow, dipMaghribDeg: dipMaghribDeg);
  return r.allFinite ? r.mapped((v) => (v + 0.5).floorToDouble()) : null;
}

// ---------------------------------------------------------------- Algeria

/// The six events before rounding; `maghrib` here is the sunset.
DayMinutes algeriaRawMinutes(double lat, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final d0 = _d0Of(year, month0, day);
  SunPosition at(double t) => noaaSun(d0 + t / 1440);
  var noon = 720 - 4 * lon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * lon - at(noon).eot;
  }
  final transit = 720 - 4 * lon - at(noon).eot;
  final sp = sin(lat * rad), cp = cos(lat * rad);
  double event(double Function(double) altitudeOf, double sign, double start) {
    var t = start;
    for (var i = 0; i < 3; i++) {
      final dec = at(t).dec;
      final c = (sin(altitudeOf(dec) * rad) - sp * sin(dec)) / (cp * cos(dec));
      if (!(c.abs() <= 1)) return double.nan;
      t = transit + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  double asrAltitude(double dec) => atan(1 / (asrShadow + tan((lat - dec / rad) * rad))) / rad;
  return DayMinutes(
    event((_) => -18.0, -1.0, noon - 420),
    event((_) => -0.833, -1.0, noon - 360),
    noon,
    event(asrAltitude, 1.0, noon + 200),
    event((_) => -0.833, 1.0, noon + 360),
    event((_) => -17.0, 1.0, noon + 420),
  );
}

/// Rounded up to the minute, Maghrib three minutes after sunset; null where a time does not form.
DayMinutes? algeriaMinutes(double lat, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final r = algeriaRawMinutes(lat, lon, year, month0, day, asrShadow: asrShadow);
  if (!r.allFinite) return null;
  r.maghrib += 3;
  return r.mapped((v) => (v - 1e-9).ceilToDouble());
}

// ---------------------------------------------------------------- Indonesia

DayMinutes kemenagRawMinutes(double lat, double lon, int year, int month0, int day,
    {bool highland = false, bool twilightDip = false, double asrShadow = 1.0}) {
  final d0 = _d0Of(year, month0, day);
  // the ministry's program takes Universal Time for the ephemeris' time: no ΔT
  SunPosition at(double t) => preciseApparentSun(d0 + t / 1440, 0.0);
  var noon = 720 - 4 * lon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * lon - at(noon).eot;
  }
  final sp = sin(lat * rad), cp = cos(lat * rad);
  double hourAngle(double alt, double dec) {
    final c = (sin(alt * rad) - sp * sin(dec)) / (cp * cos(dec));
    return c.abs() <= 1 ? (4 * acos(c)) / rad : double.nan;
  }

  double event(double alt, double sign, double start) {
    var t = start;
    for (var i = 0; i < 3; i++) {
      final s = at(t);
      t = 720 - 4 * lon - s.eot + sign * hourAngle(alt, s.dec);
      if (!t.isFinite) return double.nan;
    }
    return t;
  }

  final twilight = twilightDip ? 1.0 : 0.0;
  final horizon = highland ? -2.0 : -1.0;
  final shadowDec = at(0.0).dec;
  final asrAlt = atan(1 / (asrShadow + tan((lat * rad - shadowDec).abs()))) / rad;
  var asr = noon + 200;
  for (var i = 0; i < 4; i++) {
    final s = at(asr);
    asr = 720 - 4 * lon - s.eot + hourAngle(asrAlt, s.dec);
  }
  return DayMinutes(
    event(-20 - twilight, -1.0, noon - 420) + 2,
    event(horizon, -1.0, noon - 360) + -3,
    noon + 3,
    asr + 2,
    event(horizon, 1.0, noon + 360) + 2,
    event(-18 - twilight, 1.0, noon + 420) + 2,
  );
}

DayMinutes? kemenagMinutes(double lat, double lon, int year, int month0, int day,
    {bool highland = false, bool twilightDip = false, double asrShadow = 1.0, List<double>? afternoon}) {
  final r = kemenagRawMinutes(lat, lon, year, month0, day, highland: highland, twilightDip: twilightDip, asrShadow: asrShadow);
  if (afternoon != null) {
    final pm = kemenagRawMinutes(afternoon[0], afternoon[1], year, month0, day,
        highland: highland, twilightDip: twilightDip, asrShadow: asrShadow);
    r.asr = pm.asr;
    r.maghrib = pm.maghrib;
    r.isha = pm.isha;
  }
  return r.allFinite ? r.mapped((v) => (v - 1e-9).ceilToDouble()) : null;
}

// ---------------------------------------------------------------- Türkiye Takvimi

const double _takvimSolsticeDeclination = 23.38;
const double _takvimHorizonMargin = 2.0;
const int _takvimHoldSearchDays = 200;

/// The calendar's temkin by its formula, minutes; a listed place carries its own.
double takvimTemkin(double lat, {double heightM = 250.0}) {
  final phi = min(lat.abs(), 62.0) * rad;
  const dec = _takvimSolsticeDeclination * rad;
  final depth = 0.8416 + 0.03924 * sqrt(max(0.0, heightM));
  double hourAngle(double alt) => acos(max(-1.0, min(1.0, (sin(alt * rad) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec)))));
  return ((hourAngle(-depth) - hourAngle(0.0)) / rad) * 4;
}

/// The sun's events of a day at a point, minutes past the day's 00:00 UT; NaN where one does not happen.
class _TakvimEvents {
  final double lat, lon;
  final double _d0;
  late final double noon;
  late final double _noonDec;
  late final double _sp, _cp;

  _TakvimEvents(this.lat, this.lon, int key) : _d0 = (key - _j2000Days).toDouble() - 0.5 {
    var n = 720 - 4 * lon;
    for (var i = 0; i < 3; i++) {
      n = 720 - 4 * lon - preciseApparentSun(_d0 + n / 1440).eot;
    }
    noon = n;
    _noonDec = preciseApparentSun(_d0 + n / 1440).dec;
    _sp = sin(lat * rad);
    _cp = cos(lat * rad);
  }

  double event(double alt, double sign, double start) {
    var t = start;
    for (var i = 0; i < 3; i++) {
      final s = preciseApparentSun(_d0 + t / 1440);
      final c = (sin(alt * rad) - _sp * sin(s.dec)) / (_cp * cos(s.dec));
      if (!(c.abs() <= 1)) return double.nan;
      t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  double asr(double shadow) => event(atan(1 / (shadow + tan((lat * rad - _noonDec).abs()))) / rad, 1.0, noon + 200);
}

bool _takvimReaches19(double lat, double lon, int key) {
  final d0 = (key - _j2000Days).toDouble() - 0.5;
  double lowest(double d) => (lat + preciseApparentSun(d).dec / rad).abs() - 90;
  return min(lowest(d0 - lon / 360), lowest(d0 + 0.5)) <= -19;
}

/// The day whose night times stand for this one: itself, or the last before it whose night reached 19°.
int takvimHeldNight(double lat, double lon, int key) {
  for (var i = 0; i <= _takvimHoldSearchDays; i++) {
    if (_takvimReaches19(lat, lon, key - i)) return key - i;
  }
  return key;
}

/// The calendar's İmsâk before rounding (it is rounded down), minutes past 00:00 UT of the date.
double takvimRawImsak(double lat, double lon, int year, int month0, int day, {double? temkin}) {
  final key = dayKey(year, month0, day);
  final night = takvimHeldNight(lat, lon, key);
  final sun = _TakvimEvents(lat, lon, night);
  return sun.event(-19.0, -1.0, sun.noon - 420) - (temkin ?? takvimTemkin(lat));
}

/// The calendar's six times before rounding.
DayMinutes takvimRawMinutes(double lat, double lon, int year, int month0, int day, {double? temkin, double asrShadow = 1.0}) {
  final t = temkin ?? takvimTemkin(lat);
  final key = dayKey(year, month0, day);
  final today = _TakvimEvents(lat, lon, key);
  final night = takvimHeldNight(lat, lon, key);
  final nightSun = night == key ? today : _TakvimEvents(lat, lon, night);
  final ishaNight = takvimHeldNight(lat, lon, key + 1);
  final ishaDay = ishaNight == key + 1 ? key : ishaNight - 1;
  final ishaSun = ishaDay == key ? today : _TakvimEvents(lat, lon, ishaDay);
  return DayMinutes(
    nightSun.event(-18.0, -1.0, nightSun.noon - 420),
    today.event(0.0, -1.0, today.noon - 360) - t - _takvimHorizonMargin,
    today.noon + t,
    today.asr(asrShadow) + t,
    today.event(0.0, 1.0, today.noon + 360) + t + _takvimHorizonMargin,
    ishaSun.event(-17.0, 1.0, ishaSun.noon + 420) + t,
  );
}

/// Rounded up to the minute; Fajr is the calendar's Sabâh. Null where a time does not form.
DayMinutes? takvimMinutes(double lat, double lon, int year, int month0, int day, {double? temkin, double asrShadow = 1.0}) {
  final r = takvimRawMinutes(lat, lon, year, month0, day, temkin: temkin, asrShadow: asrShadow);
  return r.allFinite ? r.mapped((v) => (v - 1e-9).ceilToDouble()) : null;
}

// ---------------------------------------------------------------- Kazakhstan

double _kzFix(double a, double b) => a - b * (a / b).floorToDouble();

double _kzJulian(int year, int month, int day) {
  var y = year.toDouble(), m = month.toDouble();
  if (month <= 2) {
    y -= 1;
    m += 12;
  }
  final a = (y / 100).floorToDouble();
  final b = 2 - a + (a / 4).floorToDouble();
  return (365.25 * (y + 4716)).floorToDouble() + (30.6001 * (m + 1)).floorToDouble() + day + b - 1524.5;
}

/// The method's sun: [declination (degrees), equation of time (hours)].
List<double> _kzSun(double jd) {
  final d = jd - 2451545.0;
  final g = _kzFix(357.529 + 0.98560028 * d, 360);
  final q = _kzFix(280.459 + 0.98564736 * d, 360);
  final l = _kzFix(q + 1.915 * sin(g * rad) + 0.02 * sin(2 * g * rad), 360);
  final e = 23.439 - 0.00000036 * d;
  final ra = atan2(cos(e * rad) * sin(l * rad), cos(l * rad)) / rad / 15;
  return [asin(sin(e * rad) * sin(l * rad)) / rad, q / 15 - _kzFix(ra, 24)];
}

double kazakhstanMargin(double lat) => lat >= 48 ? 5.0 : 3.0;

/// The six times before rounding.
DayMinutes kazakhstanRawMinutes(double lat, double lon, int year, int month0, int day) {
  final jd = _kzJulian(year, month0 + 1, day) - lon / 360;
  double midday(double t) => _kzFix(12 - _kzSun(jd + t)[1], 24);
  double at(double angle, double t, bool before) {
    final decl = _kzSun(jd + t)[0];
    final x = (-sin(angle * rad) - sin(decl * rad) * sin(lat * rad)) / (cos(decl * rad) * cos(lat * rad));
    if (!(x.abs() <= 1)) return double.nan;
    final h = acos(x) / rad / 15;
    return midday(t) + (before ? -h : h);
  }

  double asrAngle(double t) => -atan(1 / (2 + tan((lat - _kzSun(jd + t)[0]).abs() * rad))) / rad;
  var fajr = at(15.0, 5.0 / 24, true);
  final sunrise = at(0.833, 6.0 / 24, true);
  final dhuhr = midday(12.0 / 24);
  final asr = at(asrAngle(13.0 / 24), 13.0 / 24, false);
  final sunset = at(0.833, 18.0 / 24, false);
  var isha = at(15.0, 18.0 / 24, false);
  final portion = (15.0 / 60) * _kzFix(sunrise - sunset, 24);
  if (!fajr.isFinite || _kzFix(sunrise - fajr, 24) > portion) fajr = sunrise - portion;
  if (!isha.isFinite || _kzFix(isha - sunset, 24) > portion) isha = sunset + portion;
  final margin = kazakhstanMargin(lat);
  double ut(double h) => (h - lon / 15) * 60;
  return DayMinutes(ut(fajr), ut(sunrise) - margin, ut(dhuhr) + margin, ut(asr) + margin, ut(sunset) + margin, ut(isha));
}

/// Rounded to the nearest minute; Asr is the Hanafi one the table carries. Null where a time does not form.
DayMinutes? kazakhstanMinutes(double lat, double lon, int year, int month0, int day) {
  final r = kazakhstanRawMinutes(lat, lon, year, month0, day);
  return r.allFinite ? r.mapped((v) => (v + 0.5).floorToDouble()) : null;
}

// ---------------------------------------------------------------- Egypt

/// Before rounding: Meeus's sun at each time's own moment; Asr's noon shadow from the declination of local noon.
DayMinutes egyptRawMinutes(double lat, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final d0 = _d0Of(year, month0, day);
  SunPosition at(double t) => meeusApparentSun(d0 + t / 1440);
  var noon = 720 - 4 * lon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * lon - at(noon).eot;
  }
  final sp = sin(lat * rad), cp = cos(lat * rad);
  final asrAltitude = atan(1 / (asrShadow + tan((lat * rad - at(noon).dec).abs()))) / rad;
  double event(double altitude, double sign, double start) {
    var t = noon + start;
    for (var i = 0; i < 4; i++) {
      final s = at(t);
      final c = (sin(altitude * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
      if (!(c.abs() <= 1)) return double.nan;
      t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  return DayMinutes(
    event(-19.5, -1.0, -420.0),
    event(-0.845, -1.0, -360.0),
    noon,
    event(asrAltitude, 1.0, 200.0),
    event(-0.845, 1.0, 360.0),
    event(-17.5, 1.0, 420.0),
  );
}

/// Rounded to the nearest minute. Null where a time does not form.
DayMinutes? egyptMinutes(double lat, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final r = egyptRawMinutes(lat, lon, year, month0, day, asrShadow: asrShadow);
  return r.allFinite ? r.mapped((v) => (v + 0.5).floorToDouble()) : null;
}

// ---------------------------------------------------------------- Brunei

const double bruneiLat = 4.892;
const double bruneiLon = 114.9355;

/// The whole minutes a district adds to the capital's table: those its longitude lies west of the capital's.
double bruneiDistrictMinutes(double lon) => max(0.0, ((bruneiLon - lon) * 4 + 0.5).floorToDouble());

/// Before rounding: the capital's table from Meeus's sun at 0h UT of the date, plus the district's minutes.
DayMinutes bruneiRawMinutes(double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final s = meeusApparentSun(_d0Of(year, month0, day));
  final add = bruneiDistrictMinutes(lon);
  final transit = 720 - 4 * bruneiLon - s.eot;
  final sp = sin(bruneiLat * rad), cp = cos(bruneiLat * rad);
  double event(double altitude, double sign) {
    final c = (sin(altitude * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
    return transit + (sign * 4 * acos(c)) / rad;
  }

  final asrAltitude = atan(1 / (asrShadow + tan((bruneiLat * rad - s.dec).abs()))) / rad;
  return DayMinutes(
    event(-20.0, -1.0) + add,
    event(-0.833, -1.0) + add,
    transit + 1.06 + add,
    event(asrAltitude, 1.0) + add,
    event(-0.833, 1.0) + add,
    event(-18.0, 1.0) + add,
  );
}

/// Rounded to the nearest minute.
DayMinutes? bruneiMinutes(double lon, int year, int month0, int day, {double asrShadow = 1.0}) =>
    bruneiRawMinutes(lon, year, month0, day, asrShadow: asrShadow).mapped((v) => (v + 0.5).floorToDouble());

// ---------------------------------------------------------------- Qatar

/// Before rounding: Meeus's sun at each time's own moment, the calendar's margins; Isha ninety minutes on the rounded Maghrib.
DayMinutes qatarRawMinutes(double lat, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final d0 = _d0Of(year, month0, day);
  final sp = sin(lat * rad), cp = cos(lat * rad);
  double event(double altitude, double sign, {bool asr = false}) {
    var t = 720 - 4 * lon;
    for (var i = 0; i < 4; i++) {
      final s = meeusApparentSun(d0 + t / 1440);
      final transit = 720 - 4 * lon - s.eot;
      if (sign == 0) {
        t = transit;
        continue;
      }
      final a = asr ? atan(1 / (asrShadow + tan((lat * rad - s.dec).abs()))) / rad : altitude;
      final c = (sin(a * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
      if (!(c.abs() <= 1)) return double.nan;
      t = transit + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  final maghrib = event(-0.8333, 1.0) + 2.02;
  return DayMinutes(
    event(-18.0, -1.0) - 1.12,
    event(-0.8333, -1.0) - 0.1,
    event(0.0, 0.0) + 0.95,
    event(0.0, 1.0, asr: true) + 0.87,
    maghrib,
    (maghrib + 0.5).floorToDouble() + 90,
  );
}

/// Rounded to the nearest minute. Null where a time does not form.
DayMinutes? qatarMinutes(double lat, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final r = qatarRawMinutes(lat, lon, year, month0, day, asrShadow: asrShadow);
  return r.allFinite ? r.mapped((v) => (v + 0.5).floorToDouble()) : null;
}

// ---------------------------------------------------------------- Kuwait

const double kuwaitLat = 29.33;
const double kuwaitLon = 48.005;
const int kuwaitTableYear = 1978;

/// The whole minutes an area adds to the city's table (west later, east earlier).
double kuwaitAreaMinutes(double lon) => ((kuwaitLon - lon) * 4 + 0.5).floorToDouble();

/// Before rounding: Kuwait City's table — the day of 1978, whatever the year — plus the area's minutes.
DayMinutes kuwaitRawMinutes(double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final d0 = _d0Of(kuwaitTableYear, month0, (month0 == 1 && day == 29) ? 28 : day);
  final add = kuwaitAreaMinutes(lon);
  SunPosition at(double t) => meeusApparentSun(d0 + t / 1440);
  var noon = 720 - 4 * kuwaitLon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * kuwaitLon - at(noon).eot;
  }
  final sp = sin(kuwaitLat * rad), cp = cos(kuwaitLat * rad);
  final asrAltitude = atan(1 / (asrShadow + tan((kuwaitLat * rad - at(noon).dec).abs()))) / rad;
  double event(double altitude, double sign, double start) {
    var t = noon + start;
    for (var i = 0; i < 4; i++) {
      final s = at(t);
      final c = (sin(altitude * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
      t = 720 - 4 * kuwaitLon - s.eot + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  return DayMinutes(
    event(-18.0, -1.0, -420.0) + add,
    event(-0.8333, -1.0, -360.0) + add,
    noon + add,
    event(asrAltitude, 1.0, 200.0) + 0.15 + add,
    event(-0.8333, 1.0, 360.0) + add,
    event(-17.5, 1.0, 420.0) + add,
  );
}

/// Rounded to the nearest minute.
DayMinutes? kuwaitMinutes(double lon, int year, int month0, int day, {double asrShadow = 1.0}) =>
    kuwaitRawMinutes(lon, year, month0, day, asrShadow: asrShadow).mapped((v) => (v + 0.5).floorToDouble());

// ---------------------------------------------------------------- Jordan

/// Before rounding: Morocco's kind of program with Jordan's figures — 18° and 18°, the zone's horizon allowances, its Fajr margin.
DayMinutes jordanRawMinutes(double lat, double lon, int year, int month0, int day,
    {double dipDeg = 0.0, double asrShadow = 1.0, double? dipMaghribDeg, double fajrMinutes = 0.0}) {
  final dipMaghrib = dipMaghribDeg ?? dipDeg;
  final d0 = _d0Of(year, month0, day);
  SunPosition at(double t) => meeusApparentSun(d0 + t / 1440);
  var noon = 720 - 4 * lon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * lon - at(noon).eot;
  }
  final sp = sin(lat * rad), cp = cos(lat * rad);
  final T = (d0 + noon / 1440) / 36525;
  final ma = (357.52911 + 35999.05029 * T) * rad;
  final horizon = -(34.0 / 60 + 0.26667 / (1.00014 - 0.016708 * cos(ma) - 0.00014 * cos(2 * ma)));
  double event(double alt, double sign, double start) {
    var t = start;
    for (var i = 0; i < 3; i++) {
      final s = at(t);
      final c = (sin(alt * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
      if (!(c.abs() <= 1)) return double.nan;
      t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c)) / rad;
    }
    return t;
  }

  final noonTrue = 90 - (lat - at(noon).dec / rad).abs();
  final noonApparent = noonTrue + _refractionFromTrue(noonTrue);
  final asrApparent = atan(1 / (asrShadow + 1 / tan(noonApparent * rad))) / rad;
  final asrTrue = asrApparent - _refractionFromApparent(asrApparent);
  return DayMinutes(
    event(-18.0, -1.0, noon - 420) + fajrMinutes,
    event(horizon - dipDeg, -1.0, noon - 360),
    noon,
    event(asrTrue, 1.0, noon + 200),
    event(horizon - dipMaghrib, 1.0, noon + 360),
    event(-18.0, 1.0, noon + 420),
  );
}

/// Rounded to the nearest minute. Null where a time does not form.
DayMinutes? jordanMinutes(double lat, double lon, int year, int month0, int day,
    {double dipDeg = 0.0, double asrShadow = 1.0, double? dipMaghribDeg, double fajrMinutes = 0.0}) {
  final r = jordanRawMinutes(lat, lon, year, month0, day, dipDeg: dipDeg, asrShadow: asrShadow, dipMaghribDeg: dipMaghribDeg, fajrMinutes: fajrMinutes);
  return r.allFinite ? r.mapped((v) => (v + 0.5).floorToDouble()) : null;
}

// ---------------------------------------------------------------- Tatarstan

/// As printed, whole minutes: the dawn at 18° rounded down, the rest rounded up, Asr at two shadows on the apparent sun, Isha at 15°; where the 18° twilight does not form, the dawn 121 minutes before sunrise and Isha 90 after Maghrib. Null where a time does not form.
DayMinutes? tatarstanMinutes(double lat, double lon, int year, int month0, int day, {double dipDeg = 0.0}) {
  final d0 = _d0Of(year, month0, day);
  SunPosition at(double t) => meeusApparentSun(d0 + t / 1440);
  var noon = 720 - 4 * lon;
  for (var i = 0; i < 3; i++) {
    noon = 720 - 4 * lon - at(noon).eot;
  }
  final sp = sin(lat * rad), cp = cos(lat * rad);
  double event(double alt, double sign) {
    var t = noon + sign * 300;
    var forms = true;
    for (var i = 0; i < 6; i++) {
      final s = at(t);
      final c = (sin(alt * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
      forms = c.abs() <= 1;
      t = 720 - 4 * lon - s.eot + (sign * 4 * acos(c.clamp(-1.0, 1.0))) / rad;
    }
    return forms ? t : double.nan;
  }

  final noonTrue = 90 - (lat - at(noon).dec / rad).abs();
  final noonApparent = noonTrue + _refractionFromTrue(noonTrue);
  final asrApparent = atan(1 / (2 + 1 / tan(noonApparent * rad))) / rad;
  final asr = event(asrApparent - _refractionFromApparent(asrApparent), 1.0);
  final rise = event(-(0.8333 + dipDeg), -1.0), sset = event(-(0.8333 + dipDeg), 1.0);
  if (!(rise.isFinite && sset.isFinite && asr.isFinite)) return null;
  final sunrise = rise.ceilToDouble(), maghrib = sset.ceilToDouble();
  final dawn = event(-18.0, -1.0), dusk = event(-18.0, 1.0);
  return DayMinutes(
    dawn.isFinite ? dawn.floorToDouble() : sunrise - 121,
    sunrise,
    noon.ceilToDouble(),
    asr.ceilToDouble(),
    maghrib,
    dusk.isFinite ? event(-15.0, 1.0).ceilToDouble() : maghrib + 90,
  );
}

// ---------------------------------------------------------------- Russia: the Central Muftiate

/// The six with margin and rounding, whole minutes; NaN where the sun does not reach a time's altitude.
DayMinutes _cdumPrinted(double lat, double lon, int year, int month0, int day) {
  final jd = _kzJulian(year, month0 + 1, day) - lon / 360;
  double midday(double t) => _kzFix(12 - _kzSun(jd + t)[1], 24);
  double at(double angle, double t, bool before) {
    final decl = _kzSun(jd + t)[0];
    final x = (-sin(angle * rad) - sin(decl * rad) * sin(lat * rad)) / (cos(decl * rad) * cos(lat * rad));
    if (!(x.abs() <= 1)) return double.nan;
    final h = acos(x) / rad / 15;
    return midday(t) + (before ? -h : h);
  }

  final asrAngle = -atan(1 / (2 + tan((lat - _kzSun(jd + 13.0 / 24)[0]).abs() * rad))) / rad;
  double minute(double h, double margin) => h.isFinite ? ((h - lon / 15) * 60 + margin + 0.5).floorToDouble() : double.nan;
  return DayMinutes(
    minute(at(18.0, 5.0 / 24, true), -2.0),
    minute(at(0.833, 6.0 / 24, true), -2.0),
    minute(midday(12.0 / 24), 2.0),
    minute(at(asrAngle, 13.0 / 24, false), 2.0),
    minute(at(0.833, 18.0 / 24, false), 2.0),
    minute(at(17.0, 18.0 / 24, false), 2.0),
  );
}

/// As printed, whole minutes: Kazakhstan's sun and arithmetic, Fajr at 18° and Isha at 17°, Asr at two shadows, 2 minutes' margin on every time and the nearest minute; where the twilight does not form, the 45th parallel's share of the night, on the printed minutes, cut to the minute. Null where the sun does not rise or set.
DayMinutes? cdumMinutes(double lat, double lon, int year, int month0, int day) {
  final p = _cdumPrinted(lat, lon, year, month0, day);
  if (!(p.sunrise.isFinite && p.dhuhr.isFinite && p.asr.isFinite && p.maghrib.isFinite)) return null;
  if (p.fajr.isFinite && p.isha.isFinite) return p;
  final r = _cdumPrinted(45.0, lon, year, month0, day);
  final night = 1440 - (p.maghrib - p.sunrise), there = 1440 - (r.maghrib - r.sunrise);
  return DayMinutes(
    p.fajr.isFinite ? p.fajr : p.sunrise - ((r.sunrise - r.fajr) * night / there).ceilToDouble(),
    p.sunrise,
    p.dhuhr,
    p.asr,
    p.maghrib,
    p.isha.isFinite ? p.isha : p.maghrib + ((r.isha - r.maghrib) * night / there).floorToDouble(),
  );
}

// ---------------------------------------------------------------- Albania and Bulgaria: a reference town's table

/// The town a table is computed at, when the day's sun is taken (days after 0h UT of the date), and the margins.
class TownTable {
  final double lat, lon, sunAt;
  final List<double> margins;
  const TownTable(this.lat, this.lon, this.sunAt, this.margins);
}

const albaniaTable = TownTable(41.3333, 19.8167, 0.0, [0.0, -7.0, 5.0, 4.0, 7.0, 0.0]);
const bulgariaTable = TownTable(42.708, 23.3219, -13.0 / 24, [-1.0, -7.0, 5.0, 4.0, 7.0, 0.0]);

/// The whole minutes a town adds to the reference town's table (west later, east earlier).
double townMinutes(TownTable table, double lon) => ((table.lon - lon) * 4 + 0.5).floorToDouble();

/// Before rounding: the reference town's table — the sun taken once for the whole day — plus the town's minutes.
DayMinutes townTableRawMinutes(TownTable table, double lon, int year, int month0, int day, {double asrShadow = 1.0}) {
  final s = meeusApparentSun(_d0Of(year, month0, day) + table.sunAt);
  final add = townMinutes(table, lon);
  final noon = 720 - 4 * table.lon - s.eot;
  final sp = sin(table.lat * rad), cp = cos(table.lat * rad);
  double event(double altitude, double sign) {
    final c = (sin(altitude * rad) - sp * sin(s.dec)) / (cp * cos(s.dec));
    return noon + (sign * 4 * acos(c)) / rad;
  }

  final asrAltitude = atan(1 / (asrShadow + tan((table.lat * rad - s.dec).abs()))) / rad;
  final m = table.margins;
  return DayMinutes(
    event(-18.0, -1.0) + m[0] + add,
    event(-0.8333, -1.0) + m[1] + add,
    noon + m[2] + add,
    event(asrAltitude, 1.0) + m[3] + add,
    event(-0.8333, 1.0) + m[4] + add,
    event(-17.0, 1.0) + m[5] + add,
  );
}

/// Tirana's table, the sun taken at 0h UT of the date; rounded to the nearest minute.
DayMinutes? albaniaMinutes(double lon, int year, int month0, int day, {double asrShadow = 1.0}) =>
    townTableRawMinutes(albaniaTable, lon, year, month0, day, asrShadow: asrShadow).mapped((v) => (v + 0.5).floorToDouble());

/// Sofia's table, the sun taken at 11h UT of the day before; rounded to the nearest minute.
DayMinutes? bulgariaMinutes(double lon, int year, int month0, int day, {double asrShadow = 1.0}) =>
    townTableRawMinutes(bulgariaTable, lon, year, month0, day, asrShadow: asrShadow).mapped((v) => (v + 0.5).floorToDouble());

// ---------------------------------------------------------------- Pakistan: Jamia Banuri Town

/// As printed, whole minutes: Kazakhstan's sun and arithmetic, Fajr and Isha at 18°, the zenith as Dhuhr, Asr at two shadows (one where asked), no margins, the nearest minute. Null where a time does not form.
DayMinutes? banuriMinutes(double lat, double lon, int year, int month0, int day, {int asrShadow = 2}) {
  final jd = _kzJulian(year, month0 + 1, day) - lon / 360;
  double midday(double t) => _kzFix(12 - _kzSun(jd + t)[1], 24);
  double at(double angle, double t, bool before) {
    final decl = _kzSun(jd + t)[0];
    final x = (-sin(angle * rad) - sin(decl * rad) * sin(lat * rad)) / (cos(decl * rad) * cos(lat * rad));
    if (!(x.abs() <= 1)) return double.nan;
    final h = acos(x) / rad / 15;
    return midday(t) + (before ? -h : h);
  }

  final asrAngle = -atan(1 / (asrShadow + tan((lat - _kzSun(jd + 13.0 / 24)[0]).abs() * rad))) / rad;
  double minute(double h) => h.isFinite ? ((h - lon / 15) * 60 + 0.5).floorToDouble() : double.nan;
  final p = DayMinutes(
    minute(at(18.0, 5.0 / 24, true)),
    minute(at(0.833, 6.0 / 24, true)),
    minute(midday(12.0 / 24)),
    minute(at(asrAngle, 13.0 / 24, false)),
    minute(at(0.833, 18.0 / 24, false)),
    minute(at(18.0, 18.0 / 24, false)),
  );
  if (!(p.fajr.isFinite && p.sunrise.isFinite && p.dhuhr.isFinite && p.asr.isFinite && p.maghrib.isFinite && p.isha.isFinite)) return null;
  return p;
}

// ---------------------------------------------------------------- Sweden and Diyanet: the Congress method

const double _riseSet = -0.833;
const double _fajrAngle = -18.0;
const double congressIshaDeg = 16.0;
const double diyanetIshaDeg = 17.0;
const double _temkinSunrise = -7.0, _temkinDhuhr = 5.0, _temkinAsr = 4.0, _temkinMaghrib = 7.0;
const double _floor = 300.0;
const double _band = 20.0;
const double _anchorSlack = 1.0;
const int _searchDays = 200;
const double _sunInstantS = -45.0;
const double _eotAddMin = 0.00176;
const double _dayMs = 86400000.0;

int _midsummerOf(int k) => dayKey(_yearOf(k), 5, 21);

double _eotResidualS(double l) =>
    0.033377 * sin(l) + 0.007721 * cos(l) - 0.000229 * sin(2 * l) + 0.004198 * cos(2 * l) - 0.02346 * sin(3 * l) - 0.026434 * cos(3 * l);

double _decResidualDeg(double l) =>
    -1.1539e-5 - 3.6174e-5 * sin(l) - 2.1101e-5 * cos(l) + 2.0235e-5 * sin(2 * l) - 2.2534e-5 * cos(2 * l);

SunPosition _congressSun(double utcMs) {
  final T = (utcMs / _dayMs - 10957.5) / 36525;
  final l0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T));
  final m = (357.52911 + T * (35999.05029 - 0.0001537 * T)) * rad;
  final c = (1.914602 - T * (0.004817 + 0.000014 * T)) * sin(m) +
      (0.019993 - 0.000101 * T) * sin(2 * m) +
      0.000289 * sin(3 * m);
  final om = (125.04 - 1934.136 * T) * rad;
  final ls = (280.4665 + 36000.7698 * T) * rad;
  final lm = (218.3165 + 481267.8813 * T) * rad;
  final nut = (9.2 * cos(om) + 0.57 * cos(2 * ls) + 0.1 * cos(2 * lm) - 0.09 * cos(2 * om)) / 3600;
  final eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + nut;
  final lam = (l0 + c) * rad;
  final ra = wrap360(atan2(cos(eps * rad) * sin(lam), cos(lam)) / rad);
  final dec = asin(sin(eps * rad) * sin(lam)) + _decResidualDeg(l0 * rad) * rad;
  final eot = (wrap360(l0 - ra + 180) - 180) * 4 + _eotAddMin - _eotResidualS(l0 * rad) / 60;
  return SunPosition(dec, eot);
}

class _Solar {
  final double lat;
  late final double dec;
  late final double transit;

  _Solar(int day, this.lat, double lon) {
    final s = _congressSun(day * _dayMs + _sunInstantS * 1000);
    dec = s.dec;
    transit = 720 - 4 * lon - s.eot;
  }

  double? _hourAngle(double alt) {
    final c = (sin(alt * rad) - sin(lat * rad) * sin(dec)) / (cos(lat * rad) * cos(dec));
    if (c < -1 || c > 1) return null;
    return (acos(c) / rad) * 4;
  }

  double? rising(double alt) {
    final h = _hourAngle(alt);
    return h == null ? null : transit - h;
  }

  double? setting(double alt) {
    final h = _hourAngle(alt);
    return h == null ? null : transit + h;
  }

  double? asr(double shadow) {
    final noonAlt = 90 - (lat - dec / rad).abs();
    if (noonAlt <= 0) return null;
    final alt = atan(1 / (shadow + tan((90 - noonAlt) * rad))) / rad;
    return setting(alt);
  }
}

class _RiseSet {
  final double sr, ss;
  final bool held;
  const _RiseSet(this.sr, this.ss, this.held);
}

class _Ramp {
  final int edge;
  final double t;
  final int? far;
  final bool bump;
  const _Ramp(this.edge, this.t, this.far, this.bump);
}

/// The method for one place and one year; what it needs of the year is worked out once.
class CongressYear {
  final double lat, lon;
  final int year;
  final int? clockOffset;
  final double _ishaAngle;
  final Map<int, _Solar> _solars = {};
  final Map<int, _RiseSet> _riseSets = {};
  final Map<String, _Ramp> _ramps = {};
  final Map<int, List<double>> _extremes = {};
  final Map<int, List<double>> _carried = {};
  bool _ratioDone = false;
  double? _ratio;
  bool _gapDone = false;
  List<int>? _gap;
  bool? _floors;

  CongressYear(this.lat, this.lon, this.year, {double ishaDeg = congressIshaDeg, this.clockOffset}) : _ishaAngle = -ishaDeg;

  _Solar _solarOf(int day) => _solars.putIfAbsent(day, () => _Solar(day, lat, lon));

  /// Printed sunrise and Maghrib with the five-hour floors.
  _RiseSet _riseSetOf(int day) {
    final cached = _riseSets[day];
    if (cached != null) return cached;
    final s = _solarOf(day);
    final dhuhr = s.transit + _temkinDhuhr;
    const half = _floor / 2;
    final rawSr = s.rising(_riseSet), rawSs = s.setting(_riseSet);
    double nsr, nss;
    if (_midsummerFloors(day)) {
      final e = _dhuhrExtremes(day);
      nsr = e[0] - 720 + half;
      nss = e[1] + 720 - half;
    } else {
      nsr = dhuhr - 720 + half;
      nss = dhuhr + 720 - half;
    }
    double sr, ss;
    if (rawSr == null || rawSs == null) {
      final noonUp = 90 - (lat - s.dec / rad).abs() > _riseSet;
      sr = noonUp ? nsr : dhuhr - half;
      ss = noonUp ? nss : dhuhr + half;
    } else {
      sr = rawSr + _temkinSunrise;
      ss = rawSs + _temkinMaghrib;
    }
    sr = max(min(sr, dhuhr - half), nsr);
    ss = min(max(ss, dhuhr + half), nss);
    var held = false;
    if (_midsummerFloors(day)) {
      final mid = _midsummerOf(day);
      if (day == mid) {
        held = true;
      } else if (day > mid) {
        final prev = _riseSetOf(day - 1);
        if (prev.held && ss > prev.ss) {
          ss = prev.ss;
          held = true;
        }
      }
    }
    final rs = _RiseSet(sr, ss, held);
    _riseSets[day] = rs;
    return rs;
  }

  double _dhuhrOf(int day) => _solarOf(day).transit + _temkinDhuhr;

  bool _maghribFloored(int day) {
    final s = _solarOf(day);
    final st = s.setting(_riseSet);
    if (st == null) return true;
    return st + _temkinMaghrib > s.transit + _temkinDhuhr + 720 - _floor / 2;
  }

  List<double> _dhuhrExtremes(int day) {
    final cached = _extremes[day];
    if (cached != null) return cached;
    final mid = _midsummerOf(day);
    List<double> out;
    if (day <= mid) {
      var maxRun = _dhuhrOf(day);
      if (_maghribFloored(day)) {
        var d = day - 1;
        while (d > day - 120 && _maghribFloored(d)) {
          maxRun = max(maxRun, _dhuhrOf(d));
          d -= 1;
        }
      }
      out = [max(_dhuhrOf(day), _dhuhrOf(mid)), min(maxRun, _dhuhrOf(mid))];
    } else {
      var hi = double.negativeInfinity, lo = double.infinity;
      for (var d = mid; d <= day; d++) {
        final v = _dhuhrOf(d);
        hi = max(hi, v);
        lo = min(lo, v);
      }
      out = [hi, lo];
    }
    _extremes[day] = out;
    return out;
  }

  bool _midsummerFloors(int day) {
    final cached = _floors;
    if (cached != null) return cached;
    final s = _solarOf(_midsummerOf(day));
    final sr = s.rising(_riseSet), ss = s.setting(_riseSet);
    final dhuhr = s.transit + _temkinDhuhr;
    const half = _floor / 2;
    bool result;
    if (sr == null || ss == null) {
      result = true;
    } else {
      final psr = max(sr + _temkinSunrise, dhuhr - 720 + half);
      final pss = min(ss + _temkinMaghrib, dhuhr + 720 - half);
      result = 1440 - (pss - psr) <= _floor + _anchorSlack;
    }
    _floors = result;
    return result;
  }

  double _night(int day) {
    final rs = _riseSetOf(day);
    return 1440 - (rs.ss - rs.sr);
  }

  double? _fajr18(int day) => _solarOf(day).rising(_fajrAngle);
  double? _isha16(int day) => _solarOf(day).setting(_ishaAngle);
  double? _trueTime(bool fajr, int day) => fajr ? _fajr18(day) : _isha16(day);

  List<int>? _gapDays() {
    if (_gapDone) return _gap;
    final mid = dayKey(year, 5, 21);
    List<int>? g;
    if (_fajr18(mid) != null) {
      final isha = _solarOf(mid).setting(-congressIshaDeg);
      g = (lat > 0 && isha != null && _carriedRaw(mid)[1] < isha) ? [mid, mid] : null;
    } else {
      var a = mid;
      while (_fajr18(a - 1) == null && mid - a < _searchDays) {
        a -= 1;
      }
      var b = mid;
      while (_fajr18(b + 1) == null && b - mid < _searchDays) {
        b += 1;
      }
      g = [a, b];
    }
    _gap = g;
    _gapDone = true;
    return g;
  }

  double? _ratioOf() {
    if (_ratioDone) return _ratio;
    var d = dayKey(year, 5, 21);
    var f = _fajr18(d);
    var steps = 0;
    while (f == null && steps < _searchDays) {
      d -= 1;
      f = _fajr18(d);
      steps += 1;
    }
    double? r;
    if (f != null) {
      final ss = _riseSetOf(d).ss;
      final s = f + 1440 - ss;
      r = s / 3 / _night(d);
    }
    _ratio = r;
    _ratioDone = true;
    return r;
  }

  List<double> _carriedRaw(int day) {
    final r = _ratioOf() ?? 0.0;
    final rs = _riseSetOf(day);
    final n = _night(day);
    return [rs.sr - r * (_fajrAngle / -congressIshaDeg) * n, rs.ss + r * n];
  }

  List<double> _carriedOf(int day) {
    final cached = _carried[day];
    if (cached != null) return cached;
    final mid = _midsummerOf(day);
    List<double> out;
    if (!_midsummerFloors(day) || day == mid) {
      out = _carriedRaw(day);
    } else if (day < mid) {
      final c = _carriedRaw(day);
      final m = _carriedOf(mid);
      out = [max(c[0], m[0]), min(c[1], m[1])];
    } else {
      var prev = _carriedOf(mid);
      for (var d = mid + 1; d < day; d++) {
        var c = _carried[d];
        if (c == null) {
          final raw = _carriedRaw(d);
          c = [max(raw[0], prev[0]), min(raw[1], prev[1])];
          _carried[d] = c;
        }
        prev = c;
      }
      final raw = _carriedRaw(day);
      out = [max(raw[0], prev[0]), min(raw[1], prev[1])];
    }
    _carried[day] = out;
    return out;
  }

  _Ramp? _rampOf(bool sideIn, bool fajr) {
    final gap = _gapDays();
    if (gap == null) return null;
    final cacheKey = (sideIn ? 'in' : 'out') + (fajr ? 'fajr' : 'isha');
    final cached = _ramps[cacheKey];
    if (cached != null) return cached;
    final edge = sideIn ? gap[0] : gap[1];
    final t0 = _carriedOf(edge)[fajr ? 0 : 1];
    final step = sideIn ? -1 : 1;
    int? far;
    final first = _trueTime(fajr, edge + step);
    var wrapped = false;
    final off = clockOffset;
    if (!sideIn && fajr && off != null && first != null) {
      wrapped = ((first + off) / 1440).floorToDouble() != ((t0 + off) / 1440).floorToDouble();
    }
    var d = edge + step;
    while (!wrapped && (d - edge).abs() < _searchDays) {
      final t = _trueTime(fajr, d);
      if (t != null && (t - t0).abs() <= _band) {
        far = d;
      } else if (far != null) {
        break;
      }
      d += step;
    }
    final r = _Ramp(edge, t0, far, wrapped);
    _ramps[cacheKey] = r;
    return r;
  }

  double? _rampAt(int day, bool sideIn, bool fajr) {
    final r = _rampOf(sideIn, fajr);
    if (r == null) return _trueTime(fajr, day);
    final far = r.far;
    if (far == null) return _trueTime(fajr, day);
    final inside = sideIn ? (far <= day && day < r.edge) : (r.edge < day && day <= far);
    if (!inside) return _trueTime(fajr, day);
    final sign = fajr ? 1.0 : -1.0;
    return r.t + (sign * _band * (day - r.edge).abs()) / (far - r.edge).abs();
  }

  DayMinutes times(int day, {double asrShadow = 1.0}) {
    final s = _solarOf(day);
    final rs = _riseSetOf(day);
    final dhuhr = s.transit + _temkinDhuhr;
    final rawAsr = s.asr(asrShadow);
    var asr = rawAsr == null ? dhuhr : rawAsr + _temkinAsr;
    asr = max(dhuhr, min(asr, rs.ss));
    var fajr = _fajr18(day), isha = _isha16(day);
    final gap = _gapDays();
    if (gap != null) {
      if (gap[0] <= day && day <= gap[1]) {
        final c = _carriedOf(day);
        fajr = c[0];
        isha = c[1];
        if (day == gap[0] || day == gap[1]) {
          final sideIn = day == gap[0];
          if (_rampOf(sideIn, true)?.bump == true) fajr = c[0] + _band;
          if (_rampOf(sideIn, false)?.bump == true) isha = c[1] - _band;
        }
      } else if (day < gap[0]) {
        fajr = _rampAt(day, true, true);
        isha = _rampAt(day, true, false);
      } else {
        fajr = _rampAt(day, false, true);
        isha = _rampAt(day, false, false);
      }
    }
    return DayMinutes(fajr ?? rs.sr - 60, rs.sr, dhuhr, asr, rs.ss, isha ?? rs.ss + 60);
  }
}

final Map<String, CongressYear> _years = {};

/// The Congress method's times, minutes past 00:00 UT of the date, unrounded.
DayMinutes congressMinutes(double lat, double lon, int year, int month0, int day,
    {double asrShadow = 1.0, double ishaDeg = congressIshaDeg, int? clockOffset}) {
  final key = '$lat|$lon|$year|$ishaDeg|$clockOffset';
  var cy = _years[key];
  if (cy == null) {
    if (_years.length >= 12) _years.remove(_years.keys.first);
    cy = CongressYear(lat, lon, year, ishaDeg: ishaDeg, clockOffset: clockOffset);
    _years[key] = cy;
  }
  return cy.times(dayKey(year, month0, day), asrShadow: asrShadow);
}
