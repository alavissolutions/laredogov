import type { Browser, BrowserContext } from 'playwright';
import { desktopUserAgent, type FetchResponse } from './types.js';

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

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined);
    await this.browser?.close().catch(() => undefined);
    this.context = undefined;
    this.browser = undefined;
  }
}
