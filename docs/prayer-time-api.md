---
title: Prayer Time API – free Islamic prayer times over HTTP
description: A free prayer time API with no key - Fajr, Dhuhr, Asr, Maghrib and Isha for a coordinate or a listed place, from the Islamic authority that publishes for it. JSON over GET, described in OpenAPI, open source and self-hostable.
permalink: /prayer-time-api/
---

# Prayer Time API

A free HTTP API for Islamic prayer times: give it a coordinate and a date,
and it answers with the day's times from the authority that publishes for
that place. JSON over GET, no key, CORS open, nothing logged.

```
GET https://mihrab-api.elghamri.se/v1/times?lat=30.04&lng=31.24&date=2026-10-15
```

The answer names the authority and the place whose times these are, how far
that place is from the point you asked about, the clock the times are
printed in, and each of the six times twice — as an instant and as the
`HH:MM` the timetable prints:

```jsonc
{
  "place": { "id": "egypt:1", "name": "القاهرة", "country": "EG", "lat": 30.075, "lon": 31.2764, "tz": "Africa/Cairo" },
  "distanceKm": 5.2,
  "authority": "egypt",
  "authorityFrom": "location",        // or "request" when you named one
  "date": "2026-10-15",
  "status": "certified",              // inside the dates the method was checked over
  "certifiedFrom": "2026-01-01",
  "certifiedUntil": "2026-12-31",
  "revision": 1,
  "clock": { "zone": "Africa/Cairo", "offsetMinutes": 180, "label": "Africa/Cairo" },
  "asrShadow": 1,                     // 1: one shadow length (Shafi'i), 2: two (Hanafi)
  "times": {
    "fajr": { "instant": "2026-10-15T02:30:00.000Z", "printed": "05:30", "basis": "table" },
    "sunrise": { … }, "dhuhr": { … }, "asr": { … }, "maghrib": { … }, "isha": { … }
  }
}
```

(Five of the six times are folded away here; the exact schema is in the
[OpenAPI description](openapi.json).)

## Routes

| Route | What it answers |
|---|---|
| `GET /v1/times?lat=&lng=&date=` | The day's times at a point, from the authority that publishes for it |
| `GET /v1/times?authority=diyanet&lat=&lng=&date=` | The same, from an authority you name |
| `GET /v1/times?place=algeria:27&from=2026-10-01&to=2026-10-31` | A range of days for a listed place |
| `GET /v1/nearest?authority=morocco&lat=&lng=` | The authority's nearest listed place |
| `GET /v1/authority?lat=&lng=` | Which authority publishes for a point |
| `GET /v1/places?authority=indonesia` | An authority's places |
| `GET /v1/methods` | Every method, its revision and its certification |
| `GET /openapi.json` | The API described in OpenAPI 3.1 |

Useful parameters on `/v1/times`: `maxKm=` refuses an answer from a place
further away than that; `asr=hanafi` or `asr=shafii` asks for an Asr by
name (the default is the one the timetable prints); `strict=1` refuses a
date outside the certified span instead of answering `method-only`.

## Places no authority here covers

Where none of the <!--fig:total.methods-->21<!--/fig--> authorities publishes
for the point, the API answers **404** rather than quietly applying another
country's method. Two ways on from there:

- name an authority with `authority=` to ask for its method anyway, or
- add `fallback=standard&tz=Europe/Paris` (and optionally
  `convention=mwl|isna|egypt|karachi|ummalqura`; left out, the API picks
  the one commonly used at the point) to get a standard astronomical
  calculation, marked `"status": "calculated"` so it cannot be mistaken
  for a verified answer.

## What "status" means

| `status` | Meaning |
|---|---|
| `certified` | The date is inside the span over which the method matched its authority's published timetable on every time |
| `method-only` | The method alone, outside that span: on the printed minute all but rarely, never more than a minute from it |
| `calculated` | The standard fallback: a convention's angles, held to no timetable |

## Limits, honestly

The public API is free to call from a site, a script or a prototype. It is
run without a promise of availability, answers are cached for an hour, and
it may be rate-limited if one caller crowds out the rest. An app people
rely on for their prayers should not depend on a request per reader:

- **embed the library** — the same times, offline:
  [JavaScript library](javascript-prayer-time-library.md),
  [other languages](examples.md); or
- **host the API yourself** — the handler is one file with no dependencies:

```sh
git clone https://github.com/MihrabHQ/mihrab-methods && cd mihrab-methods
npm install && npm run serve      # http://localhost:8787
```

It also runs on Cloudflare Workers as it is
([`api/worker.ts`](https://github.com/MihrabHQ/mihrab-methods/blob/main/api/worker.ts)).

## Calling it

```ts
const r = await fetch('https://mihrab-api.elghamri.se/v1/times?lat=59.33&lng=18.07&date=2026-11-12');
if (r.status === 404) { /* no authority publishes for this point: see the fallback above */ }
const day = await r.json();
console.log(day.authority, day.place.name, day.times.maghrib.printed);
```

```sh
curl 'https://mihrab-api.elghamri.se/v1/times?place=sweden:stockholm&date=2026-11-12'
```

More: [every route and parameter](usage.md#as-an-http-api) ·
[OpenAPI](openapi.json) ·
[how the times are verified](verification.md) ·
[source on GitHub](https://github.com/MihrabHQ/mihrab-methods)
