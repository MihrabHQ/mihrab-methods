#!/usr/bin/env python3
"""Adds an authority to this tree from one small definition: every registry
the library, its tools and its four ports keep a list of authorities in.

    python3 scripts/new-authority.py definition.json [tree]

What it writes is the WIRING. What it leaves to be written by hand, and
names when it ends: the method itself (`src/methods/<id>.ts`, a stub that
throws unless the definition gives one), the method in each port
(`<id>_minutes` / `<id>Minutes`), and the method's sections in
`docs/methods.md`, `docs/status.md` and `CHANGELOG.md`. `npm test` fails
on a registry that disagrees with another (`test/registry.test.ts`), so a
step missed here is found there.

The definition (JSON):

    id            the authority's id, lower case: "tunisia"
    name          its full name, for the description
    short         the short name in the figures: "Tunisia"
    authority     who publishes: "Institut National de la Météorologie"
    verifyLabel   the line the certification prints for it
    country       ISO code: "TN"          tz   IANA zone: "Africa/Tunis"
    places        path of the places' JSON (copied to data/places/<placesFile>.json)
    placesFile    its name there, without .json: "tunisiaPlaces"
    placeType     the TypeScript type of that file's content
    placeFields   optional: extra `Place` fields, TypeScript, from `p` (one entry of the file)
    vectors       place ids the test vectors are taken at: ["tunisia:1", …]
    call          how compute calls the method (TypeScript expression)
    method        optional: path of the method's TypeScript, copied to src/methods/<id>.ts
    ports         optional: {"python": "...", "swift": "...", "kotlin": "...", "dart": "..."} —
                  the call in each port's api file; default (lat, lon, year, month0, day)
    packagePhrase what package.json's description gains: "Tunisia"
"""
import io, json, re, shutil, sys

D = json.load(open(sys.argv[1], encoding='utf8'))
R = (sys.argv[2] if len(sys.argv) > 2 else '.').rstrip('/') + '/'
rd = lambda p: io.open(R + p, encoding='utf8').read()
def wr(p, s): io.open(R + p, 'w', encoding='utf8').write(s)
def edit(p, pairs):
    s = rd(p)
    for a, b, n in pairs:
        assert s.count(a) == n, (p, a, s.count(a))
        s = s.replace(a, b)
    wr(p, s)
def dup_line(p, needle, new, n=1):
    out, hits = [], 0
    for line in rd(p).split('\n'):
        out.append(line)
        if (needle.search(line) if hasattr(needle, 'search') else needle in line):
            out.append(new(line) if callable(new) else new); hits += 1
    assert hits == n, (p, needle, hits)
    wr(p, '\n'.join(out))

i = D['id']
assert re.fullmatch(r'[a-z][a-z0-9]*', i), i
order = re.search(r"AUTHORITIES: readonly Authority\[\] = \[([^\]]+)\]", rd('src/core/types.ts')).group(1)
order = [x.strip().strip("'") for x in order.split(',')]
assert i not in order, f'{i} is already an authority'
pv = order[-1]
Id = i[0].upper() + i[1:]
P = D['placesFile']

# ---------------------------------------------------------------- the data and the entry points
shutil.copy(D['places'], R + f'data/places/{P}.json')
if D.get('method'):
    shutil.copy(D['method'], R + f'src/methods/{i}.ts')
else:
    wr(f'src/methods/{i}.ts', f"""/** {D['name']} — the method. TO WRITE (scripts/new-authority.py left this stub). */
export type {Id}Instants = {{ fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date }};

export function {i}Times(_latitude: number, _longitude: number, _year: number, _month: number, _day: number): {Id}Instants | null {{
  throw new Error('{i}: the method is not written yet');
}}
""")
c = json.loads(rd(f'data/corrections/{pv}.json')); c['points'] = {}
for k in list(c):
    if k in ('from', 'to'): c.pop(k)
