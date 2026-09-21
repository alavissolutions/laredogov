import { formatDate, rfc822 } from '../dates.js';
import type { Item, Topic } from '../domain.js';
import { t } from '../i18n/strings.js';
import { absolute, href, PATHS, type RenderContext } from './context.js';
import { esc } from './html.js';
import { itemTitle, postedDate, recentItems } from './items.js';

/** RSS 2.0. Each Item links to the Publisher's page and carries the Publisher's date (user story 25). */
export function rssFeed(ctx: RenderContext, topic?: Topic): string {
  const { lang } = ctx;
  const items = recentItems(ctx, topic);
  const name = topic ? t(lang, `topic.${topic}`) : t(lang, 'site.name');
  const title = topic ? `${t(lang, 'site.name')}: ${name}` : `${t(lang, 'site.name')}: ${t(lang, 'site.tagline')}`;
  const pagePath = topic ? PATHS.topic(topic) : PATHS.home;
  const self = absolute(ctx, href(ctx, topic ? PATHS.topicFeed(topic) : PATHS.feed));
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${esc(title)}</title>
<link>${esc(absolute(ctx, href(ctx, pagePath)))}</link>
<atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>
<description>${esc(t(lang, 'site.unofficial'))}</description>
<language>${lang}</language>
<lastBuildDate>${rfc822(ctx.now.toISOString())}</lastBuildDate>
${items.map((i) => rssItem(ctx, i)).join('\n')}
</channel>
</rss>
`;
}

function rssItem(ctx: RenderContext, item: Item): string {
  const { lang } = ctx;
  // Two Elections post lists under the very same title ("Early Voting Sites") for different weeks,
  // so an Item the Publisher posted with an Election names it, in the Publisher's own words (issue 04).
  const election = item.election ? ctx.data.elections.find((e) => e.id === item.election?.id) : undefined;
  const description = [
    t(lang, `publisher.${item.publisher}`),
    t(lang, `topic.${item.topic}`),
    election?.title,
    item.event ? formatDate(lang, item.event.start, 'long') : undefined,
    item.event?.place,
  ]
    .filter(Boolean)
    .join(' · ');
  return `<item>
<title>${esc(itemTitle(ctx, item))}</title>
<link>${esc(item.url)}</link>
<guid isPermaLink="false">${esc(item.id)}</guid>
<pubDate>${rfc822(postedDate(item))}</pubDate>
<category>${esc(t(lang, `topic.${item.topic}`))}</category>
<description>${esc(description)}</description>
</item>`;
}
