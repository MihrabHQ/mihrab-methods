/**
 * What each authority's entry point brings: its places, its correction
 * list, its certification and its description. `mihrab-methods/indonesia`
 * registers Indonesia and nothing else, so an app ships only the data it
 * uses; `mihrab-methods` registers all five.
 */
import type { Authority, Certification, CorrectionsFile, MethodInfo, Place } from './types.js';
import { CorrectionList } from './correctionList.js';

export type MethodDescription = Pick<MethodInfo, 'name' | 'method' | 'countries' | 'parameters' | 'sources' | 'spec'>;

export type AuthorityData = {
  authority: Authority;
  revision: number;
  places: readonly Place[];
  corrections: CorrectionList;
  certification: Certification | null;
  description: MethodDescription;
};

const registry = new Map<Authority, AuthorityData>();

export function registerAuthority(entry: {
  authority: Authority;
  revision: number;
  places: Place[];
  corrections: CorrectionsFile;
  certification: Certification | null;
  description: MethodDescription;
}): AuthorityData {
  const have = registry.get(entry.authority);
  if (have) return have;
  // Frozen: every caller shares these objects, and a place moved by one
  // (`place.lat = …`) would move the corrections it is looked up by for all.
  for (const p of entry.places) Object.freeze(p);
  Object.freeze(entry.places);
  const data: AuthorityData = { ...entry, corrections: new CorrectionList(entry.corrections) };
  registry.set(entry.authority, data);
  return data;
}

export function authorityData(authority: Authority): AuthorityData {
  const data = registry.get(authority);
  if (!data) {
    throw new Error(
      `The ${authority} method is not loaded: import 'mihrab-methods/${authority}' (or 'mihrab-methods' for all of them) first.`,
    );
  }
  return data;
}

export function loadedAuthorities(): Authority[] {
  return [...registry.keys()];
}

export function isLoaded(authority: Authority): boolean {
  return registry.has(authority);
}
