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
   */
  async download(url: string, timeoutMs = 45_000): Promise<DownloadResponse> {
    const page = await (await this.ctx()).newPage();
    let caught: DownloadResponse | undefined;
    try {
      await page.route(url, async (route) => {
        try {
          const res = await route.fetch();
          caught = {
            url: res.url(),
            status: res.status(),
            bytes: await res.body(),
            ...filenameOf(res.headers()['content-disposition']),
          };
        } finally {
          // The viewer is never wanted, and a page left hanging on an unfulfilled route times out.
          await route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' }).catch(() => undefined);
        }
      });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
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
  }
}

/**
 * The filename the city's store sends. It writes the header without the `attachment;` every other
 * store leads with (`filename="CFR D1 Gilbert Gonzalez 010126063026.pdf"`), so both shapes are
 * read. It is kept for the owner and never parsed for a name or an office (spec: Fetching).
 */
function filenameOf(header: string | undefined): { filename?: string } {
  const match = header ? /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header) : null;
  const filename = match?.[1]?.trim();
  return filename ? { filename } : {};
}
