/**
 * The shapes the library speaks in. Nothing here computes anything.
 */

export type Authority = 'sweden' | 'diyanet' | 'morocco' | 'algeria' | 'indonesia';
export const AUTHORITIES: readonly Authority[] = ['sweden', 'diyanet', 'morocco', 'algeria', 'indonesia'];

export type PrayerKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export const PRAYER_KEYS: readonly PrayerKey[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** A place an authority publishes a table for, at the point its method is computed at. */
export type Place = {
  authority: Authority;
  /**
   * A stable identifier: `<authority>:<key>`, where the key is the
   * authority's own number for the place (Diyanet's, the ministries') or,
   * for Sweden, Islamiska Förbundet's slug of its name. It does not change
   * between versions.
   */
  id: string;
  /** The authority's own key for the place (the part of `id` after the colon). */
  key: string;
  name: string;
  /** ISO 3166-1 alpha-2 of the country the table is for. */
  country: string;
  lat: number;
  lon: number;
  /** The IANA zone the authority prints the place's table in. */
  tz: string;
  /** Morocco: the horizon's dip, degrees (fitted, or 0.02°·√height) — eastward, at sunrise. */
  dipDeg?: number;
  /** Morocco: the horizon's dip westward, at Maghrib (fitted per city). */
  dipMaghribDeg?: number;
  /** Indonesia: Kemenag's highland class (sunrise and Maghrib at −2°). */
  highland?: boolean;
  /** Indonesia: the highland degree on Fajr and Isha too (six regencies of Papua). */
  twilightDip?: boolean;
  /** Indonesia: where the ministry computes the regency's Asr, Maghrib and Isha, when not at its point. */
  afternoon?: readonly [number, number];
  /** Diyanet: Isha's depression, 16° or 17° by country. */
  ishaDeg?: number;
  /**
   * Diyanet in Türkiye and Northern Cyprus: each prayer is computed at a point
   * of its own, and the points move by a few thousandths of a degree from one
   * year's tables to the next — year → [fajr, sunrise, dhuhr, asr, maghrib, isha]
   * as [lat, lon]. `lat`/`lon` are the district's own point (its sunrise).
   */
  prayerPoints?: Record<string, [number, number][]>;
  /**
   * A table printed on a clock no zone keeps (Diyanet's for Alberta, with
   * summer time into December; Morocco's on GMT+1 until September 2026):
   * the clock read off the table itself, [from date, minutes east of UTC], in
   * place of `tz`. The instants are the method's; only the labels differ.
   */
  clock?: [string, number][];
};

/** The six instants of a day, each on the minute the authority prints. */
export type Instants = { fajr: Date; sunrise: Date; dhuhr: Date; asr: Date; maghrib: Date; isha: Date };

/**
 * A method's correction list: the few times its authority's program puts on
 * the other side of a minute's rounding point. "lat,lon" (three decimals) →
 * "YYYY-MM-DD prayer ±1". See schemas/corrections.schema.json.
 */
export type CorrectionsFile = {
  from: string;
  to: string;
  points: Record<string, string[]>;
};

export type CheckRecord = {
  /** The tables checked: Islamiska Förbundet's or Diyanet's own for Sweden, the authority's for the rest. */
  tables: string;
  places: number;
  times: number;
  /** Times not on the printed minute. Certified only at 0. */
  off: number;
  from: string;
  to: string;
  /** What the check set aside as the source's fault, not the method's: listed so it can be judged. */
  setAside?: { misplaced: string[]; sourceFaults: number; copiedRows: number };
};

/** One authority's entry in certification.json. See schemas/certification.schema.json. */
export type Certification = {
  certified: boolean;
  checkedAt: string;
  checks: CheckRecord[];
  /**
   * The correction list this certification is for: the dates it covers, how
   * many times it moves, and the SHA-256 of the file as published. An app
   * holding a list with another `to` or count holds another list.
   */
  corrections?: { from: string; to: string; entries: number; sha256?: string };
  /** The method's revision (`src/methods/revisions.ts`) the list is for. */
  revision?: number;
};

/** A civil date: 'YYYY-MM-DD', or { year, month, day } with January = 1. */
export type CivilDate = string | { year: number; month: number; day: number };

/** One prayer's time: the exact moment, and the wall-clock minute the authority prints. */
export type PrayerTime = {
  instant: Date;
  /** 'HH:MM' on the table's clock (`DayTimes.clock`). */
  printed: string;
};

/** The clock a day's times are printed in. */
export type TableClock = {
  /** The IANA zone, or null where the table keeps a clock no zone does. */
  zone: string | null;
  /** Minutes east of UTC on this date. */
  offsetMinutes: number;
  /** The zone's name, or 'UTC+01:00' where there is none. */
  label: string;
};

export type DayStatus =
  /** The date lies within the span the method was certified over: the authority's printed minute. */
  | 'certified'
  /** Outside that span: the method alone, on the printed minute all but rarely, never a minute further. */
  | 'method-only'
  /** The method does not yet reproduce every time of its authority's tables (`candidateTimes` only). */
  | 'uncertified';

export type DayTimes = {
  authority: Authority;
  placeId: string;
  /** 'YYYY-MM-DD' */
  date: string;
  status: DayStatus;
  /** The span the method is certified over, or null for an uncertified method. */
  certifiedFrom: string | null;
  certifiedUntil: string | null;
  /** The method's revision that computed this. */
  revision: number;
  clock: TableClock;
  /** Null on a day the method gives no times for the place. */
  times: Record<PrayerKey, PrayerTime> | null;
};

export type TimesOptions = {
  /** 2 for the Hanafi Asr; the tables print the standard one (1). */
  asrShadow?: 1 | 2;
  /** Throw `UncertifiedMethodError` for a date outside the certified span, instead of returning `status: 'method-only'`. */
  strict?: boolean;
};

/** What `methodInfo` says about a method. */
export type MethodInfo = {
  authority: Authority;
  /** The authority, in words. */
  name: string;
  /** The method, in a sentence. */
  method: string;
  /** ISO 3166-1 alpha-2 of the countries the authority's tables cover (Diyanet: many). */
  countries: string[];
  revision: number;
  certified: boolean;
  /** The certification record, as in certification.json. */
  certification: Certification | null;
  /** The correction list this build carries. */
  corrections: { from: string; to: string; entries: number };
  /** How many places this build knows for the authority. */
  places: number;
  /** The method's parameters, in words and numbers. */
  parameters: Record<string, string | number | boolean>;
  /** Where the authority publishes the tables the method was fitted to. */
  sources: { title: string; url: string }[];
  /** The method's own documentation. */
  spec: string;
};

/** The method has not reproduced its authority's tables to the minute (or not for this date). */
export class UncertifiedMethodError extends Error {
  constructor(readonly authority: string, readonly date?: string) {
    super(
      date
        ? `The ${authority} method is certified only for the dates it was checked over, and ${date} is outside them (see certification.json).`
        : `The ${authority} method is not certified: it does not yet reproduce every time of the authority's tables on the printed minute (see certification.json).`,
    );
    this.name = 'UncertifiedMethodError';
  }
}
