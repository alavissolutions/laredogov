/**
 * Branch review of feat/laredo-elections, finding 7
 * (.scratch/laredo-elections/reviews/00-branch-review.md). A PDF writer is free to show a row of a
 * form as one string, as a kerned array, or as a string per word with no kerning at all, and to
 * move to the next row with `T*` or with the `'` and `"` show operators. The reader has to read the
 * form the same way whichever of those the writer chose, or a report with a text layer in it comes
 * back unreadable and stays that way until READER_VERSION rises.
 *
 * The documents here are written by hand rather than taken from the city: they are the one shape
 * `scripts/make-pdf-fixtures.ts` does not write, and what is under test is the content stream, not
 * the file around it.
 */
import { describe, expect, it } from 'vitest';
import { pdfText, readCoverSheet } from '../src/elections/figures.js';

/** A PDF string literal: the three characters a literal cannot hold raw, escaped. */
function pdfString(text: string): string {
  return `(${text.replace(/[\\()]/g, (c) => `\\${c}`)})`;
}

/**
 * The rows of a form written the way a writer that does not kern writes them: a show operator per
 * word, nothing between them, and every row after the first opened by `'`, which is "move to the
 * next line and show this".
 */
function shownContent(rows: readonly string[]): string {
  const row = (line: string, first: boolean) => {
    const [head = '', ...rest] = line.split(' ');
    return `${pdfString(head)}${first ? 'Tj' : "'"}${rest.map((word) => `${pdfString(word)}Tj`).join('')}`;
  };
  return `BT /F1 9 Tf 1 0 0 1 36 750 Tm\n${rows.map((line, i) => row(line, i === 0)).join('\n')}\nET\n`;
}

/** One object carrying one content stream: all `pdfText` needs of a document, and no more. */
function document(content: string): Uint8Array {
  const body = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;
  return Buffer.from(`%PDF-1.4\n1 0 obj\n${body}\nendobj\n%%EOF\n`, 'latin1');
}

/**
 * A FORM C/OH cover sheet, in the Ethics Commission's own wording for the boxes this site reads.
 * Box 18's amount is split across two strings at its comma, which is the other thing a writer does
 * with no kerning and which must stay one number rather than becoming two.
 */
const COVER_SHEET = [
  'CANDIDATE/OFFICEHOLDER CAMPAIGN FINANCE REPORT FORM C/OH COVER SHEET PG 1',
  'CANDIDATE / OFFICEHOLDER NAME MS Pat Q. Example-Filer',
  '17. TOTAL UNITEMIZED POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS) $ 1,250.00',
  '18. TOTAL POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS) $ 24, 310.75',
  '19. TOTAL UNITEMIZED POLITICAL EXPENDITURES $ 940.18',
  '20. TOTAL POLITICAL EXPENDITURES $ 18,672.40',
  '21. TOTAL POLITICAL CONTRIBUTIONS MAINTAINED AS OF THE LAST DAY OF REPORTING PERIOD $ 31,208.06',
  '22. TOTAL PRINCIPAL AMOUNT OF ALL OUTSTANDING LOANS AS OF THE LAST DAY OF REPORTING PERIOD $ 0.00',
  'I swear, or affirm, under penalty of perjury, that the accompanying report is true and correct.',
];

describe('Branch review 7: a report written a show operator at a time', () => {
  it('reads a label written as several strings as the words the form prints', () => {
    const text = pdfText(document(shownContent(COVER_SHEET)));

    expect(text).toContain('TOTAL POLITICAL CONTRIBUTIONS (OTHER THAN PLEDGES, LOANS, OR GUARANTEES OF LOANS)');
    expect(text).not.toContain('TOTALPOLITICALCONTRIBUTIONS');
    // `'` moves to the next line, so a row ends where the writer ended it and the last word of one
    // row is not run into the first word of the next.
    expect(text.split('\n')).toHaveLength(COVER_SHEET.length);
    expect(text.split('\n')[4]).toBe('19. TOTAL UNITEMIZED POLITICAL EXPENDITURES $ 940.18');
  });

  it('copies the four totals off it, with a number the writer split still one number', () => {
    expect(readCoverSheet(document(shownContent(COVER_SHEET)))).toEqual({
      contributions: 24310.75,
      expenditures: 18672.4,
      contributionsMaintained: 31208.06,
      outstandingLoans: 0,
    });
  });

  it('keeps a box number and the amount beside it two things rather than one number', () => {
    // Where the split-number guard deliberately stops. Gluing a number that ends in a point to the
    // digits after it would read "6." and "18.75", printed side by side, as 6.18 — an amount
    // nobody filed, under a real person's name. A writer that splits an amount after its decimal
    // point instead leaves the report unreadable, which is the half of this trade that is safe:
    // the report is still linked, still logged, and read again when the reader improves.
    const content = 'BT /F1 9 Tf 1 0 0 1 36 750 Tm (20.)Tj(TOTAL POLITICAL EXPENDITURES)Tj($)Tj(18,672.40)Tj ET\n';
    expect(pdfText(document(content))).toBe('20. TOTAL POLITICAL EXPENDITURES $ 18,672.40');
  });

  it('treats the " operator as a row of its own too', () => {
    // `"` sets the word and character spacing, moves to the next line, and shows the text.
    const content = 'BT /F1 9 Tf 1 0 0 1 36 750 Tm (20. TOTAL POLITICAL EXPENDITURES $ 18,672.40)Tj 0 0 (21. TOTAL POLITICAL CONTRIBUTIONS MAINTAINED)" ET\n';
    expect(pdfText(document(content)).split('\n')).toEqual([
      '20. TOTAL POLITICAL EXPENDITURES $ 18,672.40',
      '21. TOTAL POLITICAL CONTRIBUTIONS MAINTAINED',
    ]);
  });
});
