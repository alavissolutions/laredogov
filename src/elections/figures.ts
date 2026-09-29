/**
 * Reading the four cover-sheet totals out of a campaign finance report (spec:
 * .scratch/laredo-elections/spec.md, issue 06, note on ADR-0001).
 *
 * A campaign finance report is a Texas Ethics Commission FORM C/OH. Its first page is a cover
 * sheet, and boxes 17 to 22 of that sheet are the filer's own totals for the period. Four of them
 * are the Figures this site copies: total political contributions, total political expenditures,
 * total political contributions maintained, and the total principal amount of outstanding loans.
 * Itemised contributors, their addresses, and individual expenditures are on the schedules behind
 * the cover sheet and are never read (spec: Out of Scope).
 *
 * Two things this deliberately does not do:
 *
 * - **It does not guess.** All four totals must be found on one cover sheet, each one behind the
 *   label the form prints for it and written as money with cents, or nothing is returned at all and
 *   the report renders as a link with no Figure. Reading three totals and a number that happened to
 *   be nearby would put a wrong figure under a real person's name, which is the whole reason the
 *   owner verifies these before they show (note on ADR-0001). Three shapes the form itself sets are
 *   guarded by tests: boxes 17 and 19 are the unitemized subtotals whose labels contain most of the
 *   labels of boxes 18 and 20, a box left blank leaves the numbering of the box below it sitting
 *   where its amount should be, and an amended report filed behind the original repeats the whole
 *   sheet with different numbers on it.
 * - **It does not read images.** Every report the City of Laredo has posted for the 2026 cycle is
 *   a scan from a copier: no `/Font` object, one image per page, no text layer at all (probed
 *   2026-09-17). There is nothing in those bytes for any text extractor to find, and turning a
 *   picture of a form into numbers is a decision for the owner, not this file. They come back
 *   unreadable, which is the case the build is built around.
 *
 * There is no PDF dependency behind this. What it needs of the format is small and old: a document
 * is a list of objects, an object may carry a stream, a stream carrying page content holds
 * text-showing operators, and Flate is the only compression these forms use. What it does not do is
 * fonts. A document whose fonts are subset with their own encodings — which is what the Ethics
 * Commission's own form-filling software produces — shows its text as glyph codes, no label
 * matches, and the report comes back unreadable rather than wrong. That is a limitation, not a
 * finished job, which is why `READER_VERSION` exists: a document this version found nothing in is
 * opened again once the version rises, so a reader that learns encodings re-reads every report the
 * one before it gave up on.
 */
import { inflateRawSync, inflateSync } from 'node:zlib';
import type { FigureTotals } from '../domain.js';

/**
 * What this version of the reader can do. A Filing records the version that found nothing in its
 * document, and the build opens that document again when this number is higher than the one
 * recorded, so every report a weaker reader gave up on is re-read once rather than being written
 * off for good. Raise it whenever this file learns to read something it could not before.
 *
 * - 1: the first reader (issue 06).
 * - 2 (2026-09-18, branch review finding 7): rows written a show operator at a time, and the `'`
 *   and `"` operators, which 1 read as one unbroken run and so found no label in.
 */
export const READER_VERSION = 2;

/** A stream that inflates to more than this is not a form; it is a way to take the whole run down. */
const MAX_INFLATED = 64 << 20;

/** The Figure copied from one Filing; its id is the Publisher's document id, as the owner verifies by. */
export function figureId(source: string, documentId: string): string {
  return `${source}:figure:${documentId}`;
}

/**
 * The four totals off the cover sheet, or nothing at all when the document has no text layer, is
 * not a FORM C/OH, or prints a total this cannot find. Nothing partial is ever returned: three
 * totals and a guess is worse than a link to the PDF.
 */
export function readCoverSheet(bytes: Uint8Array): FigureTotals | undefined {
  const text = normalise(pdfText(bytes));
  if (!text) return undefined;
  // One cover sheet, the first the document prints. A report filed with its amendment behind it
  // carries the sheet twice with different numbers on it, and four totals read half from one and
  // half from the other would be a set of figures that was never filed by anyone.
  const sheet = firstCoverSheet(labelMarks(text), text.length);
  const contributions = amountFor(text, sheet, 'contributions');
  const expenditures = amountFor(text, sheet, 'expenditures');
  const contributionsMaintained = amountFor(text, sheet, 'contributionsMaintained');
  const outstandingLoans = amountFor(text, sheet, 'outstandingLoans');
  if (contributions === undefined || expenditures === undefined) return undefined;
  if (contributionsMaintained === undefined || outstandingLoans === undefined) return undefined;
  return { contributions, expenditures, contributionsMaintained, outstandingLoans };
}

