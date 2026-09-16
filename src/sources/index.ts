import { cityBids } from './city-bids.js';
import { cityCalendar } from './city-calendar.js';
import { cityNewsroom } from './city-newsroom.js';
import { laredoUtilities } from './laredo-utilities.js';
import { legistar } from './legistar.js';
import type { SourceAdapter } from './types.js';

/**
 * Every Feed the site ingests, in run order. Legistar runs first so the calendar adapter
 * can recognise a Body's Meeting in the same build. Adding a Source means adding one adapter here.
 */
export const SOURCES: readonly SourceAdapter[] = [legistar, laredoUtilities, cityNewsroom, cityCalendar, cityBids];

export function sourceById(id: string): SourceAdapter | undefined {
  return SOURCES.find((s) => s.id === id);
}
