/** Date helpers. Publishers are in Central time (America/Chicago); the data file stores ISO strings. */
import type { Lang } from './domain.js';

export const TIME_ZONE = 'America/Chicago';

const ymdFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

/** Central-time calendar date (`YYYY-MM-DD`) of an instant. */
export function centralDate(instant: Date): string {
  return ymdFormat.format(instant);
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The `YYYY-MM-DD` part of any ISO date or timestamp, in Central time for timestamps. */
export function dayOf(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso.slice(0, 10) : centralDate(parsed);
}

/** Milliseconds for ordering; date-only values sort as Central midnight. */
export function sortValue(iso: string): number {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return centralMidnight(iso).getTime();
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Central-time midnight of a calendar date, as an instant. */
export function centralMidnight(ymd: string): Date {
  return fromCentral(ymd, '00:00');
}

/**
 * Builds an instant from a Central-time wall clock (`YYYY-MM-DD`, `HH:mm`),
 * resolving daylight saving by asking Intl what offset applies.
 */
export function fromCentral(ymd: string, hm: string): Date {
  const guess = new Date(`${ymd}T${hm}:00Z`);
  const offset = centralOffsetMinutes(guess);
  const instant = new Date(guess.getTime() - offset * 60_000);
  const offset2 = centralOffsetMinutes(instant);
  return offset2 === offset ? instant : new Date(guess.getTime() - offset2 * 60_000);
}

function centralOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Parses the city's `MM/DD/YYYY[ h:mm AM/PM]` into an ISO date or Central timestamp. */
export function parseUsDateTime(text: string): { iso: string; ymd: string; time?: string } | undefined {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?/i.exec(text);
  if (!m) return undefined;
  const ymd = `${m[3]}-${m[1]!.padStart(2, '0')}-${m[2]!.padStart(2, '0')}`;
  if (!m[4]) return { iso: ymd, ymd };
  const hm = to24h(Number(m[4]), Number(m[5]), m[6]!);
  return { iso: fromCentral(ymd, hm).toISOString(), ymd, time: `${m[4]}:${m[5]} ${m[6]!.toUpperCase()}` };
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/**
 * Parses a Publisher's written-out date, with or without a weekday: "Monday, November 03, 2025",
 * "August 21, 2026". Returns the Central-time calendar date, or undefined when the text has none.
 */
export function parseMonthNameDate(text: string): string | undefined {
  const m = /([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/.exec(text);
  if (!m) return undefined;
  const month = MONTHS.findIndex((name) => name.startsWith(m[1]!.toLowerCase()));
  if (month < 0) return undefined;
  const day = Number(m[2]);
  if (day < 1 || day > 31) return undefined;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "5:30 PM" -> "17:30" */
export function to24h(hour12: number, minute: number, ampm: string): string {
  let h = hour12 % 12;
  if (ampm.toUpperCase() === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function parseClock(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const m = /(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(text);
  return m ? to24h(Number(m[1]), Number(m[2]), m[3]!) : undefined;
}

export function daysBetween(fromIso: string, toIso: string): number {
  return (sortValue(toIso) - sortValue(fromIso)) / 86_400_000;
}

/** Wednesday, September 30, 2026 style, per language, Central time. */
export function formatDate(lang: Lang, iso: string, style: 'long' | 'short' = 'long'): string {
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  const opts: Intl.DateTimeFormatOptions =
    style === 'long'
      ? { timeZone: TIME_ZONE, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
      : { timeZone: TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, opts).format(instantOf(iso));
}

export function formatTime(lang: Lang, iso: string): string {
  const locale = lang === 'es' ? 'es-MX' : 'en-US';
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

function instantOf(iso: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? centralMidnight(iso) : new Date(iso);
}

export function hasTime(iso: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(iso);
}

export function rfc822(iso: string): string {
  return instantOf(iso).toUTCString();
}
