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
 *   GET /v1/times?lat=36.75&lng=3.06&date=2026-10-15  the point's own authority, its nearest place
 *   GET /v1/authority?lat=36.75&lng=3.06             defaultAuthorityFor, with the country and the nearest place
 *   GET /openapi.json                                the routes, described (src/openapi.ts)
 *
 * Options on /v1/times: asr=shafii or asr=hanafi for an Asr by name (the default is
 * the one the timetable prints; asr=2 still means hanafi); strict=1 to refuse a date
 * outside the certified span (HTTP 422) instead of answering 'method-only';
 * fallback=standard with tz=<IANA zone> (and optionally convention=) to get a
 * calculated day — status 'calculated', mihrab-methods/standard — for a point no
 * authority here publishes for, instead of a 404.
 */
import { AUTHORITIES, methodInfo, nearestPlace, placeById, placesOf, timesFor, timesForRange, UncertifiedMethodError, type AsrChoice, type Authority, type Place } from './index.js';
import { countryAt, defaultAuthorityFor } from './locate.js';
import { openapi, ROUTES, type RoutePath } from './openapi.js';
import { STANDARD_CONVENTION_IDS, standardConventionFor, standardTimes, type StandardConvention } from './standard.js';

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
type Found = { place: Place; distanceKm?: number; authorityFrom: 'request' | 'location' };
const km = (d: number) => Math.round(d * 10) / 10;
/** The place a request means: by id, or the nearest to its point — of the authority it names, or of the point's own. */
const find = (q: URLSearchParams): Found => {
  const id = q.get('place');
  if (id) {
    const p = placeById(id);
    if (!p) throw new HttpError(404, `no place ${id}`);
    return { place: p, authorityFrom: 'request' };
  }
  const lat = num(q, 'lat'),
    lng = num(q, 'lng');
  const named = q.get('authority') !== null;
  const authority = named ? authorityOf(q) : defaultAuthorityFor(lat, lng);
  if (!authority) throw new HttpError(404, `no authority here publishes for that point (country: ${countryAt(lat, lng) ?? 'not one with a method here'}); name one with authority=`);
  const maxKm = q.get('maxKm') === null ? undefined : num(q, 'maxKm');
  const near = nearestPlace(authority, lat, lng, { maxKm });
  if (!near) throw new HttpError(404, 'no place near there');
  return { place: near.place, distanceKm: km(near.distanceKm), authorityFrom: named ? 'request' : 'location' };
};
const brief = (p: Place) => ({ id: p.id, name: p.name, country: p.country, lat: p.lat, lon: p.lon, tz: p.tz });
const said = (f: Found) => ({ place: brief(f.place), ...(f.distanceKm === undefined ? {} : { distanceKm: f.distanceKm }), authorityFrom: f.authorityFrom });

/** The standard calculation for a request's point (`fallback=standard`): a day, or a range of them. The zone is the caller's. */
const calculated = (q: URLSearchParams, asr: 'shafii' | 'hanafi') => {
  const lat = num(q, 'lat'),
    lon = num(q, 'lng');
  const tz = q.get('tz');
  if (!tz) throw new HttpError(400, 'tz: with fallback=standard the IANA time zone the times are printed in is needed, e.g. tz=Europe/Paris');
  const named = q.get('convention');
  if (named !== null && !(STANDARD_CONVENTION_IDS as string[]).includes(named)) throw new HttpError(400, `convention: one of ${STANDARD_CONVENTION_IDS.join(', ')}`);
  const country = countryAt(lat, lon);
  const convention = (named as StandardConvention | null) ?? standardConventionFor(country);
  const one = (date: string) => standardTimes({ lat, lon, date, tz, convention, asr });
  const head = { place: null, country, authorityFrom: 'none' as const, fallback: 'standard' as const };
  const from = q.get('from'),
    to = q.get('to');
  if (from && to) {
    const a = Date.parse(`${from}T00:00:00Z`),
      b = Date.parse(`${to}T00:00:00Z`);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) throw new HttpError(400, 'from, to: two dates, the first not after the second');
    if ((b - a) / 86_400_000 > 366) throw new HttpError(400, 'from, to: at most 367 days');
    const days = [];
    for (let t = a; t <= b; t += 86_400_000) days.push(one(new Date(t).toISOString().slice(0, 10)));
    return { ...head, days };
  }
  return { ...head, ...one(q.get('date') ?? new Date().toISOString().slice(0, 10)) };
};

const HANDLERS: Record<RoutePath, (q: URLSearchParams) => unknown> = {
  '/': () => ({
    name: 'mihrab-methods',
    description: 'The prayer-time authorities’ own calculation methods, each reproducing its published timetable to the minute.',
    docs: 'https://github.com/MihrabHQ/mihrab-methods#readme',
    openapi: '/openapi.json',
    routes: ROUTES,
    authorities: AUTHORITIES,
    // each method's record, as the library carries it (the feed on main may be newer: methodInfo says the date)
    methods: AUTHORITIES.map(a => {
      const m = methodInfo(a);
      return { authority: a, name: m.name, revision: m.revision, certified: m.certified, checkedAt: m.certification?.checkedAt ?? null, places: m.places };
    }),
  }),
  '/openapi.json': () => openapi(),
  '/v1/methods': () => AUTHORITIES.map(methodInfo),
  '/v1/places': q => placesOf(authorityOf(q)).map(brief),
  '/v1/nearest': q => {
    if (q.get('place')) throw new HttpError(400, 'place: not read here; give lat and lng');
    return said(find(q));
  },
  '/v1/authority': q => {
    const lat = num(q, 'lat'),
      lng = num(q, 'lng');
    const authority = defaultAuthorityFor(lat, lng);
    const near = authority && nearestPlace(authority, lat, lng);
    return { country: countryAt(lat, lng), authority, place: near ? brief(near.place) : null, distanceKm: near ? km(near.distanceKm) : null };
  },
  '/v1/times': q => {
    const asked = q.get('asr');
    if (asked !== null && !['1', '2', 'printed', 'shafii', 'hanafi'].includes(asked)) throw new HttpError(400, 'asr: printed, shafii or hanafi');
    const fallback = q.get('fallback');
    if (fallback !== null && fallback !== 'standard') throw new HttpError(400, 'fallback: standard');
    let f: Found;
    try {
      f = find(q);
    } catch (e) {
      // A point no authority here publishes for, and the caller asked for a calculated day instead of a 404.
      if (!(fallback && e instanceof HttpError && e.status === 404 && !q.get('place') && q.get('authority') === null)) throw e;
      return calculated(q, asked === '2' || asked === 'hanafi' ? 'hanafi' : 'shafii');
    }
    const opts = { asr: asked === '2' ? ('hanafi' as const) : asked === null || asked === '1' ? ('printed' as const) : (asked as AsrChoice), strict: q.get('strict') === '1' };
    const from = q.get('from'),
      to = q.get('to');
    if (from && to) return { ...said(f), days: timesForRange(f.place, from, to, opts) };
    return { ...said(f), ...timesFor(f.place, q.get('date') ?? new Date().toISOString().slice(0, 10), opts) };
  },
};

/** The answer to a request path and query. Throws HttpError, UncertifiedMethodError, RangeError or TypeError. */
export function handle(url: URL): unknown {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!Object.hasOwn(HANDLERS, path)) throw new HttpError(404, `no such route; the routes are ${ROUTES.join(' · ')}`);
  return HANDLERS[path as RoutePath](url.searchParams);
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
