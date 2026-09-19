/**
 * Writes the campaign finance report fixtures the Figure extractor is tested against
 * (spec: .scratch/laredo-elections/spec.md, issue 06):
 *
 *   npm run make:pdf-fixtures
 *
 * Every other fixture in this repo is a real capture. These cannot be. Every campaign finance
 * report the City of Laredo has posted for the 2026 cycle is a scanned image from a copier
 * (producer `SECnvtToPDF V1.0`, no `/Font` object, one image per page, 1.3 MB to 20 MB), so there
 * is no readable report to record, and a real scan is both too large to commit and a document this
 * project does not rehost (ADR-0001).
 *
 * So four reports are written here, all filed by people who do not exist, with totals that are not
 * anybody's. The layout follows the Texas Ethics Commission's FORM C/OH cover sheet closely enough
 * to exercise what the reader has to get right, and no closer: the box numbering and the exact
 * wording of the boxes this site does not read are approximate, and nothing here should be taken
 * as a description of the real form. What the totals boxes say is verbatim, because that is what
 * the reader matches on.
 *
 * Nothing in `src/` depends on this file; it exists so the bytes under `test/fixtures/city-finance`
 * are reproducible and reviewable rather than opaque.
 */
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureRoot } from '../test/fixtures/paths.js';

interface Totals {
  unitemizedContributions: string;
  contributions: string;
  unitemizedExpenditures: string;
  expenditures: string;
  contributionsMaintained: string;
  outstandingLoans: string;
}

/**
 * The six totals boxes, in the Ethics Commission's own wording, which is what the reader matches
 * on. Boxes 17 and 19 are the unitemized subtotals: their labels carry most of the labels of 18
 * and 20, so a reader that matched loosely would copy the subtotal and call it the total. An empty
 * string is a box the filer left blank, which leaves the numbering of the box below it sitting
 * where its amount should be.
 */
function totalsRows(totals: Totals): string[] {
  const row = (n: number, label: string, amount: string) => `${n}. ${label}   $ ${amount}`.trimEnd();
  return [
    row(17, 'TOTAL UNITEMIZED POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS)', totals.unitemizedContributions),
    row(18, 'TOTAL POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS)', totals.contributions),
    row(19, 'TOTAL UNITEMIZED POLITICAL EXPENDITURES', totals.unitemizedExpenditures),
    row(20, 'TOTAL POLITICAL EXPENDITURES', totals.expenditures),
    row(21, 'TOTAL POLITICAL CONTRIBUTIONS MAINTAINED AS OF THE LAST DAY OF REPORTING PERIOD', totals.contributionsMaintained),
    row(22, 'TOTAL PRINCIPAL AMOUNT OF ALL OUTSTANDING LOANS AS OF THE LAST DAY OF REPORTING PERIOD', totals.outstandingLoans),
  ];
}

/** One cover sheet: what a filer fills in above the totals, the totals, and the affidavit below. */
function coverSheet(filer: string, totals: Totals): string[] {
  return [
    'CANDIDATE/OFFICEHOLDER   FORM C/OH',
    'CAMPAIGN FINANCE REPORT   COVER SHEET PG 1',
    'Filer ID (Ethics Commission Filers)   Total pages filed: 6',
    'CANDIDATE / OFFICEHOLDER NAME   MS / MRS / MR   FIRST   MI',
    filer,
    'CANDIDATE / OFFICEHOLDER MAILING ADDRESS   CITY; STATE; ZIP CODE',
    '000 Example Street, Nowhere, TX 00000',
    'REPORT TYPE   [ ] JANUARY 15   [X] JULY 15   [ ] 30th Day Before Election',
    'PERIOD COVERED   Month Day Year   01/01/2026   THROUGH   06/30/2026',
    'ELECTION   ELECTION DATE   Month Day Year   11/03/2026   [X] GENERAL',
    'OFFICE HELD (if any)   Example Office',
    'OFFICE SOUGHT (if known)   Example Office',
    ...totalsRows(totals),
    'I swear, or affirm, under penalty of perjury, that the accompanying report is true and correct',
    'and includes all information required to be reported by me under Title 15, Election Code.',
  ];
}

/** A PDF string literal: the three characters a literal cannot hold raw, escaped. */
function pdfString(text: string): string {
  return `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`;
}

/** The same text as a hexadecimal string, the other way PDF writes one. */
function pdfHexString(text: string): string {
  return `<${Buffer.from(text, 'latin1').toString('hex').toUpperCase()}>`;
}

/** One `BT ... ET` block per line, laid down the page as a form's rows are. */
function plainContent(lines: readonly string[]): Buffer {
  const body = lines.map((line, i) => `BT /F1 9 Tf 1 0 0 1 36 ${750 - i * 14} Tm ${pdfString(line)} Tj ET`).join('\n');
  return Buffer.from(`${body}\n`, 'latin1');
}

/**
 * The same rows written the way a real writer lays out justified text: one `TJ` array per row,
 * with the spacing between words carried by kerning numbers rather than by spaces, every third
 * label as a hexadecimal string, and each grouped amount broken at its comma by a kern wide enough
 * to look like a space. A reader that turned every wide kern into a space would read $24,310.75 as
 * $24 and stop there, which is the thing this shape exists to catch.
 */