/** The wording the Ethics Commission prints for each of boxes 17 to 22, in the order it prints them. */
const LABELS = [
  { key: 'unitemizedContributions', pattern: /TOTAL UNITEMIZED POLITICAL CONTRIBUTIONS/g },
  // Box 21 repeats box 18's label and adds a word, so box 18 is the one that is not box 21.
  { key: 'contributions', pattern: /TOTAL POLITICAL CONTRIBUTIONS(?! MAINTAINED)/g },
  { key: 'unitemizedExpenditures', pattern: /TOTAL UNITEMIZED POLITICAL EXPENDITURES/g },
  { key: 'expenditures', pattern: /TOTAL POLITICAL EXPENDITURES/g },
  { key: 'contributionsMaintained', pattern: /TOTAL POLITICAL CONTRIBUTIONS MAINTAINED/g },
  { key: 'outstandingLoans', pattern: /TOTAL PRINCIPAL AMOUNT OF ALL OUTSTANDING LOANS/g },
] as const;

type LabelKey = (typeof LABELS)[number]['key'];
interface Mark {
  key: LabelKey;
  /** Where the label's own text ends, which is where its amount can start. */
  from: number;
  /** Where the label starts, which is where the label before it has to stop looking. */
  at: number;
  /** Where this label's amount has to be found by: the next label, or the end of the sheet. */
  until: number;
}

/**
 * Every one of the six labels wherever it appears, in the order the document prints them, each one
 * bounded by the next: a box's amount is printed between its own label and the label under it, and
 * a box left blank has to come up empty rather than reach down into the box below.
 */
function labelMarks(text: string): Mark[] {
  const found: Omit<Mark, 'until'>[] = [];
  for (const { key, pattern } of LABELS) {
    pattern.lastIndex = 0;
    for (let m = pattern.exec(text); m; m = pattern.exec(text)) found.push({ key, at: m.index, from: m.index + m[0].length });
  }
  found.sort((a, b) => a.at - b.at);
  // The last box on a sheet has the affidavit under it rather than a label, so it is given the
  // width of a form row to print its amount in and no more.
  return found.map((mark, index) => ({ ...mark, until: found[index + 1]?.at ?? Math.min(text.length, mark.from + 200) }));
}

/**
 * The first cover sheet in the document: its labels run in the form's own order, and a label that
 * comes round a second time is the next sheet starting. An amended report filed behind the original
 * is two sheets; so is a report whose schedules repeat the summary.
 */
function firstCoverSheet(marks: readonly Mark[], end: number): Mark[] {
  const sheet: Mark[] = [];
  for (const mark of marks) {
    if (sheet.some((m) => m.key === mark.key)) break;
    sheet.push(mark);
  }
  // The last box of the sheet must not read into the sheet that follows it either.
  const last = sheet[sheet.length - 1];
  if (last) last.until = Math.min(last.until, marks[sheet.length]?.at ?? end);
  return sheet;
}

/** The amount the form prints for one box, or nothing, which makes the whole report unreadable. */
function amountFor(text: string, sheet: readonly Mark[], key: LabelKey): number | undefined {
  const mark = sheet.find((m) => m.key === key);
  return mark ? money(text.slice(mark.from, mark.until)) : undefined;
}

/**
 * Money as this form prints it: dollars and cents, optionally behind a dollar sign, grouped in
 * threes or not at all. Cents are required, because the thing most likely to be sitting where a
 * blank box's amount should be is the printed number of the box below it ("18."), and a number
 * that runs on from the digits before it is refused, because a number broken across the page by
 * the writer is not a number this can add up. Anything the form could have meant as negative — a
 * minus sign, an accountant's parentheses — is refused rather than read as positive.
 */
const AMOUNT = /(?:\$\s*)?(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})(?![\d,])/g;

