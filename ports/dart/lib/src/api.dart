// A place and a date in, the day's six times out: the authority's method,
// then its correction list — what `timesFor` does in the TypeScript library.
//
// Dart's core library has no time-zone database, so the zone's offset is the
// caller's to give (`zoneOffsetMinutes`, from package:timezone or the
// platform): the minutes east of UTC the place's zone keeps at noon UTC of
// the date. A place whose table keeps its own clock (`Place.clock`) needs none.
import 'dart:convert';

import 'methods.dart';

enum Authority { sweden, diyanet, morocco, algeria, indonesia, turkiyetakvimi, kazakhstan, egypt, brunei, qatar, kuwait, jordan, tatarstan, cdum, albania, bulgaria }

enum Prayer { fajr, sunrise, dhuhr, asr, maghrib, isha }

/// The method revisions this port reproduces. A correction list belongs to one revision.
const Map<String, int> revisions = {'sweden': 1, 'diyanet': 2, 'morocco': 3, 'algeria': 1, 'indonesia': 2, 'turkiyetakvimi': 1, 'kazakhstan': 1, 'egypt': 1, 'brunei': 1, 'qatar': 1, 'kuwait': 1, 'jordan': 1, 'tatarstan': 1, 'cdum': 1, 'albania': 1, 'bulgaria': 1};

/// One change of a table's own clock: from a date on, minutes east of UTC.
class ClockChange {
  final String from;
  final int offsetMinutes;
  const ClockChange(this.from, this.offsetMinutes);
}

/// A place as the library's lists have it (data/places). Use the coordinates
/// exactly as the list gives them: the correction lists are looked up by them.
class Place {
  final Authority authority;
  final double lat, lon;

  /// IANA zone; kept for the caller, who gives its offset to [timesFor].
  final String tz;

  /// Diyanet: Isha's depression where the list gives one (16 or 17).
  final double? ishaDeg;

  /// The table's own clock where it keeps one no zone does, in order.
  final List<ClockChange>? clock;

  /// Türkiye's districts: per year, the six points (fajr … isha) as [lat, lon].
  final Map<int, List<List<double>>>? prayerPoints;
  final double? dipDeg, dipMaghribDeg;

  /// Jordan: the zone's margin on Fajr, minutes.
  final double? fajrMinutes;
  final bool highland, twilightDip;

  /// Indonesia: the point [lat, lon] the afternoon's times are taken at, where the list gives one.
  final List<double>? afternoon;

  /// Türkiye Takvimi: the city's temkin, minutes.
  final double? temkin;

  const Place({
    required this.authority,
    required this.lat,
    required this.lon,
    required this.tz,
    this.ishaDeg,
    this.clock,
    this.prayerPoints,
    this.dipDeg,
    this.dipMaghribDeg,
    this.fajrMinutes,
    this.highland = false,
    this.twilightDip = false,
    this.afternoon,
    this.temkin,
  });
}

/// Three decimals, as the lists' keys are written (toStringAsFixed rounds as JavaScript's toFixed does).
String pointKey(double lat, double lon) => '${lat.toStringAsFixed(3)},${lon.toStringAsFixed(3)}';

/// data/corrections/<authority>.json, indexed: point → date → prayer → minutes.
class CorrectionList {
  final Map<String, Map<String, Map<Prayer, int>>> _index = {};

  /// From the file's text.
  CorrectionList.fromJson(String text) {
    final root = jsonDecode(text) as Map<String, dynamic>;
    final points = root['points'] as Map<String, dynamic>;
    points.forEach((point, entries) {
      final byDate = _index.putIfAbsent(point, () => {});
      for (final e in entries as List<dynamic>) {
        final p = (e as String).split(' ');
        byDate.putIfAbsent(p[0], () => {})[Prayer.values.byName(p[1])] = int.parse(p[2]);
      }
    });
  }

  Map<Prayer, int>? correction(double lat, double lon, String date) => _index[pointKey(lat, lon)]?[date];
}

String _two(int n) => n.toString().padLeft(2, '0');

/// The table's own clock on a date, or null where the place keeps its zone's.
int? ownClockAt(Place place, int year, int month0, int day) {
  final clock = place.clock;
  if (clock == null || clock.isEmpty) return null;
  final date = '${year.toString().padLeft(4, '0')}-${_two(month0 + 1)}-${_two(day)}';
  var off = clock.first.offsetMinutes;
  for (final c in clock) {
    if (c.from.compareTo(date) <= 0) off = c.offsetMinutes;
  }
  return off;
}

/// The day as a table prints it.
class Day {
  /// Minutes east of UTC of the clock the table prints the day in.
  final int clock;

  /// Whole minutes past 00:00 UT of the date.
  final Map<Prayer, int> minutes;

  /// 00:00 UT of the date.
  final DateTime midnightUtc;

  const Day(this.clock, this.minutes, this.midnightUtc);

  /// 'HH:MM' on the table's clock.
  String printed(Prayer p) {
    final m = (minutes[p]! + clock) % 1440;
    return '${_two(m ~/ 60)}:${_two(m % 60)}';
  }