function kernedContent(lines: readonly string[]): Buffer {
  const body = lines
    .map((line, row) => {
      const parts: string[] = [];
      line.split(/\s+/).forEach((word, index) => {
        if (index > 0) parts.push('-250');
        const grouped = /^(\d{1,3},)(\d{3}\.\d{2})$/.exec(word);
        if (grouped) parts.push(pdfString(grouped[1]!), '-120', pdfString(grouped[2]!));
        else parts.push(row % 3 === 2 ? pdfHexString(word) : pdfString(word));
      });
      return `BT /F1 9 Tf 1 0 0 1 36 ${750 - row * 14} Tm [${parts.join(' ')}] TJ ET`;
    })
    .join('\n');
  return Buffer.from(`${body}\n`, 'latin1');
}

/**
 * Assembles a PDF 1.4 from object bodies numbered from 1, with the cross-reference table the
 * offsets work out to. Object 1 is always the catalog.
 */
function pdf(objects: readonly (string | Buffer)[]): Buffer {
  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  const offsets: number[] = [];
  let at = parts[0]!.length;
  objects.forEach((object, index) => {
    const bytes = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, 'latin1'),
      typeof object === 'string' ? Buffer.from(object, 'latin1') : object,
      Buffer.from('\nendobj\n', 'latin1'),
    ]);
    offsets.push(at);
    parts.push(bytes);
    at += bytes.length;
  });
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    'trailer',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    'startxref',
    String(at),
    '%%EOF',
    '',
  ].join('\n');
  return Buffer.concat([...parts, Buffer.from(xref, 'latin1')]);
}

function stream(dict: string, bytes: Buffer, length = String(bytes.length)): Buffer {
  return Buffer.concat([
    Buffer.from(`<< ${dict} /Length ${length} >>\nstream\n`, 'latin1'),
    bytes,
    Buffer.from('\nendstream', 'latin1'),
  ]);
}

const CATALOG = '<< /Type /Catalog /Pages 2 0 R >>';
const PAGES = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
const HELVETICA = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
const TEXT_PAGE = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>';

/** A report with a text layer, written the plain way: literal strings, deflated, length stated. */
function plainReport(lines: readonly string[]): Buffer {
  return pdf([CATALOG, PAGES, TEXT_PAGE, stream('/Filter /FlateDecode', deflateSync(plainContent(lines))), HELVETICA]);
}

/**
 * The same report written awkwardly: kerned `TJ` arrays, hexadecimal strings, no compression, and
 * a `/Length` that is an indirect reference, which is common in real filings and means the reader
 * has to find the end of the stream for itself.
 */
function kernedReport(lines: readonly string[]): Buffer {
  const content = kernedContent(lines);
  return pdf([CATALOG, PAGES, TEXT_PAGE, stream('', content, '6 0 R'), HELVETICA, String(content.length)]);
}

/**
 * A report with no text layer: one image drawn over the page, no font, nothing to read. Every
 * report the city has posted for this cycle is this, at a thousand times the size.
 */
function scannedReport(): Buffer {
  // Two pixels of grey: enough to be a real image object, small enough to commit.
  const image = deflateSync(Buffer.from([0x80, 0x40]));
  return pdf([
    CATALOG,
    PAGES,
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    stream('', Buffer.from('q 612 0 0 792 0 0 cm /Im0 Do Q\n', 'latin1')),
    stream('/Type /XObject /Subtype /Image /Width 2 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode', image),
  ]);
}

const FILED: Totals = {
  unitemizedContributions: '1,250.00',
  contributions: '24,310.75',
  unitemizedExpenditures: '940.18',
  expenditures: '18,672.40',
  contributionsMaintained: '31,208.06',
  outstandingLoans: '0.00',
};

const ALSO_FILED: Totals = {
  unitemizedContributions: '415.00',
  contributions: '9,004.20',
  unitemizedExpenditures: '86.31',
  expenditures: '3,115.88',
  contributionsMaintained: '12,660.55',
  outstandingLoans: '2,500.00',
};

/** The same filer's amendment, filed behind the original, with different numbers on it. */
const AMENDED: Totals = {
  unitemizedContributions: '2,000.00',
  contributions: '77,777.77',
  unitemizedExpenditures: '1,000.00',
  expenditures: '55,555.55',
  contributionsMaintained: '66,666.66',
  outstandingLoans: '44,444.44',
};

/** The original the amendment corrects: its total contributions box was left blank. */
const INCOMPLETE: Totals = { ...FILED, contributions: '' };

const files: [string, Buffer][] = [
  ['city-finance/synthetic-cover-sheet.pdf', plainReport(coverSheet('MS   Pat   Q. Example-Filer', FILED))],
  ['city-finance/synthetic-cover-sheet-kerned.pdf', kernedReport(coverSheet('MR   Robin   T. Notareal-Person', ALSO_FILED))],
  [
    'city-finance/synthetic-amended.pdf',
    plainReport([...coverSheet('MX   Sam   V. Placeholder', INCOMPLETE), ...coverSheet('MX   Sam   V. Placeholder', AMENDED)]),
  ],
  ['city-finance/synthetic-scanned.pdf', scannedReport()],
];

for (const [relPath, bytes] of files) {
  const file = path.join(fixtureRoot, relPath);
  await writeFile(file, bytes);
  console.log(`${relPath} (${bytes.length} bytes)`);
}