function money(segment: string): number | undefined {
  AMOUNT.lastIndex = 0;
  for (let match = AMOUNT.exec(segment); match; match = AMOUNT.exec(segment)) {
    const before = segment.slice(0, match.index).replace(/\s+$/, '');
    if (/[\d,.\-\u2013\u2014(]$/.test(before)) continue;
    const value = Number(match[1]!.replace(/,/g, ''));
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

/** Matching is done on one line of upper-case text: a PDF breaks a form's row wherever it likes. */
function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toUpperCase();
}

/**
 * Every text-showing operator in the document's content streams, one line per row the content
 * stream lays down. A stream that is an image, that is compressed with anything but Flate, or that
 * holds no text at all is passed over.
 */
export function pdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString('latin1');
  const lines: string[] = [];
  const marker = /stream\r?\n|stream\r/g;
  for (let m = marker.exec(raw); m; m = marker.exec(raw)) {
    const dict = dictBefore(raw, m.index);
    if (dict === undefined) continue;
    // A scanned page: one image drawn over the whole sheet, and nothing to read in it.
    if (/\/Subtype\s*\/Image/.test(dict)) continue;
    const start = m.index + m[0].length;
    const end = streamEnd(raw, dict, start);
    if (end <= start) continue;
    const decoded = decode(dict, Buffer.from(raw.slice(start, end), 'latin1'));
    if (decoded === undefined) continue;
    const content = decoded.toString('latin1');
    // Page content is the only stream with text in it; fonts, metadata and the rest are skipped.
    if (!/(^|[^A-Za-z])BT([^A-Za-z]|$)/.test(content)) continue;
    lines.push(contentText(content));
    marker.lastIndex = end;
  }
  return lines.join('\n').trim();
}

/** The object dictionary a stream belongs to: the `<< ... >>` immediately before the keyword. */
function dictBefore(raw: string, at: number): string | undefined {
  let end = at - 1;
  while (end >= 0 && /\s/.test(raw[end]!)) end -= 1;
  if (end < 1 || raw[end] !== '>' || raw[end - 1] !== '>') return undefined;
  let depth = 0;
  for (let i = end; i >= 1; i -= 1) {
    if (raw[i] === '>' && raw[i - 1] === '>') {
      depth += 1;
      i -= 1;
    } else if (raw[i] === '<' && raw[i - 1] === '<') {
      depth -= 1;
      if (depth === 0) return raw.slice(i - 1, end + 1);
      i -= 1;
    }
  }
  return undefined;
}

/**
 * Where a stream's bytes stop: what `/Length` says when the dictionary states it outright and the
 * `endstream` keyword lands where it promised, and otherwise the next `endstream` keyword. The
 * length is an indirect reference often enough in real filings that the search has to be there.
 */
function streamEnd(raw: string, dict: string, start: number): number {
  const stated = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dict);
  if (stated) {
    const end = start + Number(stated[1]);
    if (/^\s*endstream/.test(raw.slice(end, end + 12))) return end;
  }
  const found = raw.indexOf('endstream', start);
  if (found === -1) return -1;
  return /\r\n$/.test(raw.slice(found - 2, found)) ? found - 2 : /[\r\n]$/.test(raw.slice(found - 1, found)) ? found - 1 : found;
}

/** Flate is the only compression these forms use; anything else is left to the owner's own eyes. */
function decode(dict: string, data: Buffer): Buffer | undefined {
  const filter = /\/Filter\s*(\/[A-Za-z0-9]+|\[[^\]]*\])/.exec(dict)?.[1];
  if (filter === undefined) return data;
  if (!/FlateDecode/.test(filter) || /DCTDecode|JPXDecode|CCITTFaxDecode|LZWDecode|RunLengthDecode/.test(filter)) return undefined;
  // Bounded: a stream that inflates to more than a form ever could is dropped rather than allowed
  // to take the whole scheduled run, every Source in it, down with one document.
  try {
    return inflateSync(data, { maxOutputLength: MAX_INFLATED });
  } catch {
    try {
      return inflateRawSync(data, { maxOutputLength: MAX_INFLATED });
    } catch {
      return undefined;
    }
  }
}

/** Operators that end a row of text: the next thing shown starts somewhere else on the page. */
const BREAKS = new Set(['Td', 'TD', 'T*', 'Tm', 'BT', 'ET']);

/**
 * The show operators that move to the next line before they show anything, which `T*` does on its
 * own. They follow the string they show, so a row ends in front of that string, not after it.
 * The window is wider than any whitespace a writer puts between an operand and its operator.
 */
