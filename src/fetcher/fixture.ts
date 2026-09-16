import { readFile } from 'node:fs/promises';
import { FetchError, type Fetcher, type FetchMode, type FetchResponse } from './types.js';

export type FixtureBody = string | { file: string } | { status: number; body?: string } | { throws: string };

/**
 * Serves recorded responses keyed by URL. A key ending in `*` matches any URL with that prefix.
 * A URL with no fixture is a hard failure, so a test can never silently reach the network.
 */
export function fixtureFetcher(map: Record<string, FixtureBody>): Fetcher & { requests: { url: string; mode: FetchMode }[] } {
  const requests: { url: string; mode: FetchMode }[] = [];
  return {
    requests,
    async fetch(url, mode) {
      requests.push({ url, mode });
      const entry = map[url] ?? wildcard(map, url);
      if (entry === undefined) throw new FetchError(`No fixture recorded for ${url}`, url);
      if (typeof entry === 'string') return { url, status: 200, body: entry };
      if ('throws' in entry) throw new Error(entry.throws);
      if ('file' in entry) return { url, status: 200, body: await readFile(entry.file, 'utf8') };
      return { url, status: entry.status, body: entry.body ?? '' };
    },
    async close() {},
  };
}

function wildcard(map: Record<string, FixtureBody>, url: string): FixtureBody | undefined {
  for (const [key, value] of Object.entries(map)) {
    if (key.endsWith('*') && url.startsWith(key.slice(0, -1))) return value;
  }
  return undefined;
}
