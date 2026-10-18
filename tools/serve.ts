/**
 * A small HTTP server over the library, for sites and programs not in
 * JavaScript, or to try the methods from a browser. Self-hostable; nothing
 * is logged or stored.
 *
 *   npm run serve                # http://localhost:8787
 *   PORT=9000 npm run serve
 *
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
import http from 'node:http';
import { AUTHORITIES, methodInfo, nearestPlace, placeById, placesOf, timesFor, timesForRange, UncertifiedMethodError, type Authority, type Place } from '../src/index.js';
import { countryAt, defaultAuthorityFor } from '../src/locate.js';

const PORT = Number(process.env.PORT ?? 8787);

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
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

function handle(url: URL): unknown {
  const q = url.searchParams;
  switch (url.pathname) {
    case '/v1/methods':
      return AUTHORITIES.map(methodInfo);
    case '/v1/places':
      return placesOf(authorityOf(q)).map(brief);
    case '/v1/nearest': {
      const near = nearestPlace(authorityOf(q), num(q, 'lat'), num(q, 'lng'));
      return near && { place: brief(near.place), distanceKm: Math.round(near.distanceKm * 10) / 10 };
    }
    case '/v1/authority': {
      const lat = num(q, 'lat'), lng = num(q, 'lng');
      return { country: countryAt(lat, lng), authority: defaultAuthorityFor(lat, lng) };
    }
    case '/v1/times': {
      const place = placeOf(q);
      const opts = { asrShadow: q.get('asr') === '2' ? (2 as const) : (1 as const), strict: q.get('strict') === '1' };
      const from = q.get('from'), to = q.get('to');
      if (from && to) return { place: brief(place), days: timesForRange(place, from, to, opts) };
      return { place: brief(place), ...timesFor(place, q.get('date') ?? new Date().toISOString().slice(0, 10), opts) };
    }
    default:
      throw new HttpError(404, 'see the routes in tools/serve.ts');
  }
}

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    let status = 200;
    let body: unknown;
    try {
      body = handle(url);
    } catch (e) {
      status = e instanceof HttpError ? e.status : e instanceof UncertifiedMethodError ? 422 : e instanceof RangeError || e instanceof TypeError ? 400 : 500;
      body = { error: (e as Error).message };
    }
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify(body));
  })
  .listen(PORT, () => console.log(`mihrab-methods on http://localhost:${PORT}/v1/times?authority=algeria&lat=36.75&lng=3.06&date=2026-10-15`));
