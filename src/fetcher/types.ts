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

/**
 * A document the Publisher stores rather than a page: bytes, and the filename its own store gives
 * them. Bytes because the documents this reaches for are PDFs, and a PDF read as text is nonsense
 * (issue 06).
 */
export interface DownloadResponse {
  /** Final URL after any redirects. */
  url: string;
  status: number;
  bytes: Uint8Array;
  /** The filename out of `Content-Disposition`, as the Publisher wrote it, when it sends one. */
  filename?: string;
}

export interface Fetcher {
  fetch(url: string, mode: FetchMode): Promise<FetchResponse>;
  /**
   * One document out of a Publisher's document store. It is its own method rather than a fetch
   * mode because what comes back is bytes and a filename, not a page (spec: Fetching). `referer`
   * is the Publisher's own page that links the document: a store behind bot management answers
   * only a browser that has been there, so the implementation may open it first.
   */
  download(url: string, referer?: string): Promise<DownloadResponse>;
  /** Release any held resources (browser instances). Safe to call more than once. */
  close(): Promise<void>;
}

export const PROJECT_URL = 'https://github.com/alavissolutions/laredogov';
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
export function ensureOk<T extends { url: string; status: number }>(res: T): T {
  if (res.status < 200 || res.status >= 300) {
    throw new FetchError(`HTTP ${res.status} fetching ${res.url}`, res.url, res.status);
  }
  return res;
}
