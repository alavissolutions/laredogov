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
 * The Figures copied from a finance report (user stories 3 and 8) show on both pages, and only once
 * the owner has checked them against the report: until then the reader is told so and given the
 * link, because an unchecked number under a real person's name is worse than no number at all
 * (note on ADR-0001).
 *
 * A Candidate page (user stories 6, 8, 9) is one name from that table: both names as the city
 * printed them, the Race, the treasurer, and every Filing the city posted under the name, each
 * under a plain label with the city's own words for it, its link, and the date the site last saw it
 * on the city's page. It ends with the sentence saying what the page is and is not.
 */
import { formatDate, formatTime, sortValue } from '../dates.js';
import { PUBLISHER_ORDER } from '../directory/entries.js';
import type {
  Candidate,
  Election,
  ElectionCalendarEntry,
  ElectionItemKind,
  ElectionLink,
  Figure,
  Filing,
  Item,
  PublisherId,
  Race,
  UnnamedRow,
} from '../domain.js';
import { earliestCoverageStart } from '../elections/coverage.js';
import { t, type StringKey } from '../i18n/strings.js';
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
${election.calendar.map((entry) => `<li>${calendarWhen(ctx, entry)} <span class="what">${esc(entry.description)}</span></li>`).join('\n')}
</ul>`;
}

/**
 * The day an entry falls on, or, for an entry the Publisher spans over days, both of its ends. Both
 * go in one `.when` cell, so a two-day entry stays one column beside its description rather than
 * splitting into two.
 */
function calendarWhen(ctx: RenderContext, entry: ElectionCalendarEntry): string {
  const { lang } = ctx;
  const day = (date: string) => `<time datetime="${esc(date)}">${esc(formatDate(lang, date, 'long'))}</time>`;
  const when = entry.endDate
    ? `${day(entry.date)} <span class="through">${esc(t(lang, 'elections.calendar.through'))}</span> ${day(entry.endDate)}`
    : day(entry.date);
  return `<span class="when">${when}</span>`;
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

/**
 * The filing periods a Race table has a column for: every deadline the Publisher has a heading for
 * since the earliest Election this site covers opened, in date order (user story 1). Older
 * deadlines are on the Candidates' own pages, where a decade of one person's filings is history
 * rather than a comparison; a table one column wider per year would be unreadable on a phone.
 */
export function financePeriods(ctx: RenderContext): { label: string; date: string }[] {
  // The same day the Source dates reports into the feed from, so a table never leaves out a
  // deadline whose reports a reader has already seen in the New panel.
  const opens = earliestCoverageStart(ctx.data.elections);
  if (!opens) return [];
  const byDate = new Map<string, { label: string; date: string }>();
  for (const filing of financeReports(ctx)) {
    if (!filing.period || filing.period.date < opens) continue;
    byDate.set(filing.period.date, filing.period);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Every finance report the Publisher has posted, whoever it belongs to. */
function financeReports(ctx: RenderContext): Filing[] {
  return ctx.data.filings.filter((f) => f.kind === 'finance-report');
}

/** The reports the Publisher posted under a name this Candidate answers to, newest period first. */
export function candidateReports(ctx: RenderContext, candidate: Candidate): Filing[] {
  return financeReports(ctx)
    .filter((f) => f.attachedTo?.includes(candidate.id))
    .sort((a, b) => (b.period?.date ?? '').localeCompare(a.period?.date ?? '') || a.id.localeCompare(b.id));
}

/** The Figure copied from one Filing, whether or not the owner has checked it yet. */
export function figureFor(ctx: RenderContext, filing: Filing): Figure | undefined {
  return ctx.data.figures.find((f) => f.filingId === filing.id);
}

/**
 * A total as the form it was copied from prints it: dollars and cents, grouped in threes, in both
 * languages. The number is the Publisher's, printed on a United States form in United States
 * money, and this site does not restyle what the Publisher wrote any more than it translates a
 * name (spec: Names, Language).
 */
export function formatMoney(amount: number): string {
  const [whole = '0', cents = '00'] = amount.toFixed(2).split('.');
  return `$${whole.replace(/\B(?=(\d{3})+$)/g, ',')}.${cents}`;
}

/** The four totals, in the order the cover sheet prints them. */
function figureList(ctx: RenderContext, figure: Figure): string {
  const { lang } = ctx;
  const rows: [StringKey, number][] = [
    ['figure.contributions', figure.totals.contributions],
    ['figure.expenditures', figure.totals.expenditures],
    ['figure.contributionsMaintained', figure.totals.contributionsMaintained],
    ['figure.outstandingLoans', figure.totals.outstandingLoans],
  ];
  return `<dl class="figure">${rows
    .map(([key, amount]) => `<dt>${esc(t(lang, key))}</dt><dd>${esc(formatMoney(amount))}</dd>`)
    .join('')}</dl>`;
}

/** A column heading: what the column is, and the Publisher's own filing deadline, in the reader's date. */
function financeHeader(ctx: RenderContext, period: { label: string; date: string }): string {
  const { lang } = ctx;
  return `<th scope="col" class="finance"><span class="what">${esc(t(lang, 'race.finance'))}</span> <time datetime="${esc(period.date)}">${esc(
    formatDate(lang, period.date, 'short'),
  )}</time></th>`;
}

/**
 * One cell of the comparison: the report the Publisher posted for that deadline under a name this
 * Candidate answers to, or a plain sentence so a blank never reads as a missing part of this site
 * (user story 2). That sentence says what this site knows and no more: a report the Publisher
 * posted under a spelling nobody has declared yet is not "not posted", it is under the table with
 * the Publisher's own spelling (ADR-0005), and a name the Publisher listed with nothing to open
 * means the same to a reader either way. The link says whose report and for which deadline it is,
 * for a reader who meets it out of the table.
 */
function financeCell(ctx: RenderContext, candidate: Candidate | undefined, period: { label: string; date: string }, name: string): string {
  const { lang } = ctx;
  const reports = candidate ? candidateReports(ctx, candidate).filter((f) => f.period?.date === period.date) : [];
  if (reports.length === 0) return `<td class="finance"><span class="empty">${esc(t(lang, 'race.finance.none'))}</span></td>`;
  const links = reports
    .map((report) => {
      // Two reports for one deadline (an amendment, a corrected form) would otherwise give their
      // links the same name read out of the table, so each says which document it opens.
      const which = reports.length > 1 ? `, ${t(lang, 'race.finance.document', { id: report.documentId })}` : '';
      const figure = figureFor(ctx, report);
      // Three states, and the link in all three: the totals once the owner has checked them, the
      // plain fact that they have not been checked yet until then (user story 3), and, for a
      // report nothing could be read out of, the link on its own as before (issue 05).
      const label = figure && !figure.verified ? t(lang, 'figure.awaiting') : t(lang, 'race.finance.filed');
      const link = `<a href="${esc(report.url)}" rel="noopener">${esc(label)}<span class="visually-hidden"> ${esc(name)}, ${esc(
        formatDate(lang, period.date, 'short'),
      )}${esc(which)}</span></a>`;
      return figure?.verified ? `${link}${figureList(ctx, figure)}` : link;
    })
    .join(' ');
  return `<td class="finance">${links}</td>`;
}

/** The comparison table: one row per Candidate, in the Publisher's ballot order. */
function raceTable(ctx: RenderContext, election: Election, race: Race): string {
  const { lang } = ctx;
  const rows = raceRows(ctx, race);
  const periods = financePeriods(ctx);
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
      const finance = periods.map((period) => financeCell(ctx, named ? row.candidate : undefined, period, linkName)).join('');
      return `<tr${named ? '' : ' class="unnamed"'}><th scope="row">${heading}</th>${treasurerCell(ctx, source.treasurer, filings)}${applicationCell(
        ctx,
        linkName,
        filings,
      )}${finance}</tr>`;
    })
    .join('\n');
  return `<div class="table-scroll">
