// The ui-craft pack's lesson checks as their JSON holds them, for the two test files that read them.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseJson } from '../../../packs/base/hooks/lib/json.mts';
import { KIT } from '../../kit-cli.mts';
import type { CheckExamples } from '../../kit-cli.mts';

export interface UiCheck extends CheckExamples { concepts: string[]; rule: string }
const CHECKS_DIR = join(KIT, 'packs/ui-craft/checks');
export const uiChecks = (): UiCheck[] => readdirSync(CHECKS_DIR).flatMap((f) => parseJson<UiCheck>(readFileSync(join(CHECKS_DIR, f), 'utf8')) ?? []);
