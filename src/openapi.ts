/**
 * The HTTP API's routes, said once: `ROUTE_SPECS` is what src/server.ts
 * dispatches on (its handlers are typed by these paths, so a route cannot
 * be served without being described, or described without being served),
 * what the root lists, and what `openapi()` turns into the OpenAPI 3.1
 * description served at /openapi.json and kept in docs/openapi.json.
 */
import { AUTHORITIES } from './core/types.js';

/** Where the public API answers. */
export const API_URL = 'https://mihrab-api.elghamri.se';

type Param = { name: string; required?: boolean; description: string; schema: Record<string, unknown> };
type RouteSpec = { path: string; summary: string; description?: string; params: readonly Param[]; example: string; answers: string; errors?: readonly number[] };

const authority = (required: boolean, description: string): Param => ({ name: 'authority', required, description, schema: { type: 'string', enum: [...AUTHORITIES] } });
const lat: Param = { name: 'lat', description: 'Latitude, degrees north.', schema: { type: 'number', minimum: -90, maximum: 90 } };
const lng: Param = { name: 'lng', description: 'Longitude, degrees east.', schema: { type: 'number', minimum: -180, maximum: 180 } };
const need = (p: Param): Param => ({ ...p, required: true });
const day = { type: 'string', format: 'date' };

export const ROUTE_SPECS = [
  { path: '/', summary: 'The routes, and each method’s certification', params: [], example: '/', answers: 'Index' },
  { path: '/openapi.json', summary: 'This description', params: [], example: '/openapi.json', answers: 'OpenApi' },
  { path: '/v1/methods', summary: 'Every method: its parameters, revision, certification, correction list and sources', params: [], example: '/v1/methods', answers: 'Methods' },
  {
    path: '/v1/places',
    summary: 'An authority’s places',
    params: [authority(true, 'Whose places.')],
    example: '/v1/places?authority=algeria',
    answers: 'Places',
    errors: [400],
  },
  {
    path: '/v1/authority',
    summary: 'The authority whose timetable a point’s community prays by',
    description: 'The country at the point, the authority that publishes for it (null where none here does) and that authority’s nearest place.',
    params: [need(lat), need(lng)],
    example: '/v1/authority?lat=36.75&lng=3.06',
    answers: 'AuthorityAt',
    errors: [400],
  },
  {
    path: '/v1/nearest',
    summary: 'The place nearest a point',
    description: 'Among the named authority’s places, or, with no authority named, among those of the authority the point belongs to.',
    params: [authority(false, 'Whose places. Left out: the authority the point belongs to, as /v1/authority answers.'), need(lat), need(lng), { name: 'maxKm', description: 'Answer 404 when the nearest place is farther than this.', schema: { type: 'number', exclusiveMinimum: 0 } }],
    example: '/v1/nearest?lat=36.75&lng=3.06',
    answers: 'Nearest',
    errors: [400, 404],
  },
  {
    path: '/v1/times',
    summary: 'A place’s prayer times on a date, or on every date of a range',
    description:
      'Name the place by its id, or give a point: the times are those of the nearest place of the named authority, or, with no authority named, of the authority the point belongs to (404 where none here publishes for it). The answer says which place it is and how far away, and `status` says whether the date is inside the span the method was checked over (`certified`) or the method alone (`method-only`). With `from` and `to` the answer is `{ place, days }`.',
    params: [
      { name: 'place', description: 'A place id, as /v1/places lists them (`algeria:27`). Given: authority, lat and lng are not read.', schema: { type: 'string' } },
      authority(false, 'Whose timetable. Left out: the authority the point belongs to.'),
      lat,
      lng,
      { name: 'maxKm', description: 'With a point: answer 404 when the nearest place is farther than this.', schema: { type: 'number', exclusiveMinimum: 0 } },
      { name: 'date', description: 'The civil date at the place. Left out: today (UTC).', schema: day },
      { name: 'from', description: 'First date of a range (with `to`).', schema: day },
      { name: 'to', description: 'Last date of the range, inclusive.', schema: day },
      { name: 'asr', description: 'Which Asr: `printed` (the default) is the one the authority’s timetable prints; `shafii` (one shadow length) or `hanafi` (two) ask by name. `1` and `2` are the older spellings of `printed` and `hanafi`. The answer’s `asrShadow` says which came back.', schema: { type: 'string', enum: ['printed', 'shafii', 'hanafi', '1', '2'] } },
      { name: 'strict', description: '1 to refuse a date outside the certified span (422) instead of answering `method-only`.', schema: { type: 'string', enum: ['1'] } },
    ],
    example: '/v1/times?lat=36.75&lng=3.06&date=2026-10-15',
    answers: 'Times',
    errors: [400, 404, 422],
  },
] as const satisfies readonly RouteSpec[];

export type RoutePath = (typeof ROUTE_SPECS)[number]['path'];

/** Each route as the root lists it: the path and its parameters, the optional ones in brackets. */
export const ROUTES: readonly string[] = ROUTE_SPECS.filter(r => r.path !== '/').map(r => {
  const ps: readonly Param[] = r.params;
  const q = ps.map(p => (p.required ? `${p.name}=<${p.name}>` : `[${p.name}=<${p.name}>]`));
  return q.length ? `${r.path}?${q.join('&')}` : r.path;
});

