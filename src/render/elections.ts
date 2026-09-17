/**
 * Election pages (spec: .scratch/laredo-elections/spec.md, user stories 11 to 14).
 *
 * An Election page is everything the Publisher puts on its own election page, in the reader's
 * language for the labels and dates and in the Publisher's words for everything the Publisher wrote.
 * Links the Publisher sends a reader elsewhere for are grouped under the Publisher they lead to, so
 * nobody mistakes a county or state page for city material.
 */
import { formatDate, formatTime, sortValue } from '../dates.js';
import { PUBLISHER_ORDER } from '../directory/entries.js';
import type { Election, ElectionItemKind, ElectionLink, Item, PublisherId } from '../domain.js';
import { t } from '../i18n/strings.js';
import { href, PATHS, type RenderContext } from './context.js';
import { esc, layout, topicNav } from './html.js';
import { itemList } from './items.js';

/** Upcoming Elections first, soonest first, then past ones newest first (issue 04). */
export function electionsInOrder(ctx: RenderContext): Election[] {
  const upcoming = ctx.data.elections.filter((e) => e.date >= ctx.today).sort((a, b) => a.date.localeCompare(b.date));
  const past = ctx.data.elections.filter((e) => e.date < ctx.today).sort((a, b) => b.date.localeCompare(a.date));
  return [...upcoming, ...past];
}

/** The Items the Source recorded under one Election, newest first. Not windowed: this is the record. */
export function electionItems(ctx: RenderContext, election: Election, kind: ElectionItemKind): Item[] {
  return ctx.data.items
    .filter((i) => i.election?.id === election.id && i.election.kind === kind)
    .sort((a, b) => sortValue(b.date) - sortValue(a.date) || a.id.localeCompare(b.id));
}

/** The list of Elections that opens the Elections Topic page. */
export function electionsPanel(ctx: RenderContext): string {
  const elections = electionsInOrder(ctx);
  if (elections.length === 0) return '';
  const { lang } = ctx;
  return `<section aria-labelledby="elections">
<h2 id="elections">${esc(t(lang, 'elections.heading'))}</h2>
<ul class="elections-list">
${elections
  .map(
    (e) => `<li><a class="title" href="${href(ctx, PATHS.election(e.slug))}">${esc(e.title)}</a><span class="meta"><span class="publisher">${esc(
      t(lang, `publisher.${e.publisher}`),
    )}</span><span class="sep" aria-hidden="true">·</span><time datetime="${esc(e.date)}">${esc(formatDate(lang, e.date, 'long'))}</time></span></li>`,
  )
  .join('\n')}
</ul>
</section>`;
}

function calendarSection(ctx: RenderContext, election: Election): string {
  const { lang } = ctx;
  if (election.calendar.length === 0) return `<p class="empty">${esc(t(lang, 'elections.calendar.empty'))}</p>`;
  return `<ul class="election-calendar">
${election.calendar
  .map(
    (entry) =>
      `<li><time datetime="${esc(entry.date)}">${esc(formatDate(lang, entry.date, 'long'))}</time> <span class="what">${esc(entry.description)}</span></li>`,
  )
  .join('\n')}
</ul>`;
}

function linkLine(link: ElectionLink): string {
  const note = link.note ? ` <span class="note">${esc(link.note)}</span>` : '';
  return `<li><a href="${esc(link.url)}" rel="noopener">${esc(link.label)}</a>${note}</li>`;
}

function votingSitesSection(ctx: RenderContext, election: Election): string {
  const { lang } = ctx;
  const sites = election.links.filter((l) => l.kind === 'voting-site');
  if (sites.length === 0) return `<p class="empty">${esc(t(lang, 'elections.votingSites.empty'))}</p>`;
  return `<ul class="voting-sites">\n${sites.map(linkLine).join('\n')}\n</ul>`;
}

