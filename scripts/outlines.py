#!/usr/bin/env python3
"""Adds countries to data/locate/countryOutlines.json from Natural Earth's 1:10m admin-0 outlines (public domain).

    python3 scripts/outlines.py <ne_10m_admin_0_countries.geojson> --own KZ EG ... --near RU UZ ...

--own   a country an authority here publishes for: its whole outline, simplified to a few hundred metres. It
        replaces what the file had for that code.
--near  a neighbour of one: only its strip within REACH degrees of the --own countries, simplified a little more,
        and added to what the file already has for that code (a neighbour of two is extended, not replaced).

A country with a method needs its neighbours in the file: `countryAt` gives a point just outside every outline to
the nearest one within 25 km, so a neighbour that is missing loses its border strip to the country that is there.
Outlines are written as polygons, an outer ring and its holes each, in integers of 1/scale degree, x then y — the
shape src/locate.ts reads. Morocco (with Western Sahara) and Türkiye (with Northern Cyprus) were joined by hand:
do not pass them to --own. Needs shapely; `npm run embed` afterwards.
"""
import json, os, sys
from shapely.geometry import shape, MultiPolygon, Polygon
from shapely.ops import unary_union

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FILE = os.path.join(ROOT, 'data', 'locate', 'countryOutlines.json')
OWN_TOLERANCE = 0.004   # degrees: about 400 m
NEAR_TOLERANCE = 0.006
REACH = 0.6             # degrees: the strip of a neighbour that is kept, well past countryAt's 25 km
SMALLEST = 1e-4         # square degrees: smaller islets are left to the coast's reach

def code_of(p):
    for k in ('ISO_A2_EH', 'ISO_A2', 'WB_A2'):
        if p.get(k) and p[k] != '-99': return p[k]
    return None

def polygons(g):
    return [p for p in getattr(g, 'geoms', [g]) if isinstance(p, Polygon) and p.area > SMALLEST]

def main():
    args = sys.argv[2:]
    own = [a.upper() for a in args[args.index('--own') + 1:(args.index('--near') if '--near' in args else len(args))]] if '--own' in args else []
    near = [a.upper() for a in args[args.index('--near') + 1:]] if '--near' in args else []
    out = json.load(open(FILE))
    scale = out['scale']
    features = json.load(open(sys.argv[1]))['features']
    def source(code):
        geoms = [shape(f['geometry']) for f in features if code_of(f['properties']) == code]
        if not geoms: sys.exit(f'no outline for {code}')
        return unary_union(geoms).buffer(0)
    flat = lambda ring: [int(round(v * scale)) for xy in list(ring.coords)[:-1] for v in xy]
    write = lambda g: [[flat(p.exterior)] + [flat(i) for i in p.interiors if len(i.coords) > 4] for p in sorted(polygons(g), key=lambda p: -p.area)]
    count = lambda c: sum(len(r) // 2 for p in c for r in p)
    for code in own:
        out['countries'][code] = write(source(code).simplify(OWN_TOLERANCE, preserve_topology=True))
        print('own ', code, len(out['countries'][code]), 'polygons,', count(out['countries'][code]), 'points')
    if near:
        around = unary_union([source(c) for c in own]).buffer(REACH)
        for code in near:
            strip = source(code).intersection(around).buffer(0).simplify(NEAR_TOLERANCE, preserve_topology=True)
            had = [Polygon([(r[0][i] / scale, r[0][i + 1] / scale) for i in range(0, len(r[0]), 2)],
                           [[(h[i] / scale, h[i + 1] / scale) for i in range(0, len(h), 2)] for h in r[1:]]).buffer(0)
                   for r in out['countries'].get(code, [])]
            out['countries'][code] = write(unary_union(had + [strip]))
            print('near', code, len(out['countries'][code]), 'polygons,', count(out['countries'][code]), 'points')
    out['countries'] = dict(sorted(out['countries'].items()))
    json.dump(out, open(FILE, 'w'), separators=(',', ':'))
    print('wrote', os.path.relpath(FILE, ROOT), os.path.getsize(FILE) // 1024, 'KB,', len(out['countries']), 'countries')

if __name__ == '__main__':
    main()
