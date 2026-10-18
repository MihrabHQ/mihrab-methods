# Contributing

Thank you for looking. Two kinds of help matter most here: a report of a
time that differs from what your mosque or authority prints, and a method for
an authority that is not here yet.

## A time differs from your mosque's

[Open a report](https://github.com/MihrabHQ/mihrab-methods/issues/new?template=times-differ.yml).
The form asks for the city, the date, the prayer, the time the app or the
library gave, the time printed, and where the printed time comes from — a
photo or a link to the published table is the most useful thing you can
add. A mosque's own timetable that differs from its national authority's is
worth reporting too; it is answered differently (a per-prayer offset in the
app, not a change to the method), but it is answered.

## Adding an authority: 100 % or nothing

A method is added only when it reproduces **every** time of its authority's
published timetable on the printed minute, over every place and every date
the authority has published. Not 99.9 %: a method one minute off on one day
in a city is a method that tells someone the wrong time for a prayer. Until
it is on every minute, it stays out of `timesFor` (`candidateTimes` can run
it for research).

What a new authority needs:

1. **The formula, written from scratch** in `src/methods/<authority>.ts`:
   the sun, the angles, the margins, the rounding and the high-latitude rule
   the authority applies, worked out from its published times. Nothing
   copied from the authority's program or app.
2. **The places**, each at the point its table is computed at
   (`data/places/`), with the zone its table is printed in and its country,
   and an entry point in `src/authorities/` and `src/<authority>.ts`.
3. **The check.** `tools/verify.ts` against the authority's own published
   tables, every place, every day. The tables stay outside the repository:
   no timetable is committed here, ever.
4. **A correction list only for what is left** (`npm run corrections -- <authority>`):
   the few times the authority's own arithmetic puts a fraction of a second
   on the other side of a minute. If the list grows past a small fraction of
   the times, the formula is not finished; refit it rather than list it.
5. **Certification** (`npm run certify`) at **0** off, the method's revision
   in `src/methods/revisions.ts`, a section in `docs/methods.md` stating the
   method in words and formulas, cases in `test/vectors.json`
   (`npm run vectors`), and an entry in `CHANGELOG.md`.

Then `npm test`, `npm run typecheck` and `node scripts/readme.mjs --check`
must pass. Figures in the README and docs are generated from
`certification.json` — write `<!--fig:<key>-->…<!--/fig-->` and run
`node scripts/readme.mjs`; never type a number in.

## Changing a method

Any change that changes what a method prints — the formula, a point, a
rounding — raises its revision (`src/methods/revisions.ts`), needs a new
correction list and certification at 0 off, and a CHANGELOG line saying what
changed in the output. Apps on the old revision keep their old list and are
told to update; they never apply a list made for another revision.

## Wording

Say what the times match, never more: "matches the published timetable of
…", not "official times". Mihrab and mihrab-methods are independent and are
not affiliated with any authority. No "the only" or "the first".

## Licence

Contributions are under the [MPL-2.0](LICENSE), as the rest of the code.
