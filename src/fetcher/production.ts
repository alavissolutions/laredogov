import { BrowserSession } from './browser.js';
import { httpFetch } from './http.js';
import type { DownloadResponse, Fetcher, FetchMode, FetchResponse } from './types.js';

/** Plain HTTP where it works; headless Chromium for Sources that declare they need it. */
export function productionFetcher(): Fetcher {
  const browser = new BrowserSession();
  return {
    fetch(url: string, mode: FetchMode): Promise<FetchResponse> {
      return mode === 'browser' ? browser.fetch(url) : httpFetch(url);
    },
    // The city's document store answers real browser navigations and nothing else, so a download
    // is always a browser download (spec: Fetching).
    download(url: string, referer?: string): Promise<DownloadResponse> {
      return browser.download(url, referer);
    },
    close: () => browser.close(),
  };
}
