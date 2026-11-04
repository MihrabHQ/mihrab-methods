/**
 * The HTTP API over the library — one handler, served two ways: by
 * `tools/serve.ts` on Node (`npm run serve`) and by `api/worker.ts` at the
 * edge (the public API). Nothing is logged or stored; every answer is JSON.
 *
 *   GET /                                            the routes, the methods' certification
 *   GET /v1/methods                                  every method, as methodInfo gives it
 *   GET /v1/places?authority=algeria                 the authority's places (id, name, country, lat, lon, tz)
 *   GET /v1/nearest?authority=algeria&lat=36.75&lng=3.06
 *   GET /v1/times?place=algeria:27&date=2026-10-15   one day, as timesFor gives it
 *   GET /v1/times?authority=algeria&lat=36.75&lng=3.06&date=2026-10-15
 *   GET /v1/times?place=algeria:27&from=2026-10-01&to=2026-10-31
 *   GET /v1/authority?lat=36.75&lng=3.06             defaultAuthorityFor, with the country
 *
 * Options on /v1/times: asr=2 for the Hanafi Asr; strict=1 to refuse a date
 * outside the certified span (HTTP 422) instead of answering 'method-only'.
 */
import { AUTHORITIES, methodInfo, nearestPlace, placeById, placesOf, timesFor, timesForRange, UncertifiedMethodError, type Authority, type Place } from './index.js';
import { countryAt, defaultAuthorityFor } from './locate.js';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const isAuthority = (x: string | null): x is Authority => !!x && (AUTHORITIES as readonly string[]).includes(x);
const num = (q: URLSearchParams, k: string): number => {
  const v = Number(q.get(k));
  if (q.get(k) === null || !Number.isFinite(v)) throw new HttpError(400, `${k}: a number is needed`);
  return v;
};
const authorityOf = (q: URLSearchParams): Authority => {
  const a = q.get('authority');
  if (!isAuthority(a)) throw new HttpError(400, `authority: one of ${AUTHORITIES.join(', ')}`);
  return a;
};
const placeOf = (q: URLSearchParams): Place => {
  const id = q.get('place');
  if (id) {
    const p = placeById(id);
    if (!p) throw new HttpError(404, `no place ${id}`);
    return p;
  }
  const near = nearestPlace(authorityOf(q), num(q, 'lat'), num(q, 'lng'));
  if (!near) throw new HttpError(404, 'no place near there');
  return near.place;
};
const brief = (p: Place) => ({ id: p.id, name: p.name, country: p.country, lat: p.lat, lon: p.lon, tz: p.tz });

const ROUTES = [
  '/v1/methods',
  '/v1/places?authority=<authority>',
  '/v1/nearest?authority=<authority>&lat=<lat>&lng=<lng>',
  '/v1/times?place=<authority:id>&date=<YYYY-MM-DD>[&asr=2][&strict=1]',
  '/v1/times?authority=<authority>&lat=<lat>&lng=<lng>&date=<YYYY-MM-DD>',
  '/v1/times?place=<authority:id>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>',
  '/v1/authority?lat=<lat>&lng=<lng>',
];

/** The answer to a request path and query. Throws HttpError, UncertifiedMethodError, RangeError or TypeError. */
export function handle(url: URL): unknown {
  const q = url.searchParams;
  switch (url.pathname.replace(/\/+$/, '') || '/') {
    case '/':
      return {
        name: 'mihrab-methods',
        description: 'The prayer-time authorities’ own calculation methods, each reproducing its published timetable to the minute.',
        docs: 'https://github.com/MihrabHQ/mihrab-methods#readme',
        routes: ROUTES,
        authorities: AUTHORITIES,
        // each method's record, as the library carries it (the feed on main may be newer: methodInfo says the date)
        methods: AUTHORITIES.map(a => {
          const m = methodInfo(a);
          return { authority: a, name: m.name, revision: m.revision, certified: m.certified, checkedAt: m.certification?.checkedAt ?? null, places: m.places };
        }),
      };
    case '/v1/methods':
      return AUTHORITIES.map(methodInfo);
    case '/v1/places':
      return placesOf(authorityOf(q)).map(brief);
    case '/v1/nearest': {
      const near = nearestPlace(authorityOf(q), num(q, 'lat'), num(q, 'lng'));
      return near && { place: brief(near.place), distanceKm: Math.round(near.distanceKm * 10) / 10 };
    }
    case '/v1/authority': {
      const lat = num(q, 'lat'),
        lng = num(q, 'lng');
      return { country: countryAt(lat, lng), authority: defaultAuthorityFor(lat, lng) };
    }
    case '/v1/times': {
      const place = placeOf(q);
      const opts = { asrShadow: q.get('asr') === '2' ? (2 as const) : (1 as const), strict: q.get('strict') === '1' };
      const from = q.get('from'),
        to = q.get('to');
      if (from && to) return { place: brief(place), days: timesForRange(place, from, to, opts) };
      return { place: brief(place), ...timesFor(place, q.get('date') ?? new Date().toISOString().slice(0, 10), opts) };
    }
    default:
      throw new HttpError(404, `no such route; the routes are ${ROUTES.join(' · ')}`);
  }
}

/** Status, body and headers for a request, errors included — what both servers send. */
export function respond(url: URL): { status: number; body: string; headers: Record<string, string> } {
  let status = 200;
  let body: unknown;
  try {
    body = handle(url);
  } catch (e) {
    status = e instanceof HttpError ? e.status : e instanceof UncertifiedMethodError ? 422 : e instanceof RangeError || e instanceof TypeError ? 400 : 500;
    body = { error: (e as Error).message };
  }
  return {
    status,
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      // A day's times never change between releases: let browsers and the edge keep an answer for an hour.
      'cache-control': status === 200 ? 'public, max-age=3600' : 'no-store',
    },
  };
}
