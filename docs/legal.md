# Formulas and correction lists: why this can be used freely

Under EU and Swedish law, this approach is lawful use and "insubstantial
extraction": an unprotected mathematical formula, worked out from published
times, plus a very small, static list of factual data points that fixes edge
cases.

- **The methods are formulas.** A method of calculation is not protected as
  such. What is here is the arithmetic: the sun's position, the angles, the
  margins and the high-latitude rules each authority applies. It is written
  from scratch, not copied.
- **The correction lists are microscopically small and static.** Each one
  holds only the few times where the authority's own rounding falls the
  other way: a point, a date, a prayer, a minute either way. Sweden's is
  <!--fig:sweden.corrections-->270<!--/fig--> entries against <!--fig:sweden.timesCompact-->1.4 million<!--/fig-->
  times (<!--fig:sweden.correctionsPct-->0.018<!--/fig--> %). The aim is the same for every method:
  get the formula as close as possible, so the list that remains is
  insubstantial.
- **No timetable is part of this repository.** It holds no copy of any
  authority's tables. The times are computed, for any date and any point.
  The sample in `test/vectors.json`, for ports to check themselves against,
  is kept small for the same reason: enough to prove a port matches, too
  small to be a timetable.

This is the project's position, not legal advice. The same rule applies to
every method added here: the best formula first, and a correction list only
for what is left.

Mihrab and mihrab-methods are independent. They are not affiliated with,
endorsed by or speaking for any authority whose timetables they match, and
nothing here is an authority's own publication.
