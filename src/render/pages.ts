import { addDays, daysBetween, formatDate } from '../dates.js';
import { DOCUMENT_KINDS, TOPICS, type Body, type DirectoryEntry, type Meeting, type PublisherId, type Topic } from '../domain.js';
import { allDirectoryEntries, PUBLISHER_ORDER } from '../directory/entries.js';
import { PROJECT_URL } from '../fetcher/types.js';
import { t, tKey } from '../i18n/strings.js';
import { swagitArchiveFor } from '../sources/legistar.js';
import { sourceById } from '../sources/index.js';
import { BODY_ACTIVE_MONTHS, href, PATHS, rootHref, UNREACHABLE_WARNING_DAYS, type RenderContext } from './context.js';
import { esc, layout, topicNav, type PageSpec } from './html.js';
import { comingUp, comingUpLine, isCouncil, itemLine, itemList, meetingLine, recentItems } from './items.js';

export function homePage(ctx: RenderContext): string {
  const { lang } = ctx;
  const upcoming = comingUp(ctx);
  const recent = recentItems(ctx, undefined, { withEvents: false });
  const body = `<h1>${esc(t(lang, 'home.title'))}</h1>
<p class="intro">${esc(t(lang, 'site.tagline'))}</p>
<section aria-labelledby="coming-up">
<h2 id="coming-up">${esc(t(lang, 'home.comingUp'))}</h2>
<p class="intro">${esc(t(lang, 'home.comingUp.intro'))}</p>
${upcoming.length ? `<ul class="items coming-up">\n${upcoming.map((e) => comingUpLine(ctx, e)).join('\n')}\n</ul>` : `<p class="empty">${esc(t(lang, 'home.comingUp.empty'))}</p>`}
</section>
<section aria-labelledby="new">
<h2 id="new">${esc(t(lang, 'home.new'))}</h2>
<p class="intro">${esc(t(lang, 'home.new.intro'))}</p>
${itemList(ctx, recent, t(lang, 'home.new.empty'))}
</section>
<section aria-labelledby="by-topic">
<h2 id="by-topic">${esc(t(lang, 'home.topics'))}</h2>
${topicNav(ctx)}
</section>`;
  return layout(ctx, { title: t(lang, 'home.title'), path: PATHS.home, body, description: t(lang, 'site.tagline') });
}

export function topicPage(ctx: RenderContext, topic: Topic): string {
  const { lang } = ctx;
  const name = t(lang, `topic.${topic}`);
  const items = recentItems(ctx, topic);
  const feed = href(ctx, PATHS.topicFeed(topic));
  const body = `<h1>${esc(name)}</h1>
<p class="intro">${esc(t(lang, 'topic.page.intro', { topic: name }))} <a href="${feed}">${esc(t(lang, 'topic.rss', { topic: name }))}</a></p>
${itemList(ctx, items, t(lang, 'topic.page.empty'))}
<h2>${esc(t(lang, 'topic.all'))}</h2>
${topicNav(ctx)}`;
  return layout(ctx, {
    title: name,
    path: PATHS.topic(topic),
    body,
    head: `<link rel="alternate" type="application/rss+xml" title="${esc(t(lang, 'topic.rss', { topic: name }))}" href="${feed}">\n`,
  });
}

/** Bodies with a Meeting in the last 12 months (or upcoming), City Council first, then alphabetical. */
export function activeBodies(ctx: RenderContext): Body[] {
  const cutoff = addDays(ctx.today, -BODY_ACTIVE_MONTHS * 30);
  const withRecent = new Set(ctx.data.meetings.filter((m) => m.date >= cutoff).map((m) => m.bodyId));
  return ctx.data.bodies
    .filter((b) => withRecent.has(b.id))
    .sort((a, b) => Number(!!b.primary) - Number(!!a.primary) || a.name.localeCompare(b.name));
}

function bodyFilter(ctx: RenderContext, current?: string): string {
  const { lang } = ctx;
  const all = `<li><a href="${href(ctx, PATHS.meetings)}"${current ? '' : ' aria-current="page"'}>${esc(t(lang, 'meetings.allBodies'))}</a></li>`;
  const bodies = activeBodies(ctx)
    .map((b) => `<li><a href="${href(ctx, PATHS.body(b.id))}"${current === b.id ? ' aria-current="page"' : ''}>${esc(b.name)}</a></li>`)
    .join('');
  return `<nav class="body-filter" aria-label="${esc(t(lang, 'meetings.filterByBody'))}"><h2>${esc(t(lang, 'meetings.filterByBody'))}</h2><ul>${all}${bodies}</ul></nav>`;
}