<table class="race-table">
<caption class="visually-hidden">${esc(race.title)}</caption>
<thead><tr><th scope="col">${esc(t(lang, 'race.nameOnBallot'))}</th><th scope="col">${esc(t(lang, 'race.treasurer'))}</th><th scope="col">${esc(
    t(lang, 'race.application'),
  )}</th>${periods.map((period) => financeHeader(ctx, period)).join('')}</tr></thead>
<tbody>
${body}
</tbody>
</table>
</div>`;
}

/**
 * The reports the Publisher posted for the deadlines this table covers that no Candidate answers
 * to yet (user story 4). They are listed under the table exactly as the Publisher posted them, so
 * nothing the Publisher published is hidden by this site's bookkeeping while the owner is behind on
 * declaring a spelling (ADR-0005). They belong to no Race in particular, which is why they are
 * listed under each of them.
 */
export function unmatchedReports(ctx: RenderContext): Filing[] {
  const dates = new Set(financePeriods(ctx).map((p) => p.date));
  return financeReports(ctx)
    .filter((f) => f.period && dates.has(f.period.date) && !f.attachedTo?.length)
    .sort((a, b) => (b.period?.date ?? '').localeCompare(a.period?.date ?? '') || (a.filerName ?? '').localeCompare(b.filerName ?? ''));
}

function unmatchedSection(ctx: RenderContext): string {
  const { lang } = ctx;
  const reports = unmatchedReports(ctx);
  if (reports.length === 0) return '';
  return `<section aria-labelledby="race-unmatched">
