/**
 * Election and Race pages (spec: .scratch/laredo-elections/spec.md, user stories 1, 5, 11 to 14).
 *
 * An Election page is everything the Publisher puts on its own election page, in the reader's
 * language for the labels and dates and in the Publisher's words for everything the Publisher wrote.
 * Links the Publisher sends a reader elsewhere for are grouped under the Publisher they lead to, so
 * nobody mistakes a county or state page for city material.
 *
 * A Race page is the city's own table, in the city's ballot order: who the city named, the treasurer
 * it named, and the ballot application it linked. A row the city has not named is shown as such and
 * is nobody (CONTEXT.md). Finance report columns join the table with issue 05.
 *
 * A Candidate page (user stories 6, 8, 9) is one name from that table: both names as the city
 * printed them, the Race, the treasurer, and every Filing the city posted under the name, each
 * under a plain label with the city's own words for it, its link, and the date the site last saw it
 * on the city's page. It ends with the sentence saying what the page is and is not.
 */
import { formatDate, formatTime, sortValue } from '../dates.js';
import { PUBLISHER_ORDER } from '../directory/entries.js';
import type { Candidate, Election, ElectionItemKind, ElectionLink, Filing, Item, PublisherId, Race, UnnamedRow } from '../domain.js';
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

/**
 * The city gives several links the same label ("Where do I Vote?", "Election Ordinance") and tells
 * them apart with its sub-label, so the sub-label goes inside the anchor: read on its own, out of
 * context, every link still says which one it is.
 */
function linkLine(link: ElectionLink): string {
  const note = link.note ? `<span class="note">${esc(link.note)}</span>` : '';
  return `<li><a href="${esc(link.url)}" rel="noopener">${esc(link.label)}${note}</a></li>`;
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
  const groups: { id: string; heading: string; links: ElectionLink[] }[] = [];
  for (const publisher of PUBLISHER_ORDER as readonly PublisherId[]) {
    const group = links.filter((l) => l.publisher === publisher);
    if (group.length) groups.push({ id: `election-links-${publisher}`, heading: t(lang, `publisher.${publisher}`), links: group });
  }
  const undeclared = links.filter((l) => !l.publisher);
  if (undeclared.length) groups.push({ id: 'election-links-other', heading: t(lang, 'elections.links.other'), links: undeclared });

  return `<section aria-labelledby="election-links">
<h2 id="election-links">${esc(t(lang, 'elections.links'))}</h2>
<p class="intro">${esc(t(lang, 'elections.links.intro'))}</p>
<div class="election-links">
${groups
  .map(
    (g) =>
      `<section aria-labelledby="${g.id}">\n<h3 id="${g.id}">${esc(g.heading)}</h3>\n<ul class="link-list">\n${g.links.map(linkLine).join('\n')}\n</ul>\n</section>`,
  )
  .join('\n')}
</div>
</section>`;
}

