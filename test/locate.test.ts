/** Which authority a point belongs to: by the country's outline, the side of the border it is on. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryAt, defaultAuthorityFor } from '../src/locate.js';
import '../src/morocco.js';
import '../src/tatarstan.js';
import '../src/cdum.js';
import '../src/wifaq.js';

test('countryAt answers the country, border towns included', () => {
  assert.equal(countryAt(59.3293, 18.0686), 'SE'); // Stockholm
  assert.equal(countryAt(65.8356, 24.1364), 'SE'); // Haparanda
  assert.equal(countryAt(65.85, 24.17), 'FI'); // Tornio, across the river
  assert.equal(countryAt(35.8894, -5.3213), 'ES'); // Ceuta
  assert.equal(countryAt(27.15, -13.2), 'MA'); // Laayoune, Western Sahara
  assert.equal(countryAt(35.3417, 33.3197), 'TR'); // Kyrenia, Northern Cyprus
  assert.equal(countryAt(34.68, 33.04), 'CY'); // Limassol
  assert.equal(countryAt(1.3521, 103.8198), 'SG');
  assert.equal(countryAt(48.8566, 2.3522), null); // Paris: no method here, no neighbour
  assert.equal(countryAt(NaN, 0), null);
});

test('defaultAuthorityFor: the authority whose table the community prays by', () => {
  assert.equal(defaultAuthorityFor(59.3293, 18.0686), 'sweden');
  assert.equal(defaultAuthorityFor(65.85, 24.17), null); // Tornio: Finland has no method here
  assert.equal(defaultAuthorityFor(33.5731, -7.5898), 'morocco'); // Casablanca
  assert.equal(defaultAuthorityFor(35.8894, -5.3213), 'morocco'); // Ceuta: the ministry lists it
  assert.equal(defaultAuthorityFor(36.7538, 3.0588), 'algeria');
  assert.equal(defaultAuthorityFor(-6.2088, 106.8456), 'indonesia');
  assert.equal(defaultAuthorityFor(41.0082, 28.9784), 'diyanet'); // Istanbul
  assert.equal(defaultAuthorityFor(35.3417, 33.3197), 'diyanet'); // Kyrenia, Northern Cyprus
  assert.equal(defaultAuthorityFor(43.24, 76.89), 'kazakhstan'); // Almaty
  assert.equal(defaultAuthorityFor(30.04, 31.24), 'egypt');
  assert.equal(defaultAuthorityFor(4.9, 114.94), 'brunei');
  assert.equal(defaultAuthorityFor(4.4, 113.99), null); // Miri, Malaysia, 30 km from Brunei
  assert.equal(defaultAuthorityFor(25.29, 51.53), 'qatar');
  assert.equal(defaultAuthorityFor(29.37, 47.98), 'kuwait');
  assert.equal(defaultAuthorityFor(30.11, 47.72), null); // Safwan, Iraq, at Kuwait's border
  assert.equal(defaultAuthorityFor(32.56, 36.01), 'jordan'); // Ramtha
  assert.equal(defaultAuthorityFor(32.62, 36.1), null); // Daraa, Syria, across from it
  assert.equal(defaultAuthorityFor(41.33, 19.82), 'albania');
  assert.equal(defaultAuthorityFor(43.85, 25.95), 'bulgaria'); // Ruse
  assert.equal(defaultAuthorityFor(43.89, 25.97), null); // Giurgiu, Romania, across the Danube
  assert.equal(defaultAuthorityFor(31.55, 74.34), 'banuri'); // Lahore
  assert.equal(defaultAuthorityFor(31.63, 74.87), null); // Amritsar
  assert.equal(defaultAuthorityFor(24.2, 55.76), 'uae'); // Al Ain
  assert.equal(defaultAuthorityFor(24.25, 55.79), null); // Buraimi, Oman, the same town's other half
  assert.equal(defaultAuthorityFor(35.69, 51.39), 'tehran');
  assert.equal(defaultAuthorityFor(36.8, 10.18), 'tunisia'); // Tunis
  assert.equal(defaultAuthorityFor(33.92, 8.13), 'tunisia'); // Tozeur
  assert.equal(defaultAuthorityFor(36.37, 6.61), 'algeria'); // Constantine, across the border
  // Russia: by the place listed, not the country
  assert.equal(defaultAuthorityFor(55.79, 49.12), 'tatarstan'); // Kazan
  assert.equal(defaultAuthorityFor(55.75, 37.62), 'cdum'); // Moscow
  assert.equal(defaultAuthorityFor(69.35, 88.2), null); // Norilsk: neither lists it
  // Britain: by the town listed
  assert.equal(defaultAuthorityFor(53.48, -2.24), 'wifaq'); // Manchester
  assert.equal(defaultAuthorityFor(57.48, -4.22), null); // Inverness: no town of the timetables near
  assert.equal(defaultAuthorityFor(52.52, 13.405), null); // Berlin: Diyanet has a table, but is not Germany's authority
});
