import { describe, expect, it } from 'vitest';
import { READER_VERSION } from '../src/elections/figures.js';
import { cityElections } from '../src/sources/city-elections.js';
import { cityFinance } from '../src/sources/city-finance.js';
import { electionFixtures, financeFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { daysAfter, Site } from './helpers.js';

const ELECTION = 'city-elections:2026-general';
const fixtures = { ...electionFixtures, ...financeFixtures };

/** Gilbert Gonzalez's July 15, 2026 report: the one the plain readable fixture stands in for. */
const READABLE = '23838';
/** Alyssa Cigarroa's, standing in for the same form written the awkward way a real writer does. */
const KERNED = '23812';
/** Gilbert Gonzalez's January 15, 2026 report: an amendment behind an original with a blank box. */
const AMENDED = '22178';
/** Dr. Victor D. Treviño's, standing in for the scan every real report for this cycle is. */
const SCANNED = '23842';

const ALIAS = `aliases:\n  ${ELECTION}:district-1:gilbert-gonzalez:\n    - Gilbert Gonzalez\n`;

describe('Elections 06: Figures copied from the report, then verified', () => {
  it('downloads each report the city posted for this cycle once and copies the four cover-sheet totals', async () => {
    const site = await Site.create();
    const { data, requests } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    // The four totals off the cover sheet, as the form prints them: the total contributions rather
    // than the unitemized subtotal printed above it, and the same for expenditures.
    const figure = data.figures.find((f) => f.documentId === READABLE)!;
    expect(figure).toMatchObject({
      id: 'city-finance:figure:23838',
      filingId: 'city-finance:filing:23838',
      totals: { contributions: 24310.75, expenditures: 18672.4, contributionsMaintained: 31208.06, outstandingLoans: 0 },
      verified: false,
      source: 'city-finance',
      publisher: 'city-of-laredo',
    });

    // The same form written the way a real filing is: the words spaced by kerning rather than by
    // spaces, some of them in hexadecimal, the amounts broken at their commas, and the stream's
    // length stated somewhere else in the document. Same four totals, read whole.
    expect(data.figures.find((f) => f.documentId === KERNED)!.totals).toEqual({
      contributions: 9004.2,
      expenditures: 3115.88,
      contributionsMaintained: 12660.55,
      outstandingLoans: 2500,
    });

    // The city's own filename for the document, kept for the owner and never read for a name.
    expect(data.filings.find((f) => f.documentId === READABLE)!.documentFilename).toBe('CFR D1 Gilbert Gonzalez 010126063026.pdf');

    // One download per report the city posted for the deadlines this site covers, and not one for
    // the decade of filings behind them: a first build costs minutes, not hours (user story 20).
    const downloads = requests.filter((r) => r.mode === 'download');
    expect(downloads).toHaveLength(21);
    expect(new Set(downloads.map((d) => d.url)).size).toBe(21);
  });

  it('leaves a report the extractor cannot read as a link with no Figure, and still publishes', async () => {
    const site = await Site.create();
    const log: string[] = [];
    const { data, report } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    expect(report.failed).toEqual([]);
    // Every other 2026 report is a scan from a copier with no text layer, which is the state of
    // every real filing today: the Filing stands, marked with the reader that gave up on it, and
    // carries no Figure.
    expect(data.filings.find((f) => f.documentId === SCANNED)!.unreadableBy).toBe(READER_VERSION);
    // And an amendment filed behind an original whose total contributions box was left blank is
    // refused outright rather than read half from one sheet and half from the other.
    expect(data.filings.find((f) => f.documentId === AMENDED)!.unreadableBy).toBe(READER_VERSION);
    expect(data.figures.map((f) => f.documentId).sort()).toEqual([KERNED, READABLE]);

    // A report with no Figure is the link it always was, saying nothing the site does not know.
    await site.writeHandKept(ALIAS);
    await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });
    const $ = await site.page('/en/elections/2026-general/district-1/');
    const january = $('table.race-table tbody tr').eq(1).find('td.finance').eq(0);
    expect(january.find('a').attr('href')).toContain(`/${AMENDED}/`);
    expect(january.text()).toContain('Report filed');
    expect(january.find('.figure').length).toBe(0);
    expect(january.text()).not.toContain('Awaiting review');

    // The owner is told which document could not be read, where the download gate draws its line,
    // and the two counts that say what is waiting on them (user story 18).
    expect(log.join('\n')).toContain(`city-finance: nothing could be read from document ${SCANNED}`);
    expect(log.join('\n')).toContain("483 report(s) filed before this site's earliest Election opened");
    expect(log).toContain('city-finance: 2 Figures awaiting review, 19 reports the extractor could not read');
  });

  it('downloads nothing on a second build, and still shows what it read the first time', async () => {
    const site = await Site.create();
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    const again = await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });
    expect(again.requests.filter((r) => r.mode === 'download')).toHaveLength(0);
    expect(again.report.newItems).toBe(0);
    expect(again.data.figures.find((f) => f.documentId === READABLE)!.totals.contributions).toBe(24310.75);
    // A report this reader already found nothing in is not opened again either.
    expect(again.data.filings.find((f) => f.documentId === SCANNED)!.unreadableBy).toBe(READER_VERSION);
  });

  it('asks again next run for a document the city’s store would not hand over', async () => {
    const site = await Site.create();
    const withOutage = {
      ...fixtures,
      'https://www.cityoflaredo.com/home/showpublisheddocument/23838/639197320934130000': { throws: 'net::ERR_TIMED_OUT' },
    };
    const log: string[] = [];
    const { data } = await site.build({ fixtures: withOutage, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    // Nothing was read and nothing was written off: a bad afternoon at the store is not a report
    // the extractor cannot read, and the Filing is still there with its link.
    expect(data.figures.some((f) => f.documentId === READABLE)).toBe(false);
    expect(data.filings.find((f) => f.documentId === READABLE)!.unreadableBy).toBeUndefined();
    expect(log.join('\n')).toContain(`city-finance: the city's store did not hand over document ${READABLE}`);

    const again = await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });
    expect(again.requests.filter((r) => r.mode === 'download' && r.url.includes(`/${READABLE}/`))).toHaveLength(1);
    expect(again.data.figures.find((f) => f.documentId === READABLE)!.totals.contributions).toBe(24310.75);
  });

  it('says awaiting review until the owner lists the document id, then shows all four totals', async () => {
    const site = await Site.create();
    await site.writeHandKept(ALIAS);
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    // Until the owner has checked the numbers against the PDF the site shows neither: the cell
    // says so and still opens the report, so a reader can check it themselves (user story 3).
    const before = await site.page('/en/elections/2026-general/district-1/');
    const cell = before('table.race-table tbody tr').eq(1).find('td.finance').eq(1);
    expect(cell.text()).toContain('Awaiting review');
    expect(cell.find('a').attr('href')).toContain(`/${READABLE}/`);
    expect(cell.find('.figure').length).toBe(0);

    await site.writeHandKept(`${ALIAS}verified:\n  - ${READABLE}\n`);
    await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });

    const amounts = ['$24,310.75', '$18,672.40', '$31,208.06', '$0.00'];
    for (const [lang, labels] of [
      ['en', ['Contributions', 'Expenditures', 'Contributions maintained', 'Outstanding loans']],
      ['es', ['Contribuciones', 'Gastos', 'Contribuciones mantenidas', 'Préstamos pendientes']],
    ] as const) {
      const $ = await site.page(`/${lang}/elections/2026-general/district-1/`);
      const verified = $('table.race-table tbody tr').eq(1).find('td.finance').eq(1);
      expect(verified.text()).not.toContain(lang === 'es' ? 'En revisión' : 'Awaiting review');
      expect(verified.find('.figure dt').map((_, dt) => $(dt).text()).get()).toEqual([...labels]);
      // The numbers are the filer's own, printed as the United States form prints them, in both
      // languages: this site does not restyle what it copied any more than it translates a name.
      expect(verified.find('.figure dd').map((_, dd) => $(dd).text()).get()).toEqual(amounts);

      // The Candidate page shows the same four numbers with the deadline the city filed the report
      // under, the link to it, and the day the site last saw it live (user story 8).
      const page = await site.page(`/${lang}/elections/2026-general/district-1/gilbert-gonzalez/`);
      const line = page('.filings li.finance-report').eq(0);
      expect(line.find('time.period').attr('datetime')).toBe('2026-07-15');
      expect(line.find('a').attr('href')).toContain(`/${READABLE}/`);
      expect(line.find('.meta time').attr('datetime')).toBe(daysAfter(FIXTURE_NOW, 1).toISOString());
      expect(line.find('.figure dd').map((_, dd) => page(dd).text()).get()).toEqual(amounts);
    }

    // A report the extractor could not read shows no totals however long the owner waits.
    const mayor = await site.page('/en/elections/2026-general/mayor/');
    expect(mayor('td.finance .figure').length).toBe(0);
  });

  it('tells the owner when a document id they verified has no totals behind it', async () => {
    const site = await Site.create();
    // The likeliest way into this: the owner opens a scan, reads the four numbers off the paper
    // with their own eyes, and lists the id. Nothing was copied, so nothing shows, and saying so
    // is the difference between a bug and a decision about OCR (user story 19).
    await site.writeHandKept(`aliases:\nverified:\n  - ${SCANNED}\n`);
    const log: string[] = [];
    const { data } = await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance], log });

    expect(data.figures.some((f) => f.documentId === SCANNED)).toBe(false);
    expect(log.join('\n')).toContain(`city-finance: "${SCANNED}" is verified in`);
    expect(log.join('\n')).toContain('no totals were read from that document, so nothing shows');
  });
});
