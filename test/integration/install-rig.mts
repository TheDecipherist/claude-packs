// What the install files share: a fresh project folder, and a file of it read.
import { fresh, join, readFileSync } from '../kit-cli.mts';

export const project = (): string => fresh('cp-');
export const text = (dir: string, rel: string): string => readFileSync(join(dir, rel), 'utf8');