const NEXT_LINE_SHOW = /^\s*['"]/;
const NEXT_LINE_SHOW_WINDOW = 64;

/**
 * The text a content stream shows, a line per row. Strings are read as PDF writes them, literal
 * `(...)` or hexadecimal `<...>`; the kerning numbers inside a `TJ` array become a space only when
 * they are wide enough to be one, so a number the writer kerned mid-way stays one number.
 *
 * Two strings shown one after the other with nothing between them are two things the form printed
 * beside each other, so a space goes between them. A writer that lays out a row a word at a time
 * without kerning is a writer this would otherwise read as one long run, and no label on the form
 * would ever match (branch review finding 7). What is never separated is a number the writer split:
 * 24, then 310.75, and 24,310 then .75, are one number in both halves' company.
 */
function contentText(content: string): string {
  const lines: string[] = [];
  let row = '';
  let kern: number | undefined;
  // The writer splitting one number across two strings; a space there would make 24,310.75 into
  // 24 and 310.75.
  const splitsNumber = (text: string) => (/[\d,]$/.test(row) && /^[\d,]/.test(text)) || (/\d$/.test(row) && /^\.\d/.test(text));
  // A kern wide enough to be a space is one; so is no kern at all between two strings shown in a row.
  const spaced = (text: string) => row !== '' && !/\s$/.test(row) && (kern === undefined || kern <= -100) && !splitsNumber(text);
  const endRow = () => {
    if (row.trim()) lines.push(row.trim());
    row = '';
  };
  /** Shows a string, after ending the row when the operator waiting behind it moves to the next. */
  const show = (text: string, next: number) => {
    if (NEXT_LINE_SHOW.test(content.slice(next, next + NEXT_LINE_SHOW_WINDOW))) endRow();
    row += (spaced(text) ? ' ' : '') + text;
    kern = undefined;
  };
  let i = 0;
  while (i < content.length) {
    const c = content[i]!;
    if (c === '(') {
      const [text, next] = literalString(content, i);
      show(text, next);
      i = next;
    } else if (c === '<' && content[i + 1] !== '<') {
      const [text, next] = hexString(content, i);
      show(text, next);
      i = next;
    } else if (c === '%') {
      while (i < content.length && content[i] !== '\n') i += 1;
    } else if (/[-+.\d]/.test(c)) {
      let j = i;
      while (j < content.length && /[-+.\d]/.test(content[j]!)) j += 1;
      kern = Number(content.slice(i, j));
      i = j;
    } else if (/[A-Za-z'"*]/.test(c)) {
      let j = i;
      while (j < content.length && /[A-Za-z0-9'"*]/.test(content[j]!)) j += 1;
      if (BREAKS.has(content.slice(i, j))) endRow();
      kern = undefined;
      i = j;
    } else {
      i += 1;
    }
  }
  endRow();
  return lines.join('\n');
}

const ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };

/** A `(...)` string: parentheses nest inside one, and a backslash escapes the next character. */
function literalString(content: string, at: number): [string, number] {
  let out = '';
  let depth = 1;
  let i = at + 1;
  while (i < content.length && depth > 0) {
    const c = content[i]!;
    if (c === '\\') {
      const next = content[i + 1] ?? '';
      const octal = /^[0-7]{1,3}/.exec(content.slice(i + 1, i + 4))?.[0];
      if (octal) {
        out += String.fromCharCode(parseInt(octal, 8));
        i += 1 + octal.length;
        continue;
      }
      // A backslash before a line break is a line continuation and shows nothing.
      out += ESCAPES[next] ?? (next === '\n' || next === '\r' ? '' : next);
      i += 2;
      continue;
    }
    if (c === '(') depth += 1;
    if (c === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
    out += c;
    i += 1;
  }
  return [out, i + 1];
}

/** A `<...>` string: pairs of hexadecimal digits, the last one padded with a zero. */
function hexString(content: string, at: number): [string, number] {
  const close = content.indexOf('>', at);
  if (close === -1) return ['', content.length];
  const digits = content.slice(at + 1, close).replace(/[^0-9A-Fa-f]/g, '');
  const padded = digits.length % 2 ? `${digits}0` : digits;
  let out = '';
  for (let i = 0; i < padded.length; i += 2) out += String.fromCharCode(parseInt(padded.slice(i, i + 2), 16));
  return [out, close + 1];
}
