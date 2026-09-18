/**
 * Writes the two campaign finance report fixtures the Figure extractor is tested against
 * (spec: .scratch/laredo-elections/spec.md, issue 06):
 *
 *   npm run make:pdf-fixtures
 *
 * Every other fixture in this repo is a real capture. These two cannot be. Every campaign finance
 * report the City of Laredo has posted for the 2026 cycle is a scanned image from a copier
 * (producer `SECnvtToPDF V1.0`, no `/Font` object, one image per page, 1.3 MB to 20 MB), so there
 * is no readable report to record, and a real scan is both too large to commit and a document this
 * project does not rehost (ADR-0001). So the readable fixture is written here: a small text-layer
 * PDF laid out like the Texas Ethics Commission's FORM C/OH cover sheet page 1, with invented
 * totals, and the unreadable one is a one-page image with no text layer, which is the shape of
 * every real report today.
 *
 * Nothing in `src/` depends on this file; it exists so the bytes under `test/fixtures/city-finance`
 * are reproducible and reviewable rather than opaque.
 */
import { deflateSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fixtureRoot } from '../test/fixtures/paths.js';

/**
 * The cover sheet of a FORM C/OH as a filer fills it in, in the order and wording the Texas Ethics
 * Commission prints (form revised 9/8/2015, the version the city's 2026 filings use). Boxes 17 and
 * 19 are here on purpose: their labels contain the labels of 18 and 20, so an extractor that
 * matches loosely reads the unitemized subtotal as the total. The totals are invented.
 */
const COVER_SHEET: string[] = [
  'CANDIDATE/OFFICEHOLDER   FORM C/OH',
  'CAMPAIGN FINANCE REPORT   COVER SHEET PG 1',
  '1 Filer ID (Ethics Commission Filers)   2 Total pages filed: 6',
  '3 CANDIDATE / OFFICEHOLDER NAME   MS / MRS / MR   FIRST   MI',
  'MR   Gilbert   Gonzalez',
  '4 CANDIDATE / OFFICEHOLDER MAILING ADDRESS   CITY; STATE; ZIP CODE',
  '1110 Houston St, Laredo, TX 78040',
  '8 REPORT TYPE   [ ] JANUARY 15   [X] JULY 15   [ ] 30th Day Before Election',
  '9 PERIOD COVERED   Month Day Year   01/01/2026   THROUGH   06/30/2026',
  '10 ELECTION   ELECTION DATE   Month Day Year   11/03/2026   [X] GENERAL',
  '11 OFFICE HELD (if any)   City of Laredo Council District 1',
  '12 OFFICE SOUGHT (if known)   City of Laredo Council District 1',
  '17. TOTAL UNITEMIZED POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS)   $ 1,250.00',
  '18. TOTAL POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS)   $ 24,310.75',
  '19. TOTAL UNITEMIZED POLITICAL EXPENDITURES   $ 940.18',
  '20. TOTAL POLITICAL EXPENDITURES   $ 18,672.40',
  '21. TOTAL POLITICAL CONTRIBUTIONS MAINTAINED AS OF THE LAST DAY OF REPORTING PERIOD   $ 31,208.06',
  '22. TOTAL PRINCIPAL AMOUNT OF ALL OUTSTANDING LOANS AS OF THE LAST DAY OF REPORTING PERIOD   $ 0.00',
  'I swear, or affirm, under penalty of perjury, that the accompanying report is true and correct',
  'and includes all information required to be reported by me under Title 15, Election Code.',
];

/** A PDF string literal: the three characters a literal cannot hold raw, escaped. */
function pdfString(text: string): string {
  return `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`;
}

/** One `BT ... ET` block per line, laid down the page as a form's rows are. */
function coverSheetContent(lines: readonly string[]): Buffer {
  const body = lines
    .map((line, i) => `BT /F1 9 Tf 1 0 0 1 36 ${750 - i * 18} Tm ${pdfString(line)} Tj ET`)
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

function stream(dict: string, bytes: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(`<< ${dict} /Length ${bytes.length} >>\nstream\n`, 'latin1'),
    bytes,
    Buffer.from('\nendstream', 'latin1'),
  ]);
}

/** A report with a text layer: what a report filed through the Ethics Commission's software looks like. */
function readableReport(): Buffer {
  // Deflated, as a real filing's content stream is; an extractor that only reads plain streams
  // would read nothing from a real report.
  const content = deflateSync(coverSheetContent(COVER_SHEET));
  return pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    stream('/Filter /FlateDecode', content),
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ]);
}

/**
 * A report with no text layer: one image drawn over the page, no font, nothing to read. Every
 * report the city has posted for this cycle is this, at a thousand times the size.
 */
function scannedReport(): Buffer {
  // Two pixels of grey: enough to be a real image object, small enough to commit.
  const image = deflateSync(Buffer.from([0x80, 0x40]));
  return pdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    stream('', Buffer.from('q 612 0 0 792 0 0 cm /Im0 Do Q\n', 'latin1')),
    stream('/Type /XObject /Subtype /Image /Width 2 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode', image),
  ]);
}

const files: [string, Buffer][] = [
  ['city-finance/synthetic-cover-sheet.pdf', readableReport()],
  ['city-finance/synthetic-scanned.pdf', scannedReport()],
];

for (const [relPath, bytes] of files) {
  const file = path.join(fixtureRoot, relPath);
  await writeFile(file, bytes);
  console.log(`${relPath} (${bytes.length} bytes)`);
}
