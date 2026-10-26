import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..');
const locales = readdirSync(join(root, 'src/i18n/locales'));

function hasKey(source: Record<string, unknown>, key: string): boolean {
  let node: unknown = source;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string';
}

// Each queue item component reads from its own namespace; a key added to the wrong file shows raw.
describe.each([
  ['src/components/download/QueueItem.tsx', 'download'],
  ['src/components/download/UniversalQueueItem.tsx', 'universal'],
])('%s', (file, namespace) => {
  const source = readFileSync(join(root, file), 'utf8');
  expect(source).toContain(`useTranslation('${namespace}')`);
  const keys = [...new Set([...source.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map((m) => m[1]))];

  test.each(locales)(`every literal key exists in %s/${namespace}.json`, (locale) => {
    const messages = JSON.parse(
      readFileSync(join(root, 'src/i18n/locales', locale, `${namespace}.json`), 'utf8'),
    );
    expect(keys.filter((key) => !hasKey(messages, key))).toEqual([]);
  });
});
