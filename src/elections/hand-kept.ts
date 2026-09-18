/**
 * The owner's hand-kept elections file (spec: .scratch/laredo-elections/spec.md, ADR-0005).
 *
 * Two things the scheduled job cannot work out for itself live here: the Aliases that let a Filing
 * the Publisher posted under another spelling attach to a Candidate, and the document ids whose
 * Figures the owner has checked against the PDF. The build reads this file and never writes it, so
 * the owner's edits and the cron's commits never collide (user story 17). A missing file means no
 * Aliases and nothing verified, which is the state the site ships in.
 *
 * It is YAML, but only the two shapes below, so the build reads it with the parser here rather than
 * taking on a YAML dependency for one small file:
 *
 *     aliases:
 *       city-elections:2026-general:mayor:victor-daniel-trevino:
 *         - Dr. Victor D. Treviño
 *     verified:
 *       - 23842
 *
 * The key under `aliases` is the Candidate id from the data file, which the run log prints beside
 * every report it could not attach. A name is declared exactly as the Publisher spells it; nothing
 * here is normalised, trimmed of titles, or matched loosely (ADR-0005).
 */
import { readFile } from 'node:fs/promises';

export interface HandKeptElections {
  /** Candidate id to the other spellings the Publisher uses for that Candidate. */
  aliases: Map<string, string[]>;
  /** Document ids whose Figures the owner has checked against the Filing (issue 06). */
  verified: Set<string>;
}

export function emptyHandKept(): HandKeptElections {
  return { aliases: new Map(), verified: new Set() };
}

/**
 * Reads the owner's file. A missing file is no Aliases and nothing verified; a file the parser
 * cannot make sense of throws, so the Source that reads it fails loudly in the run log with the
 * rest of the build still publishing, rather than quietly dropping the owner's work.
 */
export async function loadHandKept(file: string): Promise<HandKeptElections> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyHandKept();
    throw err;
  }
  return parseHandKept(text, file);
}

const SECTIONS = ['aliases', 'verified'] as const;
type Section = (typeof SECTIONS)[number];

export function parseHandKept(text: string, file = 'the hand-kept file'): HandKeptElections {
  const out = emptyHandKept();
  let section: Section | undefined;
  let key: string | undefined;

  text.split('\n').forEach((raw, index) => {
    const line = raw.replace(/\s+$/, '');
    const bare = line.trim();
    if (!bare || bare.startsWith('#')) return;
    const where = `${file} line ${index + 1}`;
    const indent = line.length - line.trimStart().length;

    const item = /^-\s+(.*)$/.exec(bare);
    if (item) {
      const value = unquote(item[1]!);
      if (!value) throw new Error(`${where}: a list item with nothing in it`);
      if (section === 'verified') out.verified.add(value);
      else if (section === 'aliases' && key) out.aliases.get(key)!.push(value);
      else throw new Error(`${where}: a list item outside "aliases:" or "verified:"`);
      return;
    }

    const heading = /^(.*):$/.exec(bare);
    if (!heading) throw new Error(`${where}: expected "aliases:", "verified:", a Candidate id, or a "- value" line`);
    const name = unquote(heading[1]!);
    if (indent === 0) {
      if (!isSection(name)) throw new Error(`${where}: "${name}:" is not one of ${SECTIONS.join(', ')}`);
      section = name;
      key = undefined;
      return;
    }
    if (section !== 'aliases') throw new Error(`${where}: "${name}:" belongs under "aliases:"`);
    key = name;
    // The same Candidate declared twice keeps both blocks rather than losing the first.
    if (!out.aliases.has(key)) out.aliases.set(key, []);
  });

  return out;
}

function isSection(value: string): value is Section {
  return (SECTIONS as readonly string[]).includes(value);
}

/** YAML quoting, the little of it this file needs: a name may be quoted to keep a leading `#` or `-`. */
function unquote(value: string): string {
  const quoted = /^(["'])(.*)\1$/.exec(value.trim());
  return quoted ? quoted[2]!.trim() : value.trim();
}