wr(f'data/corrections/{i}.json', json.dumps(c, ensure_ascii=False, indent=1) + '\n')
wr(f'src/{i}.ts', f"/** mihrab-methods/{i} — {D['short']}'s method with its places and correction list, and nothing else's. */\nimport './authorities/{i}.js';\n\nexport * from './core/index.js';\nexport {{ places }} from './authorities/{i}.js';\n")
extra = ''.join(f'\n      {line}' for line in D.get('placeFields', []))
wr(f'src/authorities/{i}.ts', f"""/**
 * {D['name']}: the places its times are published for, each at the point
 * they are computed at.
 */
import list from '../data/generated/{P}.js';
import corrections from '../data/generated/{i}Corrections.js';
import certification from '../data/generated/{i}Certification.js';
import {{ METHOD_REVISION }} from '../methods/revisions.js';
import {{ registerAuthority }} from '../core/registry.js';
import type {{ Place }} from '../core/types.js';

const AUTHORITY = '{i}' as const;
const TZ = '{D['tz']}';

function buildPlaces(): Place[] {{
  return list.map(p => {{
    const key = String(p.id);
    return {{
      authority: AUTHORITY,
      id: `${{AUTHORITY}}:${{key}}`,
      key,
      name: p.name,
      country: '{D['country']}',
      lat: p.lat,
      lon: p.lon,
      tz: TZ,{extra}
    }};
  }});
}}

export const {i} = registerAuthority({{
  authority: AUTHORITY,
  revision: METHOD_REVISION.{i},
  places: buildPlaces(),
  corrections,
  certification,
  description: {json.dumps(D.get('description', {'name': D['name'], 'method': 'TO WRITE', 'countries': [D['country']], 'parameters': {}, 'sources': [], 'spec': 'docs/methods.md'}), ensure_ascii=False, indent=2).replace(chr(10), chr(10) + '  ')},
}});

export const places = {i}.places;
""")

# ---------------------------------------------------------------- the registries
edit('src/core/types.ts', [(f"| '{pv}'", f"| '{pv}' | '{i}'", 1), (f"'{pv}']", f"'{pv}', '{i}']", 1)])
dup_line('src/methods/revisions.ts', re.compile(rf'^  {pv}: \d+,$'), f'  {i}: 1,')
s = rd('scripts/embed.mjs')
lines = [l for l in s.split('\n')]
# the pass above doubled every places line: undo, then add ours after the last
out, seen = [], set()
for l in lines:
    if re.match(r"^  \w+: \['data/places/[\w-]+\.json', '.*'\],$", l):
        if l in seen: continue
        seen.add(l)
    out.append(l)
last = max(k for k, l in enumerate(out) if re.match(r"^  \w+: \['data/places/[\w-]+\.json', '.*'\],$", l))
out.insert(last + 1, f"  {P}: ['data/places/{P}.json', '{D['placeType']}'],")
wr('scripts/embed.mjs', '\n'.join(out))
edit('scripts/embed.mjs', [(f"'{pv}']", f"'{pv}', '{i}']", 2)])
edit('scripts/figures.mjs', [(f"'{pv}']", f"'{pv}', '{i}']", 1)])
dup_line('scripts/figures.mjs', re.compile(rf'^  {pv}: \{{'), f"  {i}: {{ short: {json.dumps(D['short'], ensure_ascii=False)}, authority: {json.dumps(D['authority'], ensure_ascii=False)} }},".replace('"', "'"))
edit('schemas/certification.schema.json', [(f'"{pv}"', f'"{pv}",\n      "{i}"', 1)])
dup_line('tools/verify.ts', re.compile(rf"^    {pv}: '"), f"    {i}: {json.dumps(D['verifyLabel'], ensure_ascii=False)},".replace('"', "'"))
edit('tools/corrections.ts', [(f"'{pv}'] as const", f"'{pv}', '{i}'] as const", 1)])
dup_line('tools/corrections.ts', f"NATIONAL === '{pv}'", lambda l: l.replace(pv, i))
dup_line('tools/vectors.ts', re.compile(rf'^  {pv}: \['), f"  {i}: [{', '.join(repr(v) for v in D['vectors'])}],")
dup_line('src/index.ts', f"import './authorities/{pv}.js';", lambda l: l.replace(pv, i))
edit('test/server.test.ts', [(f"'{pv}']", f"'{pv}', '{i}']", 1)])
s = rd('src/core/compute.ts')
imp = re.search(rf"(?m)^import \{{ {pv}Times \}} from '../methods/{pv}.js';$", s).group(0)
s = s.replace(imp, imp + f"\nimport {{ {i}Times }} from '../methods/{i}.js';", 1)
assert s.count(f"    case '{pv}': {{") == 1
s = s.replace(f"    case '{pv}': {{", f"    case '{pv}':\n    case '{i}': {{", 1)
first = "        place.authority === 'morocco'\n"
assert s.count(first) == 1
s = s.replace(first, f"        place.authority === '{i}'\n          ? {D['call']}\n          : place.authority === 'morocco'\n", 1)
wr('src/core/compute.ts', s)

p = json.loads(rd('package.json'))
def after(d, key, newkey, val):
    out = {}
    for k, v in d.items():
        out[k] = v
        if k == key: out[newkey] = val
    return out
twin = lambda v: json.loads(json.dumps(v).replace(pv, i))
p['exports'] = after(p['exports'], './' + pv, './' + i, twin(p['exports']['./' + pv]))
star = list(p['typesVersions'].keys())[0]
p['typesVersions'][star] = after(p['typesVersions'][star], pv, i, twin(p['typesVersions'][star][pv]))
n = [0]
def walk(v):
    if isinstance(v, list):
        for x in [f'./dist/*/{pv}.js', f'./src/{pv}.ts']:
            if x in v: v.insert(v.index(x) + 1, x.replace(pv, i)); n[0] += 1
    elif isinstance(v, dict):
        for x in v.values(): walk(x)
