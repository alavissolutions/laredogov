import { describe, expect, it } from 'vitest';
import { cityElections } from '../src/sources/city-elections.js';
import { cityFinance } from '../src/sources/city-finance.js';
import { electionFixtures, financeFixtures, FIXTURE_NOW } from './fixtures/fetcher.js';
import { daysAfter, Site } from './helpers.js';

const ELECTION = 'city-elections:2026-general';
const fixtures = { ...electionFixtures, ...financeFixtures };

/** Gilbert Gonzalez's July 15, 2026 report: the one document the readable fixture stands in for. */
const READABLE = '23838';

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
    // every real filing today: the Filing stands, marked, and carries no Figure.
    const scanned = data.filings.find((f) => f.documentId === '23842')!;
    expect(scanned.unreadable).toBe(true);
    expect(data.figures.some((f) => f.documentId === '23842')).toBe(false);
    expect(data.figures).toHaveLength(1);

    // The owner is told which document could not be read, and the run ends with the two counts
    // that say what is waiting on them (user story 18).
    expect(log.join('\n')).toContain('city-finance: nothing could be read from document 23842');
    expect(log).toContain('city-finance: 1 Figure awaiting review, 20 reports the extractor could not read');
  });

  it('downloads nothing on a second build, and still shows what it read the first time', async () => {
    const site = await Site.create();
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    const again = await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });
    expect(again.requests.filter((r) => r.mode === 'download')).toHaveLength(0);
    expect(again.report.newItems).toBe(0);
    expect(again.data.figures.find((f) => f.documentId === READABLE)!.totals.contributions).toBe(24310.75);
    // A report the extractor could not read is not tried again every run either.
    expect(again.data.filings.find((f) => f.documentId === '23842')!.unreadable).toBe(true);
  });

  it('says awaiting review until the owner lists the document id, then shows all four totals', async () => {
    const site = await Site.create();
    await site.writeHandKept(`aliases:\n  ${ELECTION}:district-1:gilberto-gonzalez:\n    - Gilbert Gonzalez\n`);
    await site.build({ fixtures, now: FIXTURE_NOW, sources: [cityElections, cityFinance] });

    // Until the owner has checked the numbers against the PDF the site shows neither: the cell
    // says so and still opens the report, so a reader can check it themselves (user story 3).
    const before = await site.page('/en/elections/2026-general/district-1/');
    const cell = before('table.race-table tbody tr').eq(1).find('td.finance').eq(1);
    expect(cell.text()).toContain('Awaiting review');
    expect(cell.find('a').attr('href')).toContain('/23838/');
    expect(cell.find('.figure').length).toBe(0);

    await site.writeHandKept(
      `aliases:\n  ${ELECTION}:district-1:gilberto-gonzalez:\n    - Gilbert Gonzalez\nverified:\n  - ${READABLE}\n`,
    );
    await site.build({ fixtures, now: daysAfter(FIXTURE_NOW, 1), sources: [cityElections, cityFinance] });

    for (const [lang, labels] of [
      ['en', ['Contributions', 'Expenditures', 'Contributions maintained', 'Outstanding loans']],
      ['es', ['Contribuciones', 'Gastos', 'Contribuciones mantenidas', 'Préstamos pendientes']],
    ] as const) {
      const $ = await site.page(`/${lang}/elections/2026-general/district-1/`);
      const verified = $('table.race-table tbody tr').eq(1).find('td.finance').eq(1);
      expect(verified.text()).not.toContain(lang === 'es' ? 'En revisión' : 'Awaiting review');
      expect(verified.find('.figure dt').map((_, dt) => $(dt).text()).get()).toEqual([...labels]);
      const amounts = lang === 'es' ? ['$24,310.75', '$18,672.40', '$31,208.06', '$0.00'] : ['$24,310.75', '$18,672.40', '$31,208.06', '$0.00'];
      expect(verified.find('.figure dd').map((_, dd) => $(dd).text()).get()).toEqual(amounts);

      // The Candidate page shows the same four numbers with the deadline the city filed the report
      // under, the link to it, and the day the site last saw it live (user story 8).
      const page = await site.page(`/${lang}/elections/2026-general/district-1/gilbert-gonzalez/`);
      const line = page('.filings li.finance-report').eq(0);
      expect(line.find('time.period').attr('datetime')).toBe('2026-07-15');
      expect(line.find('a').attr('href')).toContain('/23838/');
      expect(line.find('.meta time').attr('datetime')).toBe(daysAfter(FIXTURE_NOW, 1).toISOString());
      expect(line.find('.figure dd').map((_, dd) => page(dd).text()).get()).toEqual(amounts);
    }

    // A report with no Figure is still a link and says nothing it does not know.
    const mayor = await site.page('/en/elections/2026-general/mayor/');
    expect(mayor('td.finance .figure').length).toBe(0);
  });
});
