/**
 * Branch review of feat/laredo-elections, findings 3 and 6
 * (.scratch/laredo-elections/reviews/00-branch-review.md). Both are about what the scheduled run
 * spends on a document store: the document request has to be held to the budget the caller gave,
 * and a page this session has already navigated must not be navigated again to warm the same
 * cookies twice.
 *
 * This is the one test in the repo that drives a real browser, because both findings are about what
 * Playwright does rather than about what a Source parses. It talks to a local server standing in
 * for the city's document store, never to the city.
 */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { BrowserSession } from '../src/fetcher/browser.js';

/** Enough of a PDF to be one; the reader is not what is under test here. */
const DOCUMENT = Buffer.from('%PDF-1.4\n% one report\n%%EOF\n');

interface Store {
  base: string;
  /** Every path the store was asked for, in order. */
  hits: string[];
  close(): Promise<void>;
}

/**
 * A stand-in for the city's store: a page that links documents, a document it hands over, and a
 * document it starts to answer and never finishes.
 */
async function documentStore(): Promise<Store> {
  const hits: string[] = [];
  const server = createServer((req, res) => {
    hits.push(req.url ?? '');
    if (req.url === '/finance') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<html><body><p><a href="/doc/fast">Campaign Finance Report</a></p></body></html>');
      return;
    }
    if (req.url === '/doc/fast') {
      res.writeHead(200, { 'content-type': 'application/pdf', 'content-disposition': 'filename="CFR Example Filer.pdf"' });
      res.end(DOCUMENT);
      return;
    }
    // A document the store never answers: the case the budget exists for. The socket is held open
    // and closed with the server at the end of the test.
    if (req.url === '/doc/slow') return;
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    hits,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

const open: (() => Promise<void>)[] = [];
afterEach(async () => {
  while (open.length) await open.pop()!();
});

async function session(): Promise<BrowserSession> {
  const browser = new BrowserSession();
  open.push(() => browser.close());
  return browser;
}

describe('Branch review 6: a page this session has already navigated', () => {
  it('does not navigate the referring page a second time to warm cookies it already has', async () => {
    const store = await documentStore();
    open.push(() => store.close());
    const browser = await session();

    await browser.fetch(`${store.base}/finance`);
    const document = await browser.download(`${store.base}/doc/fast`, `${store.base}/finance`);

    expect(document.status).toBe(200);
    expect(Buffer.from(document.bytes).toString('latin1')).toContain('%PDF-');
    expect(document.filename).toBe('CFR Example Filer.pdf');
    // The page was read once, by the Source that read it. The download rode on its cookies.
    expect(store.hits.filter((path) => path === '/finance')).toEqual(['/finance']);
  });
});

describe('Branch review 3: a document the store will not answer', () => {
  it('gives the document up when its budget runs out, rather than leaving the navigation to time out', async () => {
    const store = await documentStore();
    open.push(() => store.close());
    const browser = await session();

    const started = Date.now();
    const document = await browser.download(`${store.base}/doc/slow`, undefined, 2_000);

    // The document is the thing on a budget, so the budget is what ends it: the caller gets a
    // response it can act on (status 0, ensureOk throws, the next run asks again) rather than a
    // navigation timeout out of Playwright.
    expect(document.status).toBe(0);
    expect(document.bytes).toHaveLength(0);
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});
