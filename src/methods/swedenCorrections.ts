/**
 * The Congress method's last minutes: Sweden's (about one time in five
 * thousand, at Diyanet's Swedish points and Islamiska Förbundet's towns) and
 * Diyanet's worldwide (at its points beyond Sweden). See `correctionList.ts`.
 */
import path from 'node:path';
import { CorrectionList, pointKey, type CorrectionsFile, type PrayerKey } from './correctionList';

export { pointKey, type PrayerKey };
/** Kept for the Sweden-only name. */
export type SwedenCorrections = CorrectionsFile;

const DIR = path.join(__dirname, '..', '..', 'data', 'corrections');
export const CORRECTIONS_FILE = path.join(DIR, 'sweden.json');
export const DIYANET_CORRECTIONS_FILE = path.join(DIR, 'diyanet.json');
export const MOROCCO_CORRECTIONS_FILE = path.join(DIR, 'morocco.json');
export const ALGERIA_CORRECTIONS_FILE = path.join(DIR, 'algeria.json');
export const INDONESIA_CORRECTIONS_FILE = path.join(DIR, 'indonesia.json');

const sweden = new CorrectionList(CORRECTIONS_FILE);
const diyanet = new CorrectionList(DIYANET_CORRECTIONS_FILE);
const morocco = new CorrectionList(MOROCCO_CORRECTIONS_FILE);
const algeria = new CorrectionList(ALGERIA_CORRECTIONS_FILE);
const indonesia = new CorrectionList(INDONESIA_CORRECTIONS_FILE);

export function swedenCorrection(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  return sweden.correction(lat, lon, year, month, day);
}
export function swedenCorrectionsCoverage(): { from: string; to: string } | null {
  return sweden.coverage();
}
export function _reloadSwedenCorrections(): void {
  sweden.reload();
}

export function diyanetCorrection(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  return diyanet.correction(lat, lon, year, month, day);
}
export function diyanetCorrectionsCoverage(): { from: string; to: string } | null {
  return diyanet.coverage();
}
export function _reloadDiyanetCorrections(): void {
  diyanet.reload();
}

/** Morocco: the ministry's few times on the other side of a minute's rounding (`data/corrections/morocco.json`). */
export function moroccoCorrection(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  return morocco.correction(lat, lon, year, month, day);
}
export function moroccoCorrectionsCoverage(): { from: string; to: string } | null {
  return morocco.coverage();
}

/** Algeria: the ministry's few times on the other side of a minute's rounding (`data/corrections/algeria.json`). */
export function algeriaCorrection(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  return algeria.correction(lat, lon, year, month, day);
}
export function algeriaCorrectionsCoverage(): { from: string; to: string } | null {
  return algeria.coverage();
}

/** Indonesia: Kemenag's few times on the other side of a minute's rounding (`data/corrections/indonesia.json`). */
export function indonesiaCorrection(lat: number, lon: number, year: number, month: number, day: number): Partial<Record<PrayerKey, number>> | undefined {
  return indonesia.correction(lat, lon, year, month, day);
}
export function indonesiaCorrectionsCoverage(): { from: string; to: string } | null {
  return indonesia.coverage();
}
