/**
 * Türkiye Takvimi — the calendar's method, as the year it publishes for a
 * city is computed (namazvakti.com).
 *
 * Read off the calendar's own years (cities from 42°S to 60°N):
 *
 *   • the precise apparent sun, taken at each event's own moment (iterated);
 *   • a temkin T per city, in minutes with its fraction: the time the sun
 *     takes on the summer solstice (declination 23.38°) to go from the
 *     level horizon down to the city's own, which depends on the height the
 *     calendar gives the city (250 m or 500 m). A place carries the T its
 *     table shows (`Place.temkin`); `takvimTemkin` is the formula;
 *   • İmsâk the sun 19° below the horizon, less T, rounded DOWN;
 *   • Sabâh — the time the calendar prints for the Fajr prayer — the sun at
 *     18°, with no temkin;
 *   • sunrise the sun's centre on the level horizon (0°, no refraction),
 *     less T and two minutes;
 *   • Dhuhr the transit plus T; Asr and Isha (17°) plus T;
 *   • Asr's shadow the object's length plus the noon shadow at the
 *     declination of local noon, the hour angle from the sun at Asr itself;
 *   • Maghrib the sun's centre on the level horizon, plus T and two minutes;
 *   • everything but İmsâk rounded UP to the minute.
 *
 * Where the sun no longer gets 19° below the horizon (north of about 47.5°
 * in summer) the calendar holds İmsâk, Sabâh and Isha at the times of the
 * last night it did; `heldNight` is that rule. No place of the certified
 * list is that far north, so the list does not hold the rule to a table.
 *
 * The calendar's files give a city's point to the whole arc-minute and the
 * calendar computes at a finer one; each place is at the point its year
 * shows (data/places/turkiyeTakvimiCities.json).
 */
import { preciseApparentSun } from '../sun/preciseSun.js';

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;

export type TakvimInstants = {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
};

/** The declination the temkin's solstice is taken at, degrees. */
const SOLSTICE_DECLINATION = 23.38;
/** Minutes on sunrise and Maghrib beyond the temkin. */
const HORIZON_MARGIN = 2;
/** Days to look back for a night that reached 19°. */
const HOLD_SEARCH_DAYS = 200;

/** The depression of a city's horizon below the level one, degrees, for the calendar's height of the city. */
function horizonDepth(heightM: number): number {
  return 0.8416 + 0.03924 * Math.sqrt(Math.max(0, heightM));
}

/**
 * The calendar's temkin by its formula, minutes: the time the sun takes on
 * the summer solstice at this latitude to go from the level horizon to the
 * city's own. A listed place carries its own (`Place.temkin`), which strays
 * from this by a few hundredths of a minute.
 */
export function takvimTemkin(latitude: number, heightM = 250): number {
  const phi = Math.min(Math.abs(latitude), 62) * RAD;
  const dec = SOLSTICE_DECLINATION * RAD;
  const hourAngle = (alt: number) =>
    Math.acos(Math.max(-1, Math.min(1, (Math.sin(alt * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)))));
  return ((hourAngle(-horizonDepth(heightM)) - hourAngle(0)) / RAD) * 4;
}

/** Whole days since 1970-01-01 of a civil date (month 0-based). */
const dayKeyOf = (year: number, month: number, day: number) => Math.round(Date.UTC(year, month, day) / DAY_MS);
/** Days from J2000.0 (noon) of a day's 00:00 UT. */
const d0Of = (key: number) => key - 10957 - 0.5;

/** The sun's events of a day at a point, minutes past the day's 00:00 UT; NaN where one does not happen. */
function events(latitude: number, longitude: number, key: number) {
  const d0 = d0Of(key);
  const at = (t: number) => preciseApparentSun(d0 + t / 1440);
  let noon = 720 - 4 * longitude;
  for (let i = 0; i < 3; i++) noon = 720 - 4 * longitude - at(noon).eot;
  const noonDec = at(noon).dec;
  const sp = Math.sin(latitude * RAD);
  const cp = Math.cos(latitude * RAD);
  const event = (alt: number, sign: 1 | -1, start: number) => {
    let t = start;
    for (let i = 0; i < 3; i++) {
      const { dec, eot } = at(t);
      const c = (Math.sin(alt * RAD) - sp * Math.sin(dec)) / (cp * Math.cos(dec));
      if (!(Math.abs(c) <= 1)) return NaN;
      t = 720 - 4 * longitude - eot + (sign * 4 * Math.acos(c)) / RAD;
    }
    return t;
  };
  return {
    noon,
    at19: () => event(-19, -1, noon - 420),
    at18: () => event(-18, -1, noon - 420),
    sunrise: () => event(0, -1, noon - 360),
    asr: (shadow: number) => event(Math.atan(1 / (shadow + Math.tan(Math.abs(latitude * RAD - noonDec)))) / RAD, 1, noon + 200),
    sunset: () => event(0, 1, noon + 360),
    at17: () => event(-17, 1, noon + 420),
  };
}