  DateTime instant(Prayer p) => midnightUtc.add(Duration(minutes: minutes[p]!));
}

DayMinutes _congress(Place place, int year, int month0, int day, double asrShadow, int clock) {
  final ishaDeg = place.ishaDeg ?? congressIshaDeg;
  final byYear = place.prayerPoints;
  DayMinutes raw;
  if (byYear != null && byYear.isNotEmpty) {
    final years = byYear.keys.toList()..sort();
    var best = years.first;
    for (final y in years) {
      if ((y - year).abs() < (best - year).abs()) best = y;
    }
    final p = byYear[best]!;
    DayMinutes at(int i) =>
        congressMinutes(p[i][0], p[i][1], year, month0, day, asrShadow: asrShadow, ishaDeg: ishaDeg, clockOffset: clock);
    raw = DayMinutes(at(0).fajr, at(1).sunrise, at(2).dhuhr, at(3).asr, at(4).maghrib, at(5).isha);
  } else {
    raw = congressMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow, ishaDeg: ishaDeg, clockOffset: clock);
  }
  // the library carries an instant in whole milliseconds, then rounds it to the minute
  return raw.mapped((v) => ((v * 60000).truncateToDouble() / 60000 + 0.5).floorToDouble());
}

/// The day as a table prints it for [date] ('YYYY-MM-DD'), or null where the
/// method gives no times.
///
/// [zoneOffsetMinutes]: the minutes east of UTC that `place.tz` keeps at noon
/// UTC of the date; needed unless the place has its own clock.
/// [corrections] is the authority's list; without it the times are the bare
/// method's, which is the published table to within the list's few minutes.
Day? timesFor(Place place, String date, {int? zoneOffsetMinutes, CorrectionList? corrections, double asrShadow = 1.0}) {
  final parts = date.split('-').map(int.parse).toList();
  final year = parts[0], month0 = parts[1] - 1, day = parts[2];
  final clock = ownClockAt(place, year, month0, day) ?? zoneOffsetMinutes;
  if (clock == null) {
    throw ArgumentError('zoneOffsetMinutes is needed: ${place.tz} at noon UTC of $date');
  }
  DayMinutes? t;
  switch (place.authority) {
    case Authority.sweden:
    case Authority.diyanet:
      t = _congress(place, year, month0, day, asrShadow, clock);
      break;
    case Authority.morocco:
      t = moroccoMinutes(place.lat, place.lon, year, month0, day,
          dipDeg: place.dipDeg, asrShadow: asrShadow, dipMaghribDeg: place.dipMaghribDeg);
      break;
    case Authority.algeria:
      t = algeriaMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.indonesia:
      t = kemenagMinutes(place.lat, place.lon, year, month0, day,
          highland: place.highland, twilightDip: place.twilightDip, asrShadow: asrShadow, afternoon: place.afternoon);
      break;
    case Authority.kazakhstan:
      t = kazakhstanMinutes(place.lat, place.lon, year, month0, day);
      break;
    case Authority.egypt:
      t = egyptMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.brunei:
      t = bruneiMinutes(place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.qatar:
      t = qatarMinutes(place.lat, place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.kuwait:
      t = kuwaitMinutes(place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.jordan:
      t = jordanMinutes(place.lat, place.lon, year, month0, day,
          dipDeg: place.dipDeg ?? 0.0, asrShadow: asrShadow, dipMaghribDeg: place.dipMaghribDeg, fajrMinutes: place.fajrMinutes ?? 0.0);
      break;
    case Authority.tatarstan:
      t = tatarstanMinutes(place.lat, place.lon, year, month0, day, dipDeg: place.dipDeg ?? 0.0);
      break;
    case Authority.cdum:
      t = cdumMinutes(place.lat, place.lon, year, month0, day);
      break;
    case Authority.albania:
      t = albaniaMinutes(place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.bulgaria:
      t = bulgariaMinutes(place.lon, year, month0, day, asrShadow: asrShadow);
      break;
    case Authority.turkiyetakvimi:
      t = takvimMinutes(place.lat, place.lon, year, month0, day, temkin: place.temkin, asrShadow: asrShadow);
      break;
  }
  if (t == null) return null;
  final out = <Prayer, int>{
    Prayer.fajr: t.fajr.toInt(),
    Prayer.sunrise: t.sunrise.toInt(),
    Prayer.dhuhr: t.dhuhr.toInt(),
    Prayer.asr: t.asr.toInt(),
    Prayer.maghrib: t.maghrib.toInt(),
    Prayer.isha: t.isha.toInt(),
  };
  final c = corrections?.correction(place.lat, place.lon, date);
  if (c != null) {
    c.forEach((k, step) {
      // the lists are of the standard Asr only
      if (!(k == Prayer.asr && asrShadow != 1)) out[k] = out[k]! + step;
    });
  }
  return Day(clock, out, DateTime.utc(year, month0 + 1, day));
}