function byDateThenCouncil(ctx: RenderContext, direction: 1 | -1) {
  return (a: Meeting, b: Meeting): number => {
    if (a.date !== b.date) return a.date < b.date ? -direction : direction;
    return Number(isCouncil(ctx, b)) - Number(isCouncil(ctx, a)) || a.bodyName.localeCompare(b.bodyName);
  };
}

export function meetingsPage(ctx: RenderContext, bodyId?: string): string {
  const { lang } = ctx;
  const bodyRec = bodyId ? ctx.data.bodies.find((b) => b.id === bodyId) : undefined;
  const meetings = ctx.data.meetings.filter((m) => !bodyId || m.bodyId === bodyId);
  const upcoming = meetings.filter((m) => m.date >= ctx.today).sort(byDateThenCouncil(ctx, 1));
  const past = meetings.filter((m) => m.date < ctx.today && (bodyId || m.date >= ctx.windowStart)).sort(byDateThenCouncil(ctx, -1));
  const title = bodyRec ? bodyRec.name : t(lang, 'meetings.title');
  const section = (heading: string, list: Meeting[]) =>
    `<h2>${esc(heading)}</h2>${list.length ? `<ul class="meetings-list">\n${list.map((m) => meetingLine(ctx, m)).join('\n')}\n</ul>` : `<p class="empty">${esc(t(lang, 'meetings.empty'))}</p>`}`;
  const body = `<h1>${esc(title)}</h1>
<p class="intro">${esc(bodyRec ? t(lang, 'meetings.body.intro', { body: bodyRec.name }) : t(lang, 'meetings.intro'))}</p>
${bodyFilter(ctx, bodyId)}
${section(t(lang, 'meetings.upcoming'), upcoming)}
${section(bodyRec ? t(lang, 'meetings.past').replace(/ 90.*$/, '') : t(lang, 'meetings.past'), past)}`;
  return layout(ctx, { title, path: bodyId ? PATHS.body(bodyId) : PATHS.meetings, body });
}

export function meetingPage(ctx: RenderContext, meeting: Meeting): string {
  const { lang } = ctx;
  const docs = DOCUMENT_KINDS.filter((k) => meeting.documents[k]).map(
    (k) => `<li><a href="${esc(meeting.documents[k]!.url)}" rel="noopener">${esc(t(lang, `document.${k}`))}</a></li>`,
  );
  if (!meeting.documents.video) {
    docs.push(`<li><a href="${esc(swagitArchiveFor(meeting.bodyId))}" rel="noopener">${esc(t(lang, 'meetings.videoArchive'))}</a></li>`);
  }
  const title = `${meeting.bodyName}, ${formatDate(lang, meeting.date, 'short')}`;
  const body = `<h1>${esc(meeting.bodyName)}${meeting.cancelled ? ` <span class="badge cancelled">${esc(t(lang, 'meetings.cancelled'))}</span>` : ''}</h1>
${meeting.cancelled ? `<p class="warning">${esc(t(lang, 'meetings.cancelled'))}</p>` : ''}
<dl>
<dt>${esc(t(lang, 'item.date'))}</dt><dd><time datetime="${meeting.date}">${esc(formatDate(lang, meeting.date, 'long'))}</time></dd>
<dt>${esc(t(lang, 'meetings.time'))}</dt><dd>${esc(meeting.time ?? t(lang, 'meetings.timeTbd'))}</dd>
<dt>${esc(t(lang, 'meetings.body'))}</dt><dd><a href="${href(ctx, PATHS.body(meeting.bodyId))}">${esc(meeting.bodyName)}</a></dd>
${meeting.location ? `<dt>${esc(t(lang, 'meetings.location'))}</dt><dd>${esc(meeting.location)}</dd>` : ''}
<dt>${esc(t(lang, 'item.publisher'))}</dt><dd>${esc(t(lang, `publisher.${meeting.publisher}`))}</dd>
</dl>
<h2>${esc(t(lang, 'meetings.documents'))}</h2>
${DOCUMENT_KINDS.some((k) => meeting.documents[k]) ? '' : `<p>${esc(t(lang, 'meetings.documents.none'))}</p>`}
<ul class="docs">
${docs.join('\n')}
</ul>
<p><a href="${esc(meeting.url)}" rel="noopener">${esc(t(lang, 'meetings.officialPage'))}</a></p>`;
  return layout(ctx, { title, path: PATHS.meeting(meeting.id), body });
}

