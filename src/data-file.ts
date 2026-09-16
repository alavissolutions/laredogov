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
  const sorted: DataFile = {
    version: 1,
    items: [...data.items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    meetings: [...data.meetings].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    bodies: [...data.bodies].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    sources: Object.fromEntries(Object.entries(data.sources).sort(([a], [b]) => (a < b ? -1 : 1))),
  };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** The build refuses an Item with a missing or unknown Topic (ADR-0004). */
export function validateData(data: DataFile): void {
  for (const item of data.items) {
    if (!isTopic(item.topic)) {
      throw new Error(`Item ${item.id} has no valid Topic (got ${JSON.stringify(item.topic)})`);
    }
    if (!item.title || !item.url || !item.date) {
      throw new Error(`Item ${item.id} is missing title, url, or date`);
    }
  }
}
