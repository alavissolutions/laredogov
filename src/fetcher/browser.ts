import type { Browser, BrowserContext } from 'playwright';
import { desktopUserAgent, type DownloadResponse, type FetchResponse } from './types.js';

/**
 * Headless Chromium for Sources behind Akamai bot management (the City of Laredo site),
 * which returns 403 to anything that is not a real browser. One navigation per page, no retries.
 *
 * Akamai accepts the full Chromium build (Playwright's `channel: 'chromium'`, not the headless shell)
 * when the user agent is a desktop Chrome whose major version matches the running browser.
 * Probed 2026-09-16; a mismatched or HeadlessChrome UA gets 403.
 */
export class BrowserSession {
  private browser: Browser | undefined;
  private context: BrowserContext | undefined;
  /** Hosts this context has already navigated, so a document store is asked for cookies once. */
  private readonly warmed = new Set<string>();

  private async ctx(): Promise<BrowserContext> {
    if (this.context) return this.context;
    const { chromium } = await import('playwright');
    this.browser = await chromium.launch({ headless: true, channel: 'chromium' });
    const major = this.browser.version().split('.')[0] ?? '128';
    this.context = await this.browser.newContext({
      userAgent: desktopUserAgent(major),
      locale: 'en-US',
      viewport: { width: 1280, height: 900 },
    });
    return this.context;
  }

  async fetch(url: string, timeoutMs = 45_000): Promise<FetchResponse> {
    const page = await (await this.ctx()).newPage();
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      // This host has now been navigated, cookies and all, so a document out of its store does not
      // need the referring page opened again for it: a Source that reads a page and then reaches
      // for the documents on it pays for one navigation, not two (branch review finding 6).
      this.warmed.add(origin(url));
      // Give client-side widgets a moment; the city calendar fills its grid after load.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
      const body = await page.content();
      return { url: page.url(), status: response?.status() ?? 0, body };
    } finally {
      await page.close();
    }
  }

  /**
   * One document out of the city's document store. Its CDN answers real navigations and nothing
   * else: a plain request or Playwright's own request API gets a challenge back, and navigating to
   * the document makes Chromium render its PDF viewer, whose HTML is all the navigation response
   * will hand over. So the navigation is made and the document's own response is taken off the
   * route it travels on, with a blank page fulfilled in its place so Chromium never opens the
   * viewer at all. Verified against the city's store 2026-09-17 (spec: Fetching).
   *
   * `route.fetch()` is the Node side asking, with this context's cookies, which is why the page
   * that links the documents is opened first when the context is fresh: the cookies Akamai sets on
   * that navigation are what the store answers to. Ordering is not left to luck, so a caller
   * reaching for a document in a context that has fetched nothing else gets the referring page
   * navigated for it first.
   */
  async download(url: string, referer?: string, timeoutMs = 45_000): Promise<DownloadResponse> {
    const context = await this.ctx();
    if (referer && !this.warmed.has(origin(referer))) {
      this.warmed.add(origin(referer));
      await this.fetch(referer, timeoutMs).catch(() => undefined);
    }
    const page = await context.newPage();
    let caught: DownloadResponse | undefined;
    try {
      // A predicate, not a glob: a document URL may carry `?` and `*`, which a route pattern reads
      // as wildcards, and this must intercept the one document it asked for and nothing else.
      await page.route(
        (candidate) => candidate.href === url,
        async (route) => {
          try {
            // The budget is the document's: without it the request runs on Playwright's own
            // default, so a store that is slow today gives up at thirty seconds however long the
            // caller was willing to wait (branch review finding 3).
            const res = await route.fetch({ timeout: timeoutMs });
            caught = {
              url: res.url(),
              status: res.status(),
              bytes: await res.body(),
              ...filenameOf(res.headers()['content-disposition']),
            };
          } catch {
            // A document the store would not hand over inside the budget: nothing is caught, the
            // caller gets status 0, and the next run asks for it again.
          } finally {
            // The viewer is never wanted, and a page left hanging on an unfulfilled route times out.
            await route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }).catch(() => undefined);
          }
        },
      );
      // The navigation is only the thing the document's own response travels on, and it is given a
      // little more than the budget so the document's own timeout is what fires: a navigation that
      // aborted first would leave the caller with a Playwright error instead of a response.
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs + NAVIGATION_GRACE_MS });
      // A route that never fired means the store redirected the navigation somewhere else.
      return caught ?? { url, status: 0, bytes: new Uint8Array() };
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.context = undefined;
    this.browser = undefined;
    this.warmed.clear();
  }
}

/** How much longer than the document's own budget the navigation carrying it is allowed to run. */
const NAVIGATION_GRACE_MS = 5_000;

function origin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/**
 * The filename the city's store sends. It writes the header without the `attachment;` every other
 * store leads with (`filename="CFR D1 Gilbert Gonzalez 010126063026.pdf"`), so both shapes are
 * read, and the percent-encoded `filename*=UTF-8''` form is decoded. It is kept for the owner and
 * never parsed for a name or an office (spec: Fetching).
 */
function filenameOf(header: string | undefined): { filename?: string } {
  if (!header) return {};
  const encoded = /filename\*=\s*(?:UTF-8|ISO-8859-1)?''([^;]+)/i.exec(header);
  const plain = /filename=\s*"?([^";]+)"?/i.exec(header);
  const raw = (encoded?.[1] ?? plain?.[1] ?? '').trim();
  if (!raw) return {};
  let filename = raw;
  if (encoded) {
    try {
      filename = decodeURIComponent(raw);
    } catch {
      filename = raw;
    }
  }
  return { filename };
}