function healthBlock(ctx: RenderContext, entry: DirectoryEntry): string {
  const { lang } = ctx;
  const health = ctx.data.sources[entry.id] ?? {};
  const now = ctx.now.toISOString();
  const lines: string[] = [];
  lines.push(health.lastChecked ? t(lang, 'directory.lastChecked', { date: formatDate(lang, health.lastChecked, 'short') }) : t(lang, 'directory.lastChecked.never'));
  lines.push(health.lastNewItem ? t(lang, 'directory.lastNewItem', { date: formatDate(lang, health.lastNewItem, 'short') }) : t(lang, 'directory.lastNewItem.never'));
  let warning = '';
  if (health.lastSuccess) {
    if (daysBetween(health.lastSuccess, now) >= UNREACHABLE_WARNING_DAYS) {
      warning = t(lang, 'directory.warning.unreachable', { date: formatDate(lang, health.lastSuccess, 'short') });
    }
  } else if (health.firstChecked && daysBetween(health.firstChecked, now) >= UNREACHABLE_WARNING_DAYS) {
    warning = t(lang, 'directory.warning.neverReached');
  }
  return `<p class="health">${lines.map(esc).join(' · ')}</p>${warning ? `<p class="warning" role="alert"><strong>${esc(t(lang, 'health.warning'))}:</strong> ${esc(warning.replace(/^(Warning|Aviso): /, ''))}</p>` : ''}`;
}

function directoryEntry(ctx: RenderContext, entry: DirectoryEntry): string {
  const { lang } = ctx;
  const name = tKey(lang, `${entry.stringsKey}.name`);
  const rows: string[] = [`<dt>${esc(t(lang, 'directory.updates'))}</dt><dd>${esc(tKey(lang, `${entry.stringsKey}.cadence`))}</dd>`];
  if (entry.hasSearchWith) rows.push(`<dt>${esc(t(lang, 'directory.searchWith'))}</dt><dd>${esc(tKey(lang, `${entry.stringsKey}.searchWith`))}</dd>`);
  const source = sourceById(entry.id);
  if (source) {
    rows.push(`<dt>${esc(t(lang, 'directory.topicRule'))}</dt><dd>${esc(t(lang, source.topicRule.stringsKey as 'topicRule.legistar'))}</dd>`);
  }
  const social = entry.socialOnly ? `<p class="warning">${esc(t(lang, `directory.socialOnly.${entry.socialOnly}`))}</p>` : '';
  return `<li id="${esc(entry.id)}">
<h3>${esc(name)}</h3>
<p class="kind">${esc(t(lang, `directory.kind.${entry.kind}`))}</p>
<p>${esc(tKey(lang, `${entry.stringsKey}.description`))}</p>
${social}<dl>${rows.join('')}</dl>
${entry.kind === 'feed' ? healthBlock(ctx, entry) : ''}
<p><a href="${esc(entry.url)}" rel="noopener">${esc(t(lang, 'directory.open'))}: ${esc(name)}</a> · <small>${esc(t(lang, 'directory.lastVerified', { date: formatDate(lang, entry.lastVerified, 'short') }))}</small></p>
</li>`;
}

export function directoryPage(ctx: RenderContext): string {
  const { lang } = ctx;
  const entries = allDirectoryEntries();
  const groups = PUBLISHER_ORDER.map((publisher: PublisherId) => ({ publisher, entries: entries.filter((e) => e.publisher === publisher) })).filter((g) => g.entries.length);
  const body = `<h1>${esc(t(lang, 'directory.title'))}</h1>
<p class="intro">${esc(t(lang, 'directory.intro'))}</p>
${groups
  .map(
    (g) => `<section aria-labelledby="pub-${g.publisher}">
<h2 id="pub-${g.publisher}">${esc(t(lang, `publisher.${g.publisher}`))}</h2>
<ul class="entries">
${g.entries.map((e) => directoryEntry(ctx, e)).join('\n')}
</ul>
</section>`,
  )
  .join('\n')}`;
  return layout(ctx, { title: t(lang, 'directory.title'), path: PATHS.directory, body });
}

