/** Islamiska Förbundet's file names for its cities (the Swedish places' keys). */
export function citySlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[àáâã]/g, 'a')
    .replace(/[å]/g, 'a')
    .replace(/[ä]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[ø]/g, 'o')
    .replace(/[é]/g, 'e')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