/**
 * Does the sun get 19° below the horizon in the night that ends on the
 * morning of the day? The calendar counts it as reaching when its lowest
 * point does at the declination of either of two moments: the local solar
 * midnight that begins the day, or 12:00 UT of the day.
 */
function reaches19(latitude: number, longitude: number, key: number): boolean {
  const d0 = d0Of(key);
  const lowest = (d: number) => Math.abs(latitude + preciseApparentSun(d).dec / RAD) - 90;
  return Math.min(lowest(d0 - longitude / 360), lowest(d0 + 0.5)) <= -19;
}

/** The day whose night times stand for this one: itself, or the last before it whose night reached 19°. */
export function heldNight(latitude: number, longitude: number, key: number): number {
  for (let i = 0; i <= HOLD_SEARCH_DAYS; i++) if (reaches19(latitude, longitude, key - i)) return key - i;
  return key;
}

/**
 * The calendar's times before rounding, minutes past 00:00 UT of the date
 * (month 0-based): the six the library gives, and İmsâk. A held night's
 * times are that night's time of day, on this date.
 */
export function takvimRawMinutes(
  latitude: number,
  longitude: number,
  year: number,
  month: number,
  day: number,
  temkin: number = takvimTemkin(latitude),
  asrShadow = 1,
): { imsak: number; fajr: number; sunrise: number; dhuhr: number; asr: number; maghrib: number; isha: number } {
  const key = dayKeyOf(year, month, day);
  const today = events(latitude, longitude, key);
  const night = heldNight(latitude, longitude, key);
  const nightSun = night === key ? today : events(latitude, longitude, night);
  // Isha belongs to the night that begins this evening: it is tomorrow's night that decides,
  // and a held Isha is that of the evening before the last night that reached 19°.
  const ishaNight = heldNight(latitude, longitude, key + 1);
  const ishaDay = ishaNight === key + 1 ? key : ishaNight - 1;
  const ishaSun = ishaDay === key ? today : events(latitude, longitude, ishaDay);
  return {
    imsak: nightSun.at19() - temkin,
    fajr: nightSun.at18(),
    sunrise: today.sunrise() - temkin - HORIZON_MARGIN,
    dhuhr: today.noon + temkin,
    asr: today.asr(asrShadow) + temkin,
    maghrib: today.sunset() + temkin + HORIZON_MARGIN,
    isha: ishaSun.at17() + temkin,
  };
}

/** Up to the minute, as the calendar rounds everything but İmsâk. */
const up = (m: number) => Math.ceil(m - 1e-9);

/**
 * The calendar's İmsâk for the date, on the minute (rounded down), or null
 * where it does not form. Not one of the six times the library certifies.
 */
export function takvimImsak(latitude: number, longitude: number, year: number, month: number, day: number, temkin?: number): Date | null {
  const m = takvimRawMinutes(latitude, longitude, year, month, day, temkin).imsak;
  return Number.isFinite(m) ? new Date(Date.UTC(year, month, day) + Math.floor(m + 1e-9) * 60_000) : null;
}

/**
 * Türkiye Takvimi's times for the civil date (month 0-based) at the point,
 * each on the minute the calendar prints; Fajr is its Sabâh. Null where a
 * time does not form.
 */
export function takvimTimes(
  latitude: number,
  longitude: number,
  year: number,
  month: number,
  day: number,
  temkin?: number,
  asrShadow = 1,
): TakvimInstants | null {
  const r = takvimRawMinutes(latitude, longitude, year, month, day, temkin, asrShadow);
  const all = [r.fajr, r.sunrise, r.dhuhr, r.asr, r.maghrib, r.isha];
  if (!all.every(Number.isFinite)) return null;
  const start = Date.UTC(year, month, day);
  const at = (m: number) => new Date(start + up(m) * 60_000);
  return { fajr: at(r.fajr), sunrise: at(r.sunrise), dhuhr: at(r.dhuhr), asr: at(r.asr), maghrib: at(r.maghrib), isha: at(r.isha) };
}