export function searchPage(ctx: RenderContext): string {
  const { lang } = ctx;
  const recent = recentItems(ctx).slice(0, 50);
  const labels = {
    results: t(lang, 'search.results', { count: '{count}' }),
    one: t(lang, 'search.results.one'),
    none: t(lang, 'search.noResults'),
    loading: t(lang, 'search.loading'),
    topics: Object.fromEntries(TOPICS.map((topic) => [topic, t(lang, `topic.${topic}`)])),
    publishers: Object.fromEntries(PUBLISHER_ORDER.map((p) => [p, t(lang, `publisher.${p}`)])),
    locale: lang === 'es' ? 'es-MX' : 'en-US',
    index: rootHref(ctx, '/search-index.json'),
    topicHref: href(ctx, PATHS.topic('TOPIC')),
    meetingHref: href(ctx, PATHS.meeting('ID')),
    officialDocument: t(lang, 'item.officialDocument'),
  };
  const body = `<h1>${esc(t(lang, 'search.title'))}</h1>
<p class="intro">${esc(t(lang, 'search.intro'))}</p>
<form class="search" role="search" action="${href(ctx, PATHS.search)}" method="get">
<label for="q">${esc(t(lang, 'search.label'))}</label>
<input id="q" name="q" type="search" autocomplete="off">
<button type="submit">${esc(t(lang, 'search.button'))}</button>
</form>
<div id="results" aria-live="polite"></div>
<noscript><p>${esc(t(lang, 'search.noscript'))}</p>${itemList(ctx, recent, t(lang, 'home.new.empty'))}</noscript>`;
  const script = searchScript(JSON.stringify(labels));
  return layout(ctx, { title: t(lang, 'search.title'), path: PATHS.search, body, script });
}

/** First-party, inline, tiny. Fetches the index once and filters titles by every typed word. */
function searchScript(labelsJson: string): string {
  return `(function(){
var L=${labelsJson};var input=document.getElementById('q');var out=document.getElementById('results');var form=document.querySelector('form.search');var index=null;var loading=null;
function fold(s){return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function fmt(d){try{var dt=/^\\d{4}-\\d{2}-\\d{2}$/.test(d)?new Date(d+'T12:00:00Z'):new Date(d);return new Intl.DateTimeFormat(L.locale,{timeZone:'America/Chicago',month:'short',day:'numeric',year:'numeric'}).format(dt);}catch(e){return d;}}
function load(){if(!loading){loading=fetch(L.index).then(function(r){return r.json();}).then(function(j){index=j;return j;});}return loading;}
function render(q){var words=fold(q).split(/\\s+/).filter(Boolean);if(!words.length){out.innerHTML='';return;}
var hits=index.filter(function(it){var h=fold(it.t);return words.every(function(w){return h.indexOf(w)>=0;});});
hits.sort(function(a,b){return a.d<b.d?1:a.d>b.d?-1:0;});
var head='<p>'+(hits.length===1?L.one:L.results.replace('{count}',hits.length))+'</p>';
if(!hits.length){out.innerHTML='<p>'+esc(L.none)+'</p>';return;}
out.innerHTML=head+'<ul class="items">'+hits.slice(0,200).map(function(it){var href=it.m?L.meetingHref.replace('ID',it.m):it.u;var doc=it.m?'<span class="sep" aria-hidden="true">·</span><a href="'+esc(it.u)+'" rel="noopener">'+esc(L.officialDocument)+'</a>':'';return '<li><a class="title" href="'+esc(href)+'" rel="noopener">'+esc(it.t)+'</a><span class="meta">'+esc(L.publishers[it.p]||it.p)+'<span class="sep" aria-hidden="true">·</span><time datetime="'+esc(it.d)+'">'+esc(fmt(it.d))+'</time><span class="sep" aria-hidden="true">·</span><a href="'+esc(L.topicHref.replace('TOPIC',it.o))+'">'+esc(L.topics[it.o]||it.o)+'</a>'+doc+'</span></li>';}).join('')+'</ul>';}
function run(){var q=input.value;if(!q.trim()){out.innerHTML='';return;}out.innerHTML='<p>'+esc(L.loading)+'</p>';load().then(function(){render(q);});}
form.addEventListener('submit',function(e){e.preventDefault();run();try{history.replaceState(null,'','?q='+encodeURIComponent(input.value));}catch(err){}});
input.addEventListener('input',function(){if(index){render(input.value);}});
try{var m=/[?&]q=([^&]*)/.exec(location.search);if(m){input.value=decodeURIComponent(m[1].replace(/\\+/g,' '));run();}}catch(e){}
})();`;
}

export function aboutPage(ctx: RenderContext): string {
  const { lang } = ctx;
  const body = `<h1>${esc(t(lang, 'about.title'))}</h1>
<p>${esc(t(lang, 'about.what'))}</p>
<p>${esc(t(lang, 'about.how'))}</p>
<p>${esc(t(lang, 'about.official'))}</p>
<p>${esc(t(lang, 'about.language'))}</p>
<p>${esc(t(lang, 'about.contact'))} <a href="${PROJECT_URL}">${PROJECT_URL}</a></p>
<h2>${esc(t(lang, 'nav.topics'))}</h2>
${topicNav(ctx)}`;
  return layout(ctx, { title: t(lang, 'about.title'), path: PATHS.about, body });
}

export type { PageSpec };
