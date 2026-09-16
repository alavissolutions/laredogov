import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const fixtureRoot = path.dirname(fileURLToPath(import.meta.url));

export function fixture(relPath: string): { file: string } {
  return { file: path.join(fixtureRoot, relPath) };
}
