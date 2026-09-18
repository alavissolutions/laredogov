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
 * - **It does not guess.** All four totals must be found, each one behind the label the form
 *   prints for it, or nothing is returned and the report renders as a link with no Figure. Boxes
 *   17 and 19 are the unitemized subtotals, and their labels contain the labels of boxes 18 and 20
 *   word for word, so the labels are matched against each other and the amount taken from between
 *   one label and the next rather than from anywhere after it.
 * - **It does not read images.** Every report the City of Laredo has posted for the 2026 cycle is
 *   a scan from a copier: no `/Font` object, one image per page, no text layer at all (probed
 *   2026-09-17). There is nothing in those bytes for any text extractor to find, and turning a
 *   picture of a form into numbers is a decision for the owner, not this file. They come back
 *   unreadable, which is the case the build is built around.
 *
 * There is no PDF dependency behind this. What it needs of the format is small and stable since
 * PDF 1.0: a document is a list of objects, an object may carry a stream, a stream carrying page
 * content holds text-showing operators, and the only compression these forms use is Flate.
 */
import { inflateRawSync, inflateSync } from 'node:zlib';
import type { FigureTotals } from '../domain.js';

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
  const marks = labelMarks(text);
  const contributions = amountFor(text, marks, 'contributions');
  const expenditures = amountFor(text, marks, 'expenditures');
  const contributionsMaintained = amountFor(text, marks, 'contributionsMaintained');
  const outstandingLoans = amountFor(text, marks, 'outstandingLoans');
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
}

/** Every one of the six labels wherever it appears, in the order the document prints them. */
function labelMarks(text: string): Mark[] {
  const marks: Mark[] = [];
  for (const { key, pattern } of LABELS) {
    pattern.lastIndex = 0;
    for (let m = pattern.exec(text); m; m = pattern.exec(text)) marks.push({ key, at: m.index, from: m.index + m[0].length });
  }
  return marks.sort((a, b) => a.at - b.at);
}

/**
 * The amount the form prints for one box: the first money the document carries between that box's
 * label and the next label of any of the six. A form that repeats its cover sheet (an amended
 * report filed behind the original) gives the label twice, so each occurrence is tried in turn.
 */
function amountFor(text: string, marks: readonly Mark[], key: LabelKey): number | undefined {
  for (const [index, mark] of marks.entries()) {
    if (mark.key !== key) continue;
    const until = marks[index + 1]?.at ?? Math.min(text.length, mark.from + 200);
    const amount = money(text.slice(mark.from, until));
    if (amount !== undefined) return amount;
  }
  return undefined;
}

/**
 * Money as the form prints it. A dollar sign makes it money whatever follows; without one it has
 * to carry cents, so the "18." numbering the Ethics Commission prints beside the next box is never
 * read as the amount of the box before it.
 */
function money(segment: string): number | undefined {
  const match = /\$\s*(\d[\d,]*(?:\.\d{2})?)/.exec(segment) ?? /(?<![\d.,])(\d[\d,]*\.\d{2})(?![\d])/.exec(segment);
  if (!match) return undefined;
  const value = Number(match[1]!.replace(/,/g, ''));
  return Number.isFinite(value) ? value : undefined;
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
  try {
    return inflateSync(data);
  } catch {
    try {
      return inflateRawSync(data);
    } catch {
      return undefined;
    }
  }
}

/** Operators that end a row of text: the next thing shown starts somewhere else on the page. */
const BREAKS = new Set(['Td', 'TD', 'T*', 'Tm', 'BT', 'ET']);

/**
 * The text a content stream shows, a line per row. Strings are read as PDF writes them, literal
 * `(...)` or hexadecimal `<...>`; the kerning numbers inside a `TJ` array become a space only when
 * they are wide enough to be one, so a number the writer kerned mid-way stays one number.
 */
function contentText(content: string): string {
  const lines: string[] = [];
  let row = '';
  let kern: number | undefined;
  const endRow = () => {
    if (row.trim()) lines.push(row.trim());
    row = '';
  };
  let i = 0;
  while (i < content.length) {
    const c = content[i]!;
    if (c === '(') {
      const [text, next] = literalString(content, i);
      row += (kern !== undefined && kern <= -100 ? ' ' : '') + text;
      kern = undefined;
      i = next;
    } else if (c === '<' && content[i + 1] !== '<') {
      const [text, next] = hexString(content, i);
      row += (kern !== undefined && kern <= -100 ? ' ' : '') + text;
      kern = undefined;
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
