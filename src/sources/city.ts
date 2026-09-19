import { fromCentral } from '../dates.js';

/** Shared by the City of Laredo govAccess adapters (Newsroom, Calendar, Bids, Elections). */
export const CITY_SITE = 'https://www.cityoflaredo.com';

/** Collapses runs of whitespace the way a browser renders them. */
export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * The city's document store. `/home/showpublisheddocument/<id>/<ticks>` and
 * `/home/showdocument?id=<id>&t=<ticks>` are two spellings of the same store: `<id>` is the stable
 * key and `<ticks>` is a cache-buster, so identity drops it (issue 02, verified 2026-09-17).
 */
export function cityDocumentId(href: string): string | undefined {
  const m = /\/home\/show(?:published)?document(?:\/|\?id=)(\d+)/i.exec(href);
  return m?.[1];
}

/** Ticks per millisecond, and the .NET epoch (0001-01-01) as ticks at the Unix epoch. */
const TICKS_PER_MS = 10_000n;
const UNIX_EPOCH_TICKS = 621_355_968_000_000_000n;

/**
 * When the city's CMS posted a document, from the `<ticks>` its own document links carry. This is
 * the CMS's stamp, not a date the city prints: where the city prints a date beside a link, that
 * printed date is the Publisher's date and wins. It is used only for a document the city posts with
 * no date at all, such as its lists of voting sites.
 *
 * The ticks are a .NET `DateTime` of the city's own wall clock, which is Central: across the 569
 * document links in the recorded election and finance fixtures they fall between 07:00 and 19:00
 * read as Central, and between 01:00 and 14:00 read as UTC, so they are read as Central here
 * (checked 2026-09-17). The one document that can be cross-checked agrees: the early-voting list
 * stamps 2026-09-02 and the city's own filename for it is `EV Sites 090226.pdf`.
 */
export function cityDocumentPostedAt(href: string): string | undefined {
  const m = /\/home\/show(?:published)?document(?:\/\d+\/|\?id=\d+&(?:amp;)?t=)(\d{15,20})/i.exec(href);
  if (!m) return undefined;
  const wall = new Date(Number((BigInt(m[1]!) - UNIX_EPOCH_TICKS) / TICKS_PER_MS));
  if (Number.isNaN(wall.getTime())) return undefined;
  const year = wall.getUTCFullYear();
  if (year < 2000 || year > 2100) return undefined;
  return fromCentral(wall.toISOString().slice(0, 10), wall.toISOString().slice(11, 16)).toISOString();
}

/**
 * The URL a reader should be sent to for an href on a city page: relative links resolved, the
 * CMS's `?splash=<encoded>&____isexternal=true` wrapper unwrapped, and the city's own links put on
 * https (its CMS writes some of them as `http://`, which only redirects).
 *
 * The hostname is the city's to choose and is left as the city wrote it. The city runs more than
 * one host under its own domain — `click2gov.cityoflaredo.com` is its payments portal — and sending
 * a reader to `www` instead lands them on a 404 (branch review finding 4). The one exception is the
 * bare domain, which the city's own site answers by redirecting to `www`.
 */
export function cityHref(href: string, depth = 0): string | undefined {
  // An empty href would resolve to the city's home page; a button with no link has no URL at all.
  if (!href.trim() || depth > 4) return undefined;
  let url: URL;
  try {
    url = new URL(href, CITY_SITE);
  } catch {
    return undefined;
  }
  const splash = isCityHost(url.hostname) ? url.searchParams.get('splash') : null;
  if (splash) return cityHref(splash, depth + 1);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  if (isCityHost(url.hostname)) {
    url.protocol = 'https:';
    if (url.hostname === 'cityoflaredo.com') url.hostname = 'www.cityoflaredo.com';
  }
  return url.toString();
}

/** The city's own host, and only it: `evilcityoflaredo.com` is not the City of Laredo. */
function isCityHost(hostname: string): boolean {
  return hostname === 'cityoflaredo.com' || hostname.endsWith('.cityoflaredo.com');
}
