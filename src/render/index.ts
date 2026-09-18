import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LANGS, TOPICS, type DataFile } from '../domain.js';
import { assertStringsComplete } from '../i18n/strings.js';
import { makeContext, PATHS, type RenderConfig } from './context.js';
import { CSS } from './css.js';
import { electionPage, racePage, racesInOrder } from './elections.js';
import { aboutPage, directoryPage, homePage, meetingPage, meetingsPage, searchPage, topicPage } from './pages.js';
import { rssFeed } from './rss.js';
import { searchIndex } from './search-index.js';

export interface RenderOptions extends RenderConfig {
  outDir: string;
  /** Written as CNAME for GitHub Pages when set. */
  domain?: string | undefined;
}

/** Stage two: write the static site, RSS feeds, and search index from the data file. */
export async function render(data: DataFile, opts: RenderOptions): Promise<void> {
  assertStringsComplete();
  const { outDir } = opts;
  const write = async (sitePath: string, content: string) => {
    const file = path.join(outDir, sitePath.endsWith('/') ? `${sitePath}index.html` : sitePath);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  };

  await write('/style.css', CSS);
  await write('/.nojekyll', '');
  await write('/robots.txt', 'User-agent: *\nAllow: /\n');
  if (opts.domain) await write('/CNAME', `${opts.domain}\n`);

  for (const lang of LANGS) {
    const ctx = makeContext(data, opts, lang);
    await write(`/${lang}${PATHS.home}`, homePage(ctx));
    await write(`/${lang}${PATHS.feed}`, rssFeed(ctx));
    for (const topic of TOPICS) {
      await write(`/${lang}${PATHS.topic(topic)}`, topicPage(ctx, topic));
      await write(`/${lang}${PATHS.topicFeed(topic)}`, rssFeed(ctx, topic));
    }
    for (const election of data.elections) {
      await write(`/${lang}${PATHS.election(election.slug)}`, electionPage(ctx, election));
      for (const race of racesInOrder(ctx, election)) await write(`/${lang}${PATHS.race(election.slug, race.slug)}`, racePage(ctx, election, race));
    }
    await write(`/${lang}${PATHS.meetings}`, meetingsPage(ctx));
    for (const body of data.bodies) await write(`/${lang}${PATHS.body(body.id)}`, meetingsPage(ctx, body.id));
    for (const meeting of data.meetings) await write(`/${lang}${PATHS.meeting(meeting.id)}`, meetingPage(ctx, meeting));
    await write(`/${lang}${PATHS.directory}`, directoryPage(ctx));
    await write(`/${lang}${PATHS.search}`, searchPage(ctx));
    await write(`/${lang}${PATHS.about}`, aboutPage(ctx));
  }

  await write('/search-index.json', JSON.stringify(searchIndex(data)));
  await write('/', rootRedirect(opts.basePath));
  await write('/404.html', rootRedirect(opts.basePath));
}

/** The root sends readers to English; no script needed. */
function rootRedirect(basePath: string): string {
  const en = `${basePath}/en/`;
  const es = `${basePath}/es/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0; url=${en}">
<link rel="canonical" href="${en}">
<link rel="alternate" hreflang="en" href="${en}">
<link rel="alternate" hreflang="es" href="${es}">
<title>Laredo Gov</title>
</head>
<body>
<p><a href="${en}">English</a> · <a href="${es}">Español</a></p>
</body>
</html>
`;
}
