# certification.json and the lists, as a feed

`certification.json` is meant to be read by apps. For each authority it
says whether the method is certified, the method's `revision`
(`src/methods/revisions.ts`) and the correction list it certifies
(`corrections`: the dates it covers and how many times it moves):

```json
"morocco": { "certified": true, "revision": 1,
             "corrections": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "entries": N, "sha256": "…" },
             "checks": [ { "tables": "…", "places": N, "times": N, "off": 0, "offWithoutCorrections": N, "from": "…", "to": "…" } ], … }
```

An app that computes revision 1 can take any newer list certified for
revision 1 straight from `data/corrections/<authority>.json` — no release
needed. A higher revision means the method itself changed and its lists no
longer fit the older code: the app should ask its user to update.
`certified: false` means the authority has published tables the method is
not yet on every minute of. Past a list's `to`, the method alone applies.

The check done right is in the library:

```ts
import { fetchLatestCorrections } from 'mihrab-methods/morocco';
const r = await fetchLatestCorrections({ authority: 'morocco' });
// r.status: 'current' | 'updated' | 'method-moved' | 'uncertified' | 'rejected'
```

It reads `certification.json`, takes a list only for the revision this
build computes, only when it is the list the certification names (dates,
size, and the **SHA-256** of the file as published), and puts it in force
(`applyCorrections` restores one an app has stored). Both files have a
published schema: `schemas/certification.schema.json` and
`schemas/corrections.schema.json`; `npm test` validates them.

Addresses: `main` is the live feed (what the Mihrab app reads). Every
release is also tagged, and the same paths under a tag are fixed for good:
`https://raw.githubusercontent.com/MihrabHQ/mihrab-methods/v1.0.0/certification.json`.
Pass a tag's base URL as `baseUrl` to pin.

The revision is raised whenever a change to a method or to its places'
points changes what it prints; `npm test` fails until certification.json
names the current revision and list. `CHANGELOG.md` says what each
revision changed in the output.
