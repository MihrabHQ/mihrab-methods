# Ports

The methods in other languages, each with no dependencies beyond its
language's standard library. The TypeScript library in `src/` is the
reference; a port follows it line for line and is held to
`test/vectors.json` on every push (`.github/workflows/ports.yml`).

| Port | Check, from the repository root |
| --- | --- |
| [Python](python/README.md) (3.9 or later) | `python3 ports/python/test_vectors.py` |
| [Swift](swift/README.md) (5.5 or later) | `swift run --package-path ports/swift mihrab-vectors .` |
| [Kotlin](kotlin/README.md) (JVM, Android) | `kotlinc ports/kotlin/src ports/kotlin/test -include-runtime -d /tmp/mihrab-methods.jar && java -jar /tmp/mihrab-methods.jar .` |
| [Dart](dart/README.md) (2.17 or later, Flutter) | `dart run ports/dart/tool/vector_check.dart .` |

What every port gives: a place and a date in, the day's six times out, on
the clock the authority's table prints them in — the method, then its
correction list from `data/corrections/`. The places are in `data/places/`;
a port takes a place's coordinates exactly as the list has them, since the
correction lists are looked up by them.

What a port does not do: fetch a newer correction list, find the nearest
place, or say whether a date is inside the certified span. Those are in the
TypeScript library ([docs/usage.md](../docs/usage.md)); the feed they read
is described in [docs/feed.md](../docs/feed.md) for a port that wants them.

`npm run port-sample -- <file>` writes a much wider sample (about 25,000
place-days) in the same shape, for a port's check to take as its last
argument; the `ports` workflow runs every port against it when started by
hand.

## Revisions

Each port names the method revisions it reproduces (`REVISIONS`, or
`revisions` in Dart), and its check refuses vectors of another revision. A
correction list belongs to one revision, so a port that is behind must not
be given a newer list. When a method's revision is raised in `src/`, the
same change is made in every port in the same commit, and the checks say so
if one was missed.

## The clock

A table prints a day in the clock the place keeps at noon, read from the
machine's time-zone database (Dart has none, so there the caller gives the
offset). Two machines with different editions of that database can differ
on a zone whose rules changed between them; the times themselves, as
instants, do not depend on it except at the few high-latitude places where
the Congress method looks at the clock.
