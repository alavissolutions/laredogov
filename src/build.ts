import { loadData, saveData } from './data-file.js';
import type { DataFile } from './domain.js';
import type { Fetcher } from './fetcher/types.js';
import { ingest, type IngestReport } from './ingest.js';
import { render } from './render/index.js';
import { SOURCES } from './sources/index.js';
import type { SourceAdapter } from './sources/types.js';

export interface BuildOptions {
  fetcher: Fetcher;
  outDir: string;
  /** The committed data file; created on the first build. */
  dataFile: string;
  now?: Date;
  sources?: readonly SourceAdapter[];
  siteUrl?: string | undefined;
  basePath?: string | undefined;
  domain?: string | undefined;
  log?: (message: string) => void;
}

export interface BuildResult {
  data: DataFile;
  report: IngestReport;
}

export const DEFAULT_SITE_URL = 'https://insidelaredo.com';

/**
 * The whole build: ingest every Feed into the data file, then render the site from it.
 * This is the one seam tests use, with the fetcher swapped for recorded fixtures.
 */
export async function build(opts: BuildOptions): Promise<BuildResult> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? ((m: string) => console.log(m));
  const data = await loadData(opts.dataFile);
  const report = await ingest(data, { fetcher: opts.fetcher, sources: opts.sources ?? SOURCES, now, log });
  await saveData(opts.dataFile, data);
  await render(data, {
    outDir: opts.outDir,
    now,
    siteUrl: opts.siteUrl ?? DEFAULT_SITE_URL,
    basePath: opts.basePath ?? '',
    domain: opts.domain,
  });
  log(`build: ${data.items.length} Items, ${data.meetings.length} Meetings, ${report.newItems} new this run${report.failed.length ? `, failed: ${report.failed.join(', ')}` : ''}`);
  return { data, report };
}