/** The Races of one Election, in the Publisher's own ballot order. */
export function racesInOrder(ctx: RenderContext, election: Election): Race[] {
  return ctx.data.races.filter((r) => r.electionId === election.id).sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

/** The Candidates of one Race, in the Publisher's own ballot order. */
export function candidatesInOrder(ctx: RenderContext, race: Race): Candidate[] {
  return ctx.data.candidates.filter((c) => c.raceId === race.id).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * The name a reader sees first: the name on the ballot, which is the name the city prints in the
 * ballot-order column. The city leaves that cell blank now and then, and the legal name stands in.
 */
export function candidateName(candidate: Candidate): string {
  return candidate.ballotName || candidate.name;
}

/** The Races a reader can open from the Election page. */
function racesSection(ctx: RenderContext, election: Election): string {
  const { lang } = ctx;
  const races = racesInOrder(ctx, election);
  const list =
    races.length === 0
      ? `<p class="empty">${esc(t(lang, 'elections.races.empty'))}</p>`
      : `<ul class="races-list">\n${races
          .map((race) => `<li><a class="title" href="${href(ctx, PATHS.race(election.slug, race.slug))}">${esc(race.title)}</a></li>`)
          .join('\n')}\n</ul>`;
  return `<section aria-labelledby="election-races">
<h2 id="election-races">${esc(t(lang, 'elections.races'))}</h2>
${list}
</section>`;
}

/** One row of the comparison table: a Candidate the Publisher named, or a row it has not named. */
type RaceRow = { order: number; candidate: Candidate } | { order: number; unnamed: UnnamedRow };

function raceRows(ctx: RenderContext, race: Race): RaceRow[] {
  const rows: RaceRow[] = [
    ...candidatesInOrder(ctx, race).map((candidate) => ({ order: candidate.order, candidate })),
    ...race.unnamedRows.map((unnamed) => ({ order: unnamed.order, unnamed })),
  ];
  return rows.sort((a, b) => a.order - b.order);
}

function filingsOf(ctx: RenderContext, ids: readonly string[]): Filing[] {
  return ids.map((id) => ctx.data.filings.find((f) => f.id === id)).filter((f): f is Filing => f !== undefined);
}

/**
 * The treasurer cell: the Publisher's own link text is the treasurer it named. A candidate who
 * appointed themselves is named twice in one row, once as the way into their page and once as the
 * treasurer, so the link says which document it opens for a reader who meets it out of context.
 */
function treasurerCell(ctx: RenderContext, treasurer: string | undefined, filings: readonly Filing[]): string {
  const { lang } = ctx;
  const appointment = filings.find((f) => f.kind === 'treasurer-appointment');
  if (!treasurer && !appointment) return `<td class="treasurer"><span class="empty">${esc(t(lang, 'race.notPosted'))}</span></td>`;
  if (!appointment) return `<td class="treasurer">${esc(treasurer ?? '')}</td>`;
  const label = treasurer || appointment.label;
  return `<td class="treasurer"><a href="${esc(appointment.url)}" rel="noopener">${esc(label)}<span class="visually-hidden"> ${esc(
    t(lang, 'filing.treasurer-appointment'),
  )}</span></a></td>`;
}

/**
 * The application cell. The city's own link text is "View", which says nothing on its own, so the
 * link carries the name it belongs to for a reader who meets it out of context.
 */
function applicationCell(ctx: RenderContext, name: string, filings: readonly Filing[]): string {
  const { lang } = ctx;
  const application = filings.find((f) => f.kind === 'ballot-application');
  if (!application) return `<td class="application"><span class="empty">${esc(t(lang, 'race.notPosted'))}</span></td>`;
  return `<td class="application"><a href="${esc(application.url)}" rel="noopener">${esc(t(lang, 'race.application.view'))}<span class="visually-hidden"> ${esc(
    name,
  )}</span></a></td>`;
}

/** The comparison table: one row per Candidate, in the Publisher's ballot order. */
function raceTable(ctx: RenderContext, election: Election, race: Race): string {
  const { lang } = ctx;
  const rows = raceRows(ctx, race);
  if (rows.length === 0) return `<p class="empty">${esc(t(lang, 'race.candidates.empty'))}</p>`;
  const body = rows
    .map((row) => {
      // A row the Publisher posted without a name is shown as such and names nobody (CONTEXT.md,
      // user story 10), but everything the Publisher did post on that row is still shown.
      const named = 'candidate' in row;
      const source = named ? row.candidate : row.unnamed;
      const filings = filingsOf(ctx, source.filings);
      const name = named ? candidateName(row.candidate) : t(lang, 'race.nameNotPosted');
      // Two unnamed rows would otherwise give their links the same accessible name.
      const linkName = named ? name : `${name}, ${t(lang, 'race.rowPosition', { n: String(source.order + 1) })}`;
      // The name is the way into the Candidate's own page; a row the city has not named leads nowhere.
      const heading = named
        ? `<a href="${href(ctx, PATHS.candidate(election.slug, race.slug, row.candidate.slug))}">${esc(name)}</a>`
        : esc(name);
      return `<tr${named ? '' : ' class="unnamed"'}><th scope="row">${heading}</th>${treasurerCell(ctx, source.treasurer, filings)}${applicationCell(
        ctx,
        linkName,
        filings,
      )}</tr>`;
    })
    .join('\n');
  return `<div class="table-scroll">
<table class="race-table">
<caption class="visually-hidden">${esc(race.title)}</caption>
<thead><tr><th scope="col">${esc(t(lang, 'race.nameOnBallot'))}</th><th scope="col">${esc(t(lang, 'race.treasurer'))}</th><th scope="col">${esc(
    t(lang, 'race.application'),
  )}</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</div>`;
}

/** A question Race: the Publisher's own wording and the document that called the question. */
function questionSection(ctx: RenderContext, race: Race): string {
  const { lang } = ctx;
  if (!race.question) return `<p class="empty">${esc(t(lang, 'race.question.empty'))}</p>`;
  return `<ul class="link-list">
<li><a href="${esc(race.question.url)}" rel="noopener">${esc(race.question.label)}<span class="note">${esc(race.title)}</span></a></li>
</ul>`;
}

export function racePage(ctx: RenderContext, election: Election, race: Race): string {
  const { lang } = ctx;
  const isQuestion = race.kind === 'question';
  const body = `<h1>${esc(race.title)}</h1>
<dl>
<dt>${esc(t(lang, 'race.election'))}</dt><dd><a href="${href(ctx, PATHS.election(election.slug))}">${esc(election.title)}</a></dd>
<dt>${esc(t(lang, 'elections.electionDay'))}</dt><dd><time datetime="${esc(election.date)}">${esc(formatDate(lang, election.date, 'long'))}</time></dd>
</dl>
<p class="neutrality">${esc(t(lang, 'elections.neutrality'))}</p>
<section aria-labelledby="race-candidates">
<h2 id="race-candidates">${esc(t(lang, isQuestion ? 'elections.races' : 'race.candidates'))}</h2>
<p class="intro">${esc(t(lang, isQuestion ? 'race.question.intro' : 'race.candidates.intro'))}</p>
${isQuestion ? questionSection(ctx, race) : raceTable(ctx, election, race)}
</section>`;
  return layout(ctx, {
    title: race.title,
    path: PATHS.race(election.slug, race.slug),
    body,
    description: isQuestion ? t(lang, 'race.question.description') : t(lang, 'race.description', { race: race.title }),
  });
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
${racesSection(ctx, election)}
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

/** One Filing: the site's plain label, the city's own words for it, and when it was last seen live. */
function filingLine(ctx: RenderContext, filing: Filing): string {
  const { lang } = ctx;
  // The city's own title for the link is kept beside the plain label so a reader can find the same
  // row on the city's page; it is the Publisher's wording and is never translated.
  const note = filing.label ? `<span class="note">${esc(filing.label)}</span>` : '';
  const seen = esc(t(lang, 'candidate.lastSeenLive', { date: formatDate(lang, filing.lastSeenLive, 'short') }));
  return `<li><a href="${esc(filing.url)}" rel="noopener">${esc(t(lang, `filing.${filing.kind}`))}</a>${note}<span class="meta"><time datetime="${esc(
    filing.lastSeenLive,
  )}">${seen}</time></span></li>`;
}

function filingsSection(ctx: RenderContext, candidate: Candidate): string {
  const { lang } = ctx;
  const filings = filingsOf(ctx, candidate.filings);
  const list =
    filings.length === 0
      ? `<p class="empty">${esc(t(lang, 'candidate.filings.empty'))}</p>`
      : `<ul class="filings">\n${filings.map((f) => filingLine(ctx, f)).join('\n')}\n</ul>`;
  return `<section aria-labelledby="candidate-filings">
<h2 id="candidate-filings">${esc(t(lang, 'candidate.filings'))}</h2>
<p class="intro">${esc(t(lang, 'candidate.filings.intro'))}</p>
${list}
</section>`;
}

export function candidatePage(ctx: RenderContext, election: Election, race: Race, candidate: Candidate): string {
  const { lang } = ctx;
  const name = candidateName(candidate);
  // Both names as the city printed them, then where the city put this person, then who they named
  // as treasurer. Nothing here is the site's own words except the headings.
  const treasurer = candidate.treasurer
    ? esc(candidate.treasurer)
    : `<span class="empty">${esc(t(lang, 'race.notPosted'))}</span>`;
  const body = `<h1>${esc(name)}</h1>
<dl>
<dt>${esc(t(lang, 'candidate.legalName'))}</dt><dd>${esc(candidate.name)}</dd>
<dt>${esc(t(lang, 'race.nameOnBallot'))}</dt><dd>${esc(candidate.ballotName || t(lang, 'race.notPosted'))}</dd>
<dt>${esc(t(lang, 'candidate.race'))}</dt><dd><a href="${href(ctx, PATHS.race(election.slug, race.slug))}">${esc(race.title)}</a></dd>
<dt>${esc(t(lang, 'race.election'))}</dt><dd><a href="${href(ctx, PATHS.election(election.slug))}">${esc(election.title)}</a></dd>
<dt>${esc(t(lang, 'elections.electionDay'))}</dt><dd><time datetime="${esc(election.date)}">${esc(formatDate(lang, election.date, 'long'))}</time></dd>
<dt>${esc(t(lang, 'race.treasurer'))}</dt><dd>${treasurer}</dd>
</dl>
<p class="neutrality">${esc(t(lang, 'candidate.neutrality'))}</p>
${filingsSection(ctx, candidate)}`;
  return layout(ctx, {
    title: name,
    path: PATHS.candidate(election.slug, race.slug, candidate.slug),
    body,
    description: t(lang, 'candidate.description', { name, race: race.title }),
  });
}
