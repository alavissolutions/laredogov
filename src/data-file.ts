import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { emptyData, isTopic, type DataFile } from './domain.js';

/** The committed data file is the system of record (ADR-0002). */
export async function loadData(file: string): Promise<DataFile> {
  let text: string;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyData();
    throw err;
  }
  const parsed = JSON.parse(text) as DataFile;
  if (parsed.version !== 1) throw new Error(`Unsupported data file version ${String(parsed.version)} in ${file}`);
  return { ...emptyData(), ...parsed };
}

export async function saveData(file: string, data: DataFile): Promise<void> {
  validateData(data);
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
  const sorted: DataFile = {
    version: 1,
    items: [...data.items].sort(byId),
    meetings: [...data.meetings].sort(byId),
    bodies: [...data.bodies].sort(byId),
    elections: [...data.elections].sort(byId),
    sources: Object.fromEntries(Object.entries(data.sources).sort(([a], [b]) => a.localeCompare(b))),
  };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** The build refuses an Item with a missing or unknown Topic (ADR-0004), or an Election missing its key fields. */
export function validateData(data: DataFile): void {
  for (const election of data.elections) {
    if (!election.slug || !election.title || !election.date || !election.url) {
      throw new Error(`Election ${election.id} is missing slug, title, date, or url`);
    }
  }
  for (const item of data.items) {
    if (!isTopic(item.topic)) {
      throw new Error(`Item ${item.id} has no valid Topic (got ${JSON.stringify(item.topic)})`);
    }
    if (!item.title || !item.url || !item.date) {
      throw new Error(`Item ${item.id} is missing title, url, or date`);
    }
  }
}
