/** Shared by the City of Laredo govAccess adapters (Newsroom, Calendar, Bids). */
export const CITY_SITE = 'https://www.cityoflaredo.com';

/** Collapses runs of whitespace the way a browser renders them. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
