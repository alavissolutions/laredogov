import { USER_AGENT, type FetchResponse } from './types.js';

/** One plain HTTP request per page, no retries, project user agent. */
export async function httpFetch(url: string, timeoutMs = 30_000): Promise<FetchResponse> {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'application/json, application/rss+xml, text/html;q=0.9, */*;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.text();
  return { url: res.url || url, status: res.status, body };
}
