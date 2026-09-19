import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

export function fixture(relPath: string): { file: string } {
  return { file: path.join(fixtureRoot, relPath) };
}

/** A recorded document out of a Publisher's store: its bytes, and the filename the store sends. */
export function document(relPath: string, filename: string): { file: string; filename: string } {
  return { file: path.join(fixtureRoot, relPath), filename };
}
