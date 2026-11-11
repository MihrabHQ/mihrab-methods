"""Holds the Python port to test/vectors.json, the sample the TypeScript
library writes for ports. Run from the repository root:

    python3 ports/python/test_vectors.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)

from mihrab_methods import REVISIONS, load_corrections, times_for  # noqa: E402


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'test', 'vectors.json')
    with open(path, encoding='utf-8') as f:
        vectors = json.load(f)
    if vectors['revisions'] != REVISIONS:
        print('The vectors are of revisions %s; this port is of %s.' % (vectors['revisions'], REVISIONS))
        return 1
    lists = load_corrections(os.path.join(ROOT, 'data', 'corrections'))
    off = 0
    checked = 0
    for case in vectors['cases']:
        place = dict(case['place'])
        place['authority'] = place['id'].split(':')[0]
        got = times_for(place, case['date'], lists.get(place['authority']))
        want = case['printed']
        if (got is None) != (want is None):
            off += 1
            print('%s %s: %s, expected %s' % (place['id'], case['date'], got and got['printed'], want))
            continue
        if got is None:
            continue
        if got['clock'] != case['clock']['offsetMinutes']:
            off += 1
            print('%s %s: clock %s, expected %s' % (place['id'], case['date'], got['clock'], case['clock']['offsetMinutes']))
        for k, v in want.items():
            checked += 1
            instant = got['instants'][k].strftime('%Y-%m-%dT%H:%M:%S.000Z')
            if got['printed'][k] != v or instant != case['instants'][k]:
                off += 1
                print('%s %s %s: %s (%s), expected %s (%s)' % (place['id'], case['date'], k, got['printed'][k], instant, v, case['instants'][k]))
    print('%d cases, %d times, %d off' % (len(vectors['cases']), checked, off))
    return 1 if off else 0


if __name__ == '__main__':
    sys.exit(main())