const str = { type: 'string' };
const numb = { type: 'number' };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
const object = (properties: Record<string, unknown>, required: string[] = Object.keys(properties)) => ({ type: 'object', properties, required });

const place = object({ id: str, name: str, country: { type: 'string', description: 'ISO 3166-1 alpha-2.' }, lat: numb, lon: numb, tz: { type: 'string', description: 'IANA time zone.' } });
const found = {
  place: ref('Place'),
  distanceKm: { type: 'number', description: 'From the point asked about to the place’s own point; absent when the place was named by id.' },
  authorityFrom: { type: 'string', enum: ['request', 'location'], description: '`location`: no authority was named, and the point’s own was used.' },
};
const dayTimes = object({
  authority: { type: 'string', enum: [...AUTHORITIES] },
  placeId: str,
  date: day,
  status: { type: 'string', enum: ['certified', 'method-only'], description: '`certified`: inside the dates the method was checked against the authority’s timetable. `method-only`: outside them, the method alone.' },
  certifiedFrom: nullable(day),
  certifiedUntil: nullable(day),
  revision: { type: 'integer', description: 'The method’s revision: it rises when what the method prints changes.' },
  clock: object({ zone: nullable(str), offsetMinutes: { type: 'integer' }, label: str }),
  asrShadow: { type: 'integer', enum: [1, 2], description: 'Which Asr `times.asr` is: 1 for one shadow length (Shafi’i), 2 for two (Hanafi).' },
  times: nullable(object(Object.fromEntries(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(k => [k, ref('PrayerTime')])))),
});

const SCHEMAS: Record<string, unknown> = {
  Place: place,
  PrayerTime: object({ instant: { type: 'string', format: 'date-time', description: 'The exact moment.' }, printed: { type: 'string', pattern: '^\\d\\d:\\d\\d$', description: 'The wall-clock minute on the timetable’s clock.' },
    basis: { type: 'string', enum: ['table', 'corrected', 'method', 'unchecked'], description: 'What the time stands on. `table`: inside the certified span, the method gave the timetable’s minute unaided. `corrected`: the correction list moved it a minute onto the timetable’s minute. `method`: the method alone, the date being outside the certified span. `unchecked`: the method alone, and no column was checked for this time (the Asr the timetable does not print).' },
  }),
  DayTimes: dayTimes,
  Times: { oneOf: [{ allOf: [object(found, ['place', 'authorityFrom']), ref('DayTimes')] }, object({ ...found, days: { type: 'array', items: ref('DayTimes') } }, ['place', 'authorityFrom', 'days'])] },
  Nearest: object(found, ['place', 'distanceKm', 'authorityFrom']),
  AuthorityAt: object({ country: nullable({ type: 'string', description: 'ISO 3166-1 alpha-2, among the countries with a method here and their neighbours.' }), authority: nullable({ type: 'string', enum: [...AUTHORITIES] }), place: nullable(ref('Place')), distanceKm: nullable(numb) }),
  Places: { type: 'array', items: ref('Place') },
  Methods: { type: 'array', items: { type: 'object', description: 'As the library’s methodInfo gives it.', required: ['authority', 'name', 'revision', 'certified', 'places'] } },
  Index: { type: 'object', required: ['name', 'routes', 'authorities', 'methods'] },
  OpenApi: { type: 'object' },
  Error: object({ error: str }),
};

const ERRORS: Record<number, string> = { 400: 'A parameter is missing or not what it should be.', 404: 'No such place, or no place there.', 422: 'The date is outside the certified span, and strict=1 was asked.' };

/** The OpenAPI 3.1 description of the API. Its version is the routes' (/v1), not the library's. */
export function openapi(): Record<string, unknown> {
  const json = (schema: unknown) => ({ 'application/json': { schema } });
  const paths: Record<string, unknown> = {};
  for (const r of ROUTE_SPECS) {
    const spec: RouteSpec = r;
    paths[spec.path] = {
      get: {
        summary: spec.summary,
        ...(spec.description ? { description: spec.description } : {}),
        parameters: spec.params.map(p => ({ name: p.name, in: 'query', required: !!p.required, description: p.description, schema: p.schema })),
        responses: {
          200: { description: `For example ${spec.example}`, content: json(ref(spec.answers)) },
          ...Object.fromEntries((spec.errors ?? []).map(s => [s, { description: ERRORS[s], content: json(ref('Error')) }])),
        },
      },
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'mihrab-methods',
      version: '1',
      description:
        'The prayer-time authorities’ own calculation methods, each reproducing its published timetable to the minute. Read-only, no key, nothing logged or stored; answers may be kept for an hour. It is run without a promise of availability: an app that depends on these times should carry the library (npm, PyPI) rather than call this for every reader.',
      license: { name: 'MPL-2.0', identifier: 'MPL-2.0' },
    },
    externalDocs: { url: 'https://github.com/MihrabHQ/mihrab-methods#readme' },
    servers: [{ url: API_URL }],
    paths,
    components: { schemas: SCHEMAS },
  };
}
