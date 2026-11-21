/**
 * Branch review of feat/laredo-elections, findings 1, 2 and 5
 * (.scratch/laredo-elections/reviews/00-branch-review.md). Three things the recorded pages do not
 * exercise, because each of them is the city changing what it printed:
 *
 * - a Candidate has to stay the same Candidate when the city fills in or corrects a legal name,
 * - a date the city typed wrong must not take the whole Source down with it,
 * - a Race heading with nothing in it to make a URL from must not take the whole site down.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cityElections, GENERAL_CANDIDATES_URL } from '../src/sources/city-elections.js';
import { cityFinance } from '../src/sources/city-finance.js';
import { electionFixtures, financeFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { fixtureRoot } from './fixtures/paths.js';
import { daysAfter, Site } from './helpers.js';

const ELECTION = 'city-elections:2026-general';
const MAYOR = `${ELECTION}:mayor`;
const fixtures = { ...electionFixtures, ...financeFixtures };

/**
 * The recorded candidates page with one thing about it changed, the way the city changes its own
 * page between two runs. A patch that matched nothing means the markup has moved and the test is
 * no longer testing what it says it is, so it fails there rather than passing for the wrong reason.
 */
async function citySite(edits: readonly [string, string][]): Promise<Record<string, string>> {
  let html = await readFile(path.join(fixtureRoot, 'city-elections/general-2026-candidates.html'), 'utf8');
  for (const [from, to] of edits) {
    if (!html.includes(from)) throw new Error(`the recorded page no longer contains ${JSON.stringify(from)}`);
    html = html.replaceAll(from, to);
  }
  return { [GENERAL_CANDIDATES_URL]: html };
}

describe('Branch review 1: a Candidate the city renames is the same Candidate', () => {
  it('keeps the id, the page and the owner’s Alias when the city corrects the legal name it printed', async () => {
    const site = await Site.create();
    // The mayor's Candidate is the Race and the name he is on the ballot under, so the owner's
    // Alias for the way the city spells him on its finance page is declared against that.
    const trevino = `${MAYOR}:victor-d-trevino`;
    await site.writeHandKept(`aliases:\n  ${trevino}:\n    - Dr. Victor D. Treviño\n`);

    const first = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });
    const before = first.data.candidates.filter((c) => c.raceId === MAYOR);
    expect(before.map((c) => c.id)).toContain(trevino);
    expect(first.data.filings.find((f) => f.documentId === '23842')!.attachedTo).toEqual([trevino]);

    // The next run, with the city's own table corrected: the same person, spelled in full.
    const corrected = await citySite([['<td>Victor Daniel Trevino</td>', '<td>Victor Daniel Treviño Jr.</td>']]);
    const { data } = await site.build({
      fixtures: { ...fixtures, ...corrected },
      now: daysAfter(FIXTURE_NOW, 1),
      sources: [cityElections, cityFinance],
    });

    const after = data.candidates.filter((c) => c.raceId === MAYOR);
    // Nobody was added: the Race still has the five people the city listed, under the same ids.
    // (The data file is stored sorted by id, so the run's own ballot order is in `order`.)
    expect(after.map((c) => c.id).sort()).toEqual(before.map((c) => c.id).sort());
    const mayor = after.find((c) => c.id === trevino)!;
    // The correction shows on his page, because the name is what the city prints today.
    expect(mayor.name).toBe('Victor Daniel Treviño Jr.');
    expect(mayor.slug).toBe('victor-d-trevino');
    // And his reports still answer to the Alias the owner declared before the city changed it.
    expect(data.filings.find((f) => f.documentId === '23842')!.attachedTo).toEqual([trevino]);

    // His page is still his page: the ballot name heads it, and the corrected legal name is on it.
    const page = await site.page('/en/elections/2026-general/mayor/victor-d-trevino/');
    expect(page('h1').text()).toContain('Victor D. Trevino');
    expect(page('body').text()).toContain('Victor Daniel Treviño Jr.');
    // No second page under the new spelling of his legal name.
    expect(await site.exists('/en/elections/2026-general/mayor/victor-daniel-trevino-jr/')).toBe(false);
  });
});

describe('Branch review 2: a date the city typed wrong', () => {
  it('reports the forum button the site cannot read a date in and keeps the rest of the Election', async () => {
    const site = await Site.create();
    // "13-45-26": the city's own typo, a month and a day that are not on any calendar.
    const typo = await citySite([['Mayor - Tuesday, 10-06-26 at 7:30 pm', 'Mayor - Tuesday, 13-45-26 at 7:30 pm']]);
    const log: string[] = [];
    const { data, report } = await site.build({ fixtures: { ...fixtures, ...typo }, now: FIXTURE_NOW, sources: [cityElections], log });

    expect(report.failed).toEqual([]);
    const election = data.elections.find((e) => e.id === ELECTION)!;
    // The five forums the city dated readably are still scheduled; the sixth is not invented.
    expect(election.forums).toHaveLength(5);
    expect(election.forums.every((f) => f.label !== 'Mayor')).toBe(true);
    expect(log.join('\n')).toContain('Mayor - Tuesday, 13-45-26 at 7:30 pm');
    // The Election page still publishes, with everything else the city put on it.
    expect(await site.exists('/en/elections/2026-general/')).toBe(true);
  });
});

describe('Branch review 5: a Race heading with no letters or digits', () => {
  it('leaves that Race out, tells the owner, and still publishes every other page', async () => {
    const site = await Site.create();
    const blank = await citySite([['<div class="title">District 6</div>', '<div class="title">***</div>']]);
    const log: string[] = [];
    const { data, report } = await site.build({ fixtures: { ...fixtures, ...blank }, now: FIXTURE_NOW, sources: [cityElections], log });

    expect(report.failed).toEqual([]);
    // Every Race keeps a slug that can be a URL, and the unreadable heading is not one of them.
    expect(data.races.every((r) => r.slug.length > 0)).toBe(true);
    expect(data.races.some((r) => r.title === '***')).toBe(false);
    expect(log.join('\n')).toContain('***');
    // The rest of the site is published: one bad heading is not an outage.
    expect(await site.exists('/en/elections/2026-general/mayor/')).toBe(true);
    expect(await site.exists('/en/elections/2026-general/district-6/')).toBe(false);
  });
});
