import { BrowserSession } from './browser.js';
import { httpFetch } from './http.js';
import type { Fetcher, FetchMode, FetchResponse } from './types.js';

/** Plain HTTP where it works; headless Chromium for Sources that declare they need it. */
export function productionFetcher(): Fetcher {
  const browser = new BrowserSession();
  return {
    fetch(url: string, mode: FetchMode): Promise<FetchResponse> {
      return mode === 'browser' ? browser.fetch(url) : httpFetch(url);
    },
    close: () => browser.close(),
  };
}
