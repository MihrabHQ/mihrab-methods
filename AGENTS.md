# AGENTS.md — read this before you change anything

For everyone who works here: Claude and other AI agents, contributors and the
maintainer. Short on purpose; the depth is in [README.md](README.md),
[CONTRIBUTING.md](CONTRIBUTING.md) and `docs/`.

## 1. What comes first

1. **No method prints a time off its authority's published timetable.** A
   method is used only at **0** times off (`certification.json`). Apps,
   the Mihrab app first among them, show these times to people praying.
2. **Installed apps keep working.** The Mihrab app reads `certification.json`
   and `data/corrections/<authority>.json` from `main` at run time.
3. **What the repository says is true**, and every figure in it is generated.
4. Everything else.

## 2. Hard rules

- **Branch and pull request.** Never push to `main` directly; merge only with
  CI green and the maintainer's go-ahead.
- **Commits are authored by the maintainer alone** — no `Co-Authored-By`,
  session links or "Generated with …" lines, in commits or PR bodies.
- **No timetable is ever committed**, and nothing here says how the reference
  tables are obtained. They stay outside (`MIHRAB_TABLES`, default `.tables`).
- **The feed's shape is a contract**: add fields to `certification.json` or
  a correction list, never rename or remove one; `schemas/` and
  `test/schemas.test.ts` hold it.
- **A change that changes what a method prints** — the formula, a point, a
  rounding — raises its revision (`src/methods/revisions.ts`), needs a new
  correction list and `npm run certify` at 0 off, `npm run vectors`, and a
  `CHANGELOG.md` line saying what changed in the output. Then copy the method
  into the Mihrab app with the same revision.
- **No hand-typed figures.** Write `<!--fig:<key>-->…<!--/fig-->` and run
  `npm run readme`; a figure the record lacks belongs in `tools/certify.ts`.
  Wording: "matches the published timetable of …", never "official"; no "the
  only" or "the first"; independent of every authority.
- `scripts/figures.mjs` is also the Mihrab app's (synced as
  `scripts/copy/figures.js` there): after changing it, sync the app.
- **Publishing to npm** is the maintainer's: bump `version`, tag
  `vX.Y.Z`, `npm pack`, then `npx npm@11 publish <tgz> --access public`
  (the account confirms with a passkey).

## 3. Before you say you are done

```sh
npm run preflight   # typecheck, tests, the README/docs figure check
```

With the reference tables present the tests include the full check against
them (about 25 minutes); without them those tests skip — say which you ran.
Report what you did not verify, and anything the maintainer must decide.

## 4. Where things are

| What | Where |
|---|---|
| The methods | `src/methods/` |
| The calls apps use | `src/core/api.ts` |
| Places and their points | `src/authorities/`, `data/places/` |
| The check and the record | `tools/verify.ts`, `tools/certify.ts`, `certification.json` |
| Correction lists | `tools/corrections.ts`, `data/corrections/` |
| Generated figures | `scripts/figures.mjs`, `scripts/readme.mjs` |
| The live feed, checked daily | `tools/feed-check.ts` (`npm run feed-check`), `.github/workflows/feed.yml` |

## 5. When something goes wrong after a merge

The `feed` workflow reads what installed apps read — `certification.json`
and the correction lists on `main` — every day and after every change to
them, and fails when an app would refuse a list or fall back to the method
alone. A red `feed` badge in the README is the one thing here that needs
action at once: fix or revert on a branch, then check that
`npm run feed-check` passes before merging.
