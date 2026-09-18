/**
 * Branch review of feat/laredo-elections, finding 4
 * (.scratch/laredo-elections/reviews/00-branch-review.md). The city runs more than one host under
 * its own domain — its payments portal is `click2gov.cityoflaredo.com` — so a reader sent to
 * `www` instead of the host the city linked lands on a 404.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cityElections, GENERAL_ELECTION_URL } from '../src/sources/city-elections.js';
import { cityHref } from '../src/sources/city.js';
import { electionFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { fixtureRoot } from './fixtures/paths.js';
import { Site } from './helpers.js';

/** The city's own document link on the recorded Election page, and what the city writes it as. */
const LINKED_DOCUMENT = '/home/showpublisheddocument/13768/638398674733770000';
const PORTAL = 'http://click2gov.cityoflaredo.com/Click2GovPI/login.html';

describe('Branch review 4: a link to another of the city’s own hosts', () => {
  it('sends the reader to the host the city linked, on https', async () => {
    let html = await readFile(path.join(fixtureRoot, 'city-elections/general-2026.html'), 'utf8');
    if (!html.includes(LINKED_DOCUMENT)) throw new Error('the recorded Election page no longer holds the link this test replaces');
    html = html.replace(LINKED_DOCUMENT, PORTAL);

    const site = await Site.create();
    const { data } = await site.build({
      fixtures: { ...electionFixtures, [GENERAL_ELECTION_URL]: html },
      now: FIXTURE_NOW,
      sources: [cityElections],
    });

    const link = data.elections.find((e) => e.id === 'city-elections:2026-general')!.links.find((l) => l.label === 'Political Sign Regulations')!;
    // The protocol is upgraded, because the city's CMS writes some of its own links as http.
    // The hostname is the city's own and is left alone.
    expect(link.url).toBe('https://click2gov.cityoflaredo.com/Click2GovPI/login.html');
    const page = await site.file('/en/elections/2026-general/');
    expect(page).toContain('https://click2gov.cityoflaredo.com/Click2GovPI/login.html');
  });

  it('still sends the bare domain to www, and still refuses a lookalike host', () => {
    // The apex is the one hostname the city's own site redirects, so it is the one that is mapped.
    expect(cityHref('http://cityoflaredo.com/departments/elections')).toBe('https://www.cityoflaredo.com/departments/elections');
    expect(cityHref('https://www.cityoflaredo.com/departments/elections')).toBe('https://www.cityoflaredo.com/departments/elections');
    // `evilcityoflaredo.com` is not the City of Laredo: it is left exactly as the page wrote it.
    expect(cityHref('http://evilcityoflaredo.com/elections')).toBe('http://evilcityoflaredo.com/elections');
  });
});
