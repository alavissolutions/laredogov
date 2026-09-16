/**
 * The one seam. Adapters never touch the network; they receive a Fetcher.
 * Production swaps in HTTP or headless Chromium; tests swap in recorded fixtures.
 */
export type FetchMode = 'http' | 'browser';

export interface FetchResponse {
  /** Final URL after any redirects. */
  url: string;
  status: number;
  body: string;
}

export interface Fetcher {
  fetch(url: string, mode: FetchMode): Promise<FetchResponse>;
  /** Release any held resources (browser instances). Safe to call more than once. */
  close(): Promise<void>;
}

export const PROJECT_URL = 'https://github.com/adrianlgom/laredogov';
export const CONTACT_EMAIL = 'adrianlgom@gmail.com';

/** Identifies the project and a contact address so Publishers can reach the owner. */
export const USER_AGENT = `LaredoGov/0.1 (+${PROJECT_URL}; ${CONTACT_EMAIL})`;

/** A real desktop browser UA for browser mode, where Akamai rejects anything else. The major version must match the running Chromium. */
export function desktopUserAgent(chromeMajor: string): string {
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36`;
}

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/** Throws unless the response is a 2xx. Adapters call this so a block or outage becomes a recorded Source error. */
export function ensureOk(res: FetchResponse): FetchResponse {
  if (res.status < 200 || res.status >= 300) {
    throw new FetchError(`HTTP ${res.status} fetching ${res.url}`, res.url, res.status);
  }
  return res;
}