for k, v in p.items():
    if k not in ('exports', 'typesVersions'): walk(v)
assert n[0] == 2, n
if D.get('packagePhrase'):
    assert p['description'].endswith('.')
    p['description'] = p['description'][:-1] + f", {D['packagePhrase']}."
wr('package.json', json.dumps(p, indent=2, ensure_ascii=False) + '\n')

# ---------------------------------------------------------------- the ports' registries (the methods are written by hand)
ports = D.get('ports', {})
snake = i
py = ports.get('python', f"methods.{snake}_minutes(place['lat'], place['lon'], year, month0, day)")
sw = ports.get('swift', f"{i}Minutes(place.lat, place.lon, year, month0, day)")
kt = ports.get('kotlin', f"{i}Minutes(place.lat, place.lon, year, month0, day)")
da = ports.get('dart', f"{i}Minutes(place.lat, place.lon, year, month0, day)")

s = rd('ports/python/mihrab_methods/api.py')
s, k = re.subn(rf"'{pv}': (\d+)\}}", lambda m: f"'{pv}': {m.group(1)}, '{i}': 1}}", s, count=1); assert k == 1
anchor = f"    elif a == '{pv}':\n"
assert s.count(anchor) == 1
s = s.replace(anchor, f"    elif a == '{i}':\n        t = {py}\n" + anchor, 1)
wr('ports/python/mihrab_methods/api.py', s)

s = rd('ports/swift/Sources/MihrabMethods/Api.swift')
s, k = re.subn(rf"(case [\w, ]*\b{pv})\n", rf"\1, {i}\n", s, count=1); assert k == 1
s, k = re.subn(rf'"{pv}": (\d+)\]', lambda m: f'"{pv}": {m.group(1)}, "{i}": 1]', s, count=1); assert k == 1
anchor = f"    case .{pv}:\n"
assert s.count(anchor) == 1
s = s.replace(anchor, f"    case .{i}:\n        t = {sw}\n" + anchor, 1)
wr('ports/swift/Sources/MihrabMethods/Api.swift', s)

s = rd('ports/kotlin/src/Api.kt')
s, k = re.subn(rf"(enum class Authority \{{[\w, ]*\b{pv}) \}}", rf"\1, {i} }}", s, count=1); assert k == 1
s, k = re.subn(rf'"{pv}" to (\d+)\)', lambda m: f'"{pv}" to {m.group(1)}, "{i}" to 1)', s, count=1); assert k == 1
anchor = f"        Authority.{pv} -> "
assert s.count(anchor) == 1
s = s.replace(anchor, f"        Authority.{i} -> {kt}\n" + anchor, 1)
wr('ports/kotlin/src/Api.kt', s)

s = rd('ports/dart/lib/src/api.dart')
s, k = re.subn(rf"(enum Authority \{{[\w, ]*\b{pv}) \}}", rf"\1, {i} }}", s, count=1); assert k == 1
s, k = re.subn(rf"'{pv}': (\d+)\}}", lambda m: f"'{pv}': {m.group(1)}, '{i}': 1}}", s, count=1); assert k == 1
anchor = f"    case Authority.{pv}:\n"
assert s.count(anchor) == 1
s = s.replace(anchor, f"    case Authority.{i}:\n      t = {da};\n      break;\n" + anchor, 1)
wr('ports/dart/lib/src/api.dart', s)
s = rd('ports/dart/lib/mihrab_methods.dart')
assert s.count(f'{pv}Minutes, ') == 1
wr('ports/dart/lib/mihrab_methods.dart', s.replace(f'{pv}Minutes, ', f'{pv}Minutes, {i}Minutes, ', 1))

# ---------------------------------------------------------------- the docs' lists
s = rd('docs/usage.md')
assert s.count(f'`/{pv}` |') == 1
wr('docs/usage.md', s.replace(f'`/{pv}` |', f'`/{pv}`, `/{i}` |', 1))

print(f"""{i}: wired after {pv}.
Still to write by hand:
  src/methods/{i}.ts                       {'(given)' if D.get('method') else 'THE METHOD (a stub that throws)'}
  ports: {snake}_minutes (python), {i}Minutes (swift, kotlin, dart) in each port's methods file
  src/locate.ts                            the country in NATIONAL, when one authority serves it
  docs/methods.md, docs/status.md, CHANGELOG.md, README (npm run readme), ports/python/README.md
Then, with .tables pointing at the tables:
  npm run embed && npm run corrections -- {i} && npm run certify -- {i} && npm run vectors && npm run openapi && npm run readme && npm run preflight""")