<h2 id="race-unmatched">${esc(t(lang, 'race.unmatched'))}</h2>
<p class="intro">${esc(t(lang, 'race.unmatched.intro'))}</p>
<ul class="unmatched-reports">
${reports
  .map((report) => {
    // The Publisher's own spelling of the name, its own office, and the deadline it filed it under.
    const where = [report.office, report.period ? formatDate(lang, report.period.date, 'short') : ''].filter(Boolean).join(' · ');
    return `<li><a href="${esc(report.url)}" rel="noopener">${esc(report.filerName ?? report.label)}<span class="note">${esc(where)}</span></a></li>`;
  })
  .join('\n')}
</ul>
</section>`;
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
</section>
${isQuestion ? '' : unmatchedSection(ctx)}`;
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
<div class="election-notices">${itemList(ctx, notices, t(lang, 'elections.notices.empty'), { omitElection: true })}</div>
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

/**
 * What was copied from one Filing, under the line that links it: the four totals once the owner has
 * checked them against the report, and until then the plain fact that they have not been, with the
 * link above to read them for oneself (user stories 3 and 8, note on ADR-0001). A report the
 * extractor read nothing out of adds nothing here; it is the link and the date, as it was before.
 */
function figureBlock(ctx: RenderContext, filing: Filing): string {
  const { lang } = ctx;
  const figure = figureFor(ctx, filing);
  if (!figure) return '';
  if (!figure.verified) return `<span class="figure-awaiting"><strong>${esc(t(lang, 'figure.awaiting'))}</strong> ${esc(t(lang, 'figure.awaiting.note'))}</span>`;
  return `${figureList(ctx, figure)}<span class="figure-note">${esc(t(lang, 'figure.note'))}</span>`;
}

/** One Filing: the site's plain label, the city's own words for it, and when it was last seen live. */
function filingLine(ctx: RenderContext, filing: Filing): string {
  const { lang } = ctx;
  // The city's own title for the link goes inside the anchor, as it does on the Election page: the
  // city posts two documents of one kind often enough (an amended treasurer appointment, one
  // finance report per period) that the plain label alone would name two links the same. It is the
  // Publisher's wording and is never translated.
  //
  // A finance report says instead which filing deadline the city posted it under and which office
  // it filed the report under, because that is what tells two of them apart and because a report a
  // sitting officeholder filed is shown under the office the city filed it under, never relabelled
  // (user story 7, spec: no incumbent label).
  const report = filing.kind === 'finance-report' && filing.period !== undefined;
  // The deadline is printed once, in the reader's language, beside the line; the note carries the
  // one thing left that the Publisher wrote, which is the office it filed the report under.
  const where = report ? filing.office ?? '' : filing.label;
  const note = where ? `<span class="note">${esc(where)}</span>` : '';
  const period = report
    ? `<time class="period" datetime="${esc(filing.period!.date)}">${esc(formatDate(lang, filing.period!.date, 'short'))}</time> `
    : '';
  const seen = esc(t(lang, 'candidate.lastSeenLive', { date: formatDate(lang, filing.lastSeenLive, 'short') }));
  return `<li${report ? ' class="finance-report"' : ''}>${period}<a href="${esc(filing.url)}" rel="noopener">${esc(
    t(lang, `filing.${filing.kind}`),
  )}${note}</a><span class="meta"><time datetime="${esc(filing.lastSeenLive)}">${seen}</time></span>${figureBlock(ctx, filing)}</li>`;
}

/**
 * Everything the Publisher posted under this Candidate's name: what it put in its Race table, in
 * the order it listed it, then every finance report the Publisher posted under a name this
 * Candidate answers to, newest deadline first (user stories 6 and 7).
 */
function filingsSection(ctx: RenderContext, candidate: Candidate): string {
  const { lang } = ctx;
  const reports = candidateReports(ctx, candidate);
  const filings = [...filingsOf(ctx, candidate.filings), ...reports];
  const list =
    filings.length === 0
      ? `<p class="empty">${esc(t(lang, 'candidate.filings.empty'))}</p>`
      : `<ul class="filings">\n${filings.map((f) => filingLine(ctx, f)).join('\n')}\n</ul>`;
  // A candidate with no report says so: this site's own bookkeeping never leaves a silent gap
  // where the reader cannot tell a missing report from a missing feature (user story 2).
  const none = reports.length === 0 ? `<p class="empty finance-reports-empty">${esc(t(lang, 'candidate.finance.empty'))}</p>` : '';
  return `<section aria-labelledby="candidate-filings">
<h2 id="candidate-filings">${esc(t(lang, 'candidate.filings'))}</h2>
<p class="intro">${esc(t(lang, 'candidate.filings.intro'))}</p>
${list}
${none}
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
