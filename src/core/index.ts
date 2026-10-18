/**
 * The library without any authority's data: the calls, the types, the sun.
 * Load an authority (`mihrab-methods/<authority>`, or `mihrab-methods` for
 * all) before calling anything that needs its places or its list.
 */
export {
  candidateTimes,
  certificationOf,
  certifiedSpan,
  distanceKm,
  isCertified,
  loadedAuthorityIds,
  methodInfo,
  nearestPlace,
  placeById,
  placesOf,
  timesFor,
  timesForRange,
  type NearestPlace,
} from './api.js';
export { candidateInstants, type ComputeOptions } from './compute.js';
export { parseCivilDate, isoOf } from './civilDate.js';
export { placeClockAt, clockOffsetAt, tableClockAt, printedAt } from './clock.js';
export { fetchLatestCorrections, applyCorrections, type FetchOptions, type FetchResult } from './fetchLatest.js';
export { isCorrectionsFile, pointKey } from './correctionList.js';
export { METHOD_REVISION } from '../methods/revisions.js';
export { preciseApparentSun } from '../sun/preciseSun.js';
export {
  AUTHORITIES,
  PRAYER_KEYS,
  UncertifiedMethodError,
  type Authority,
  type Certification,
  type CheckRecord,
  type CivilDate,
  type CorrectionsFile,
  type DayStatus,
  type DayTimes,
  type Instants,
  type MethodInfo,
  type Place,
  type PrayerKey,
  type PrayerTime,
  type TableClock,
  type TimesOptions,
} from './types.js';
