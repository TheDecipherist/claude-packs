// A stand-in until scan-detect itself is converted (W4 slice w4-doctor): the one export `scan` reads, as it is. Delete this
// file when lib/scan-detect.mts lands, and take ScanPick from there.
import type { ScanPick } from './scan.mts';

export function recommend(projectDir: string, files: readonly string[]): ScanPick;
