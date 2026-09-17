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
 * When the city's CMS published a document, read from the `<ticks>` cache-buster its own document
 * links carry. Those ticks are a .NET timestamp: verified 2026-09-17 against the early-voting list
 * (ticks say 2026-09-02, and the city's own filename is `EV Sites 090226.pdf`) and against the
 * notice the city dates June 12, 2026 on its page. It is the only date the city gives for a
 * document it does not list beside a date; a link without usable ticks simply has no date.
 */
export function cityDocumentPublishedAt(href: string): string | undefined {
  const m = /\/home\/show(?:published)?document(?:\/\d+\/|\?id=\d+&(?:amp;)?t=)(\d{15,20})/i.exec(href);
  if (!m) return undefined;
  const ms = Number((BigInt(m[1]!) - UNIX_EPOCH_TICKS) / TICKS_PER_MS);
  const when = new Date(ms);
  const year = when.getUTCFullYear();
  if (Number.isNaN(ms) || year < 2000 || year > 2100) return undefined;
  return when.toISOString();
}

/**
 * The URL a reader should be sent to for an href on a city page: relative links resolved, the
 * CMS's `?splash=<encoded>&____isexternal=true` wrapper unwrapped, and the city's own links put on
 * https (its CMS writes some of them as `http://`, which only redirects).
 */
export function cityHref(href: string): string | undefined {
  // An empty href would resolve to the city's home page; a button with no link has no URL at all.
  if (!href.trim()) return undefined;
  let url: URL;
  try {
    url = new URL(href, CITY_SITE);
  } catch {
    return undefined;
  }
  const splash = url.hostname.endsWith('cityoflaredo.com') ? url.searchParams.get('splash') : null;
  if (splash) return cityHref(splash);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  if (url.hostname === 'www.cityoflaredo.com' || url.hostname === 'cityoflaredo.com') {
    url.protocol = 'https:';
    url.hostname = 'www.cityoflaredo.com';
  }
  return url.toString();
}
