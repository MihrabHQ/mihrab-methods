/**
 * mihrab-methods — the prayer-time authorities' own methods, each
 * reproducing its published timetable to the minute: Sweden (Diyanet's
 * method, as Islamiska Förbundet prints it), Diyanet worldwide, Morocco
 * (Habous), Algeria (the Ministry of Religious Affairs) and Indonesia
 * (Kemenag). This entry loads all five; `mihrab-methods/<authority>` loads
 * one, with only its data.
 *
 *   import { placesOf, nearestPlace, timesFor } from 'mihrab-methods';
 *   const { place } = nearestPlace('algeria', 36.75, 3.06)!;
 *   timesFor(place, '2026-10-15');
 */
import './authorities/sweden.js';
import './authorities/diyanet.js';
import './authorities/morocco.js';
import './authorities/algeria.js';
import './authorities/indonesia.js';

export * from './core/index.js';
export { diyanetCountry } from './authorities/diyanet.js';
