import { expect, test } from 'bun:test';
import { searchSettings } from '../src/components/settings/searchable-settings';
import settings from '../src/i18n/locales/en/settings.json';

const t = (key: string) =>
  key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], settings) as string;

test('the Plugin Store section can be found from settings search', () => {
  const sections = searchSettings('marketplace', t).map((result) => result.section);
  expect(sections).toContain('plugin-store');
  expect(searchSettings('plugin store', t).some((result) => result.id === 'plugin-store')).toBe(
    true,
  );
});