function forumsSection(ctx: RenderContext, election: Election): string {
  const { lang } = ctx;
  if (election.forums.length === 0) return `<p class="empty">${esc(t(lang, 'elections.forums.empty'))}</p>`;
  return `<ul class="election-forums">
${election.forums
  .map((forum) => {
    const when = `<time datetime="${esc(forum.start)}">${esc(formatDate(lang, forum.start, 'long'))}, ${esc(formatTime(lang, forum.start))}</time>`;
    // The city posts the link only once the video exists; until then the line is the schedule.
    const label = forum.url ? `<a href="${esc(forum.url)}" rel="noopener">${esc(forum.label)}</a>` : `<span class="what">${esc(forum.label)}</span>`;
    return `<li>${label} ${when}</li>`;
  })
  .join('\n')}
</ul>`;
}

/** Everything else the Publisher links to, grouped by the Publisher the link leads to. */
function linksSection(ctx: RenderContext, election: Election): string {
  const { lang } = ctx;
  const links = election.links.filter((l) => l.kind !== 'voting-site');
  if (links.length === 0) return '';
  const groups: { heading: string; links: ElectionLink[] }[] = [];
  for (const publisher of PUBLISHER_ORDER as readonly PublisherId[]) {
    const group = links.filter((l) => l.publisher === publisher);
    if (group.length) groups.push({ heading: t(lang, `publisher.${publisher}`), links: group });
  }
  const undeclared = links.filter((l) => !l.publisher);
  if (undeclared.length) groups.push({ heading: t(lang, 'elections.links.other'), links: undeclared });

  return `<section aria-labelledby="election-links">
<h2 id="election-links">${esc(t(lang, 'elections.links'))}</h2>
<p class="intro">${esc(t(lang, 'elections.links.intro'))}</p>
<div class="election-links">
${groups
  .map((g) => `<section>\n<h3>${esc(g.heading)}</h3>\n<ul class="link-list">\n${g.links.map(linkLine).join('\n')}\n</ul>\n</section>`)
  .join('\n')}
</div>
</section>`;
}

export function electionPage(ctx: RenderContext, election: Election): string {
  const { lang } = ctx;
  const notices = electionItems(ctx, election, 'notice');
  const body = `<h1>${esc(election.title)}</h1>
<dl>
<dt>${esc(t(lang, 'elections.electionDay'))}</dt><dd><time datetime="${esc(election.date)}">${esc(formatDate(lang, election.date, 'long'))}</time></dd>
<dt>${esc(t(lang, 'item.publisher'))}</dt><dd>${esc(t(lang, `publisher.${election.publisher}`))}</dd>
</dl>
<p><a href="${esc(election.url)}" rel="noopener">${esc(t(lang, 'elections.officialPage'))}</a></p>
<section aria-labelledby="election-calendar">
<h2 id="election-calendar">${esc(t(lang, 'elections.calendar'))}</h2>
${calendarSection(ctx, election)}
</section>
<section aria-labelledby="election-notices">
<h2 id="election-notices">${esc(t(lang, 'elections.notices'))}</h2>
<div class="election-notices">${itemList(ctx, notices, t(lang, 'elections.notices.empty'))}</div>
</section>
<section aria-labelledby="election-voting-sites">
<h2 id="election-voting-sites">${esc(t(lang, 'elections.votingSites'))}</h2>
<p class="intro">${esc(t(lang, 'elections.votingSites.intro'))}</p>
${votingSitesSection(ctx, election)}
</section>
<section aria-labelledby="election-forums">
<h2 id="election-forums">${esc(t(lang, 'elections.forums'))}</h2>
<p class="intro">${esc(t(lang, 'elections.forums.intro'))}</p>
${forumsSection(ctx, election)}
</section>
${linksSection(ctx, election)}
<h2>${esc(t(lang, 'topic.all'))}</h2>
${topicNav(ctx)}`;
  return layout(ctx, {
    title: election.title,
    path: PATHS.election(election.slug),
    body,
    description: t(lang, 'elections.description', { date: formatDate(lang, election.date, 'long') }),
  });
}
