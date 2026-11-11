// Holds the Dart port to test/vectors.json, the sample the TypeScript library
// writes for ports. From ports/dart:
//
//     dart run tool/vector_check.dart ../..
//
// The argument is the repository root; a second one names another vectors file.
// The zone offsets are the vectors' own: Dart has no time-zone database.
import 'dart:convert';
import 'dart:io';

import '../lib/mihrab_methods.dart';

List<double> _pair(dynamic v) => [(v[0] as num).toDouble(), (v[1] as num).toDouble()];

void main(List<String> args) {
  final root = args.isNotEmpty ? args[0] : '../..';
  final path = args.length > 1 ? args[1] : '$root/test/vectors.json';
  final vectors = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
  final theirs = (vectors['revisions'] as Map<String, dynamic>).map((k, v) => MapEntry(k, v as int));
  if (theirs.length != revisions.length || revisions.entries.any((e) => theirs[e.key] != e.value)) {
    print('The vectors are of revisions $theirs; this port is of $revisions.');
    exit(1);
  }
  final lists = {
    for (final a in revisions.keys) a: CorrectionList.fromJson(File('$root/data/corrections/$a.json').readAsStringSync()),
  };
  var off = 0, checked = 0;
  final cases = vectors['cases'] as List<dynamic>;
  for (final raw in cases) {
    final c = raw as Map<String, dynamic>;
    final p = c['place'] as Map<String, dynamic>;
    final id = p['id'] as String;
    final authority = id.split(':').first;
    final place = Place(
      authority: Authority.values.byName(authority),
      lat: (p['lat'] as num).toDouble(),
      lon: (p['lon'] as num).toDouble(),
      tz: p['tz'] as String,
      ishaDeg: (p['ishaDeg'] as num?)?.toDouble(),
      clock: (p['clock'] as List<dynamic>?)?.map((e) => ClockChange(e[0] as String, (e[1] as num).toInt())).toList(),
      prayerPoints: (p['prayerPoints'] as Map<String, dynamic>?)
          ?.map((k, v) => MapEntry(int.parse(k), (v as List<dynamic>).map(_pair).toList())),
      dipDeg: (p['dipDeg'] as num?)?.toDouble(),
      dipMaghribDeg: (p['dipMaghribDeg'] as num?)?.toDouble(),
      highland: p['highland'] == true,
      twilightDip: p['twilightDip'] == true,
      afternoon: p['afternoon'] == null ? null : _pair(p['afternoon']),
      temkin: (p['temkin'] as num?)?.toDouble(),
    );
    final date = c['date'] as String;
    final want = c['printed'] as Map<String, dynamic>?;
    final wantClock = ((c['clock'] as Map<String, dynamic>)['offsetMinutes'] as num).toInt();
    final got = timesFor(place, date, zoneOffsetMinutes: wantClock, corrections: lists[authority]);
    if ((got == null) != (want == null)) {
      off++;
      print('$id $date: ${got == null ? 'no times' : 'times'}, expected ${want == null ? 'none' : 'times'}');
      continue;
    }
    if (got == null || want == null) continue;
    if (got.clock != wantClock) {
      off++;
      print('$id $date: clock ${got.clock}, expected $wantClock');
    }
    final instants = c['instants'] as Map<String, dynamic>;
    for (final k in Prayer.values) {
      checked++;
      final instant = got.instant(k).toIso8601String();
      if (got.printed(k) != want[k.name] || instant != instants[k.name]) {
        off++;
        print('$id $date ${k.name}: ${got.printed(k)} ($instant), expected ${want[k.name]} (${instants[k.name]})');
      }
    }
  }
  print('${cases.length} cases, $checked times, $off off');
  exit(off == 0 ? 0 : 1);
}
