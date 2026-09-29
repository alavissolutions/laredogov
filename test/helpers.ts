import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { load, type CheerioAPI } from 'cheerio';
import { afterEach } from 'vitest';
import { build, type BuildResult } from '../src/build.js';
import type { DataFile } from '../src/domain.js';
import { fixtureFetcher, type FixtureBody, type FixtureMode } from '../src/fetcher/fixture.js';
import type { SourceAdapter } from '../src/sources/types.js';

/** A temporary site: an output directory and a data file that later builds in the same test reuse. */
export class Site {
  private constructor(
    readonly dir: string,
    readonly outDir: string,
    readonly dataFile: string,
  ) {}

  static async create(): Promise<Site> {
    const dir = await mkdtemp(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, 'tmp') : tmpdir(), 'laredogov-'));
    const site = new Site(dir, path.join(dir, 'site'), path.join(dir, 'data.json'));
    cleanups.push(() => rm(dir, { recursive: true, force: true }));
    return site;
  }

  /** Runs the whole build (ingest then render) against recorded fixtures. */
  async build(opts: { fixtures: Record<string, FixtureBody>; now: Date; sources?: readonly SourceAdapter[]; log?: string[] }): Promise<BuildResult & { requests: { url: string; mode: FixtureMode }[] }> {
    const fetcher = fixtureFetcher(opts.fixtures);
    const logs = opts.log;
    const result = await build({
      fetcher,
      now: opts.now,
      outDir: this.outDir,
      dataFile: this.dataFile,
      ...(opts.sources ? { sources: opts.sources } : {}),
      siteUrl: 'https://example.test',
      basePath: '',
      log: (m) => logs?.push(m),
    });
    return { ...result, requests: fetcher.requests };
  }

  /** The owner's hand-kept elections file, which the build reads and never writes (ADR-0005). */
  get handKeptFile(): string {
    return path.join(this.dir, 'elections.yaml');
  }

  async writeHandKept(contents: string): Promise<void> {
    await writeFile(this.handKeptFile, contents);
  }

  async handKept(): Promise<string> {
    return readFile(this.handKeptFile, 'utf8');
  }

  /** Seeds the data file with records an earlier build would have left behind. */
  async writeData(data: DataFile): Promise<void> {
    await writeFile(this.dataFile, `${JSON.stringify(data, null, 2)}\n`);
  }

  async data(): Promise<DataFile> {
    return JSON.parse(await readFile(this.dataFile, 'utf8')) as DataFile;
  }

  async file(sitePath: string): Promise<string> {
    const rel = sitePath.endsWith('/') ? `${sitePath}index.html` : sitePath;
    return readFile(path.join(this.outDir, rel), 'utf8');
  }

  async page(sitePath: string): Promise<CheerioAPI> {
    return load(await this.file(sitePath));
  }

  async exists(sitePath: string): Promise<boolean> {
    try {
      await this.file(sitePath);
      return true;
    } catch {
      return false;
    }
  }
}

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

export function daysAfter(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Text of the New panel's Items on a home page, in order. */
export function newPanelTitles($: CheerioAPI): string[] {
  return $('section[aria-labelledby="new"] .items > li .title')
    .map((_, el) => $(el).text())
    .get();
}

export function comingUpTitles($: CheerioAPI): string[] {
  return $('section[aria-labelledby="coming-up"] .items > li')
    .map((_, el) => $(el).find('.title').text())
    .get();
}
