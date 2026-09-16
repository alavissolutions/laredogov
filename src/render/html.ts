import { formatDate } from '../dates.js';
import { TOPICS, type Lang } from '../domain.js';
import { PROJECT_URL } from '../fetcher/types.js';
import { t } from '../i18n/strings.js';
import { href, PATHS, rootHref, type RenderContext } from './context.js';

export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export interface PageSpec {
  /** Page title without the site name. */
  title: string;
  /** Language-independent site path, e.g. '/topics/health/'. */
  path: string;
  body: string;
  description?: string;
  /** Extra <link> tags, e.g. RSS alternates. */
  head?: string;
  /** Inline first-party script, if any. No third-party scripts, ever. */
  script?: string;
}

export function layout(ctx: RenderContext, page: PageSpec): string {
  const { lang } = ctx;
  const other: Lang = lang === 'en' ? 'es' : 'en';
  const otherHref = href({ basePath: ctx.basePath, lang: other }, page.path);
  const nav: [string, string][] = [
    [t(lang, 'nav.home'), href(ctx, PATHS.home)],
    [t(lang, 'nav.meetings'), href(ctx, PATHS.meetings)],
    [t(lang, 'nav.directory'), href(ctx, PATHS.directory)],
    [t(lang, 'nav.search'), href(ctx, PATHS.search)],
    [t(lang, 'nav.about'), href(ctx, PATHS.about)],
  ];
  const current = href(ctx, page.path);
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} · ${esc(t(lang, 'site.name'))}</title>
${page.description ? `<meta name="description" content="${esc(page.description)}">\n` : ''}<link rel="stylesheet" href="${rootHref(ctx, '/style.css')}">
<link rel="alternate" hreflang="${other}" href="${esc(otherHref)}">
<link rel="alternate" hreflang="${lang}" href="${esc(current)}">
<link rel="alternate" type="application/rss+xml" title="${esc(t(lang, 'site.rss.everything'))}" href="${href(ctx, PATHS.feed)}">
${page.head ?? ''}</head>
<body>
<a class="skip" href="#main">${esc(t(lang, 'site.skipToContent'))}</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${href(ctx, PATHS.home)}">${esc(t(lang, 'site.name'))}</a>
    <nav aria-label="${esc(t(lang, 'nav.home'))}">
      <ul>
${nav.map(([label, url]) => `        <li><a href="${url}"${url === current ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('\n')}
        <li><a class="lang-switch" lang="${other}" hreflang="${other}" href="${esc(otherHref)}" aria-label="${esc(t(lang, 'site.switchLanguage.label'))}">${esc(t(lang, 'site.switchLanguage'))}</a></li>
      </ul>
    </nav>
  </div>
</header>
<p class="unofficial wrap" role="note">${esc(t(lang, 'site.unofficial'))}</p>
<main id="main" class="wrap">
${page.body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <p>${esc(t(lang, 'site.unofficial'))}</p>
    <p>${esc(t(lang, 'site.noTracking'))} ${esc(t(lang, 'site.builtAt', { date: formatDate(lang, ctx.now.toISOString(), 'short') }))}</p>
    <p><a href="${href(ctx, PATHS.feed)}">${esc(t(lang, 'site.rss.everything'))}</a> · <a href="${PROJECT_URL}">${esc(t(lang, 'site.sourceCode'))}</a></p>
  </div>
</footer>
${page.script ? `<script>\n${page.script}\n</script>\n` : ''}</body>
</html>
`;
}

export function topicNav(ctx: RenderContext): string {
  return `<nav class="topics" aria-label="${esc(t(ctx.lang, 'nav.topics'))}"><ul>${TOPICS.map(
    (topic) => `<li><a href="${href(ctx, PATHS.topic(topic))}">${esc(t(ctx.lang, `topic.${topic}`))}</a></li>`,
  ).join('')}</ul></nav>`;
}
