/** Which authority a point belongs to: by the country's outline, the side of the border it is on. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countryAt, defaultAuthorityFor } from '../src/locate.js';
import '../src/morocco.js';

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
  assert.equal(defaultAuthorityFor(52.52, 13.405), null); // Berlin: Diyanet has a table, but is not Germany's authority
});
