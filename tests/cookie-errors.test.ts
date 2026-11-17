import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getCookieErrorKind } from '../src/lib/cookie-errors';

describe('getCookieErrorKind', () => {
  test('maps backend cookie error codes to dialog kinds', () => {
    expect(getCookieErrorKind('YT_COOKIE_ACCESS_DENIED', null)).toBe('access_denied');
    expect(getCookieErrorKind('YT_COOKIE_PROFILE_NOT_FOUND', null)).toBe('profile_not_found');
    expect(getCookieErrorKind('YT_COOKIE_DB_LOCKED', null)).toBe('db_locked');
    expect(getCookieErrorKind('YT_FRESH_COOKIES_REQUIRED', null)).toBe('fresh_cookies');
  });

  test('a missing cookie database is not reported as a locked one', () => {
    expect(
      getCookieErrorKind(
        'BACKEND_UNKNOWN',
        'ERROR: could not find chrome cookies database in "/Users/me/Library/Application Support/Google/Chrome/Profile 3"',
      ),
    ).toBeNull();
  });

  test('still recognises Windows lock and decryption failures by message', () => {
    expect(getCookieErrorKind(undefined, 'ERROR: Could not copy Chrome cookie database')).toBe(
      'db_locked',
    );
    expect(getCookieErrorKind(undefined, 'Failed to decrypt with DPAPI')).toBe('db_locked');
    expect(
      getCookieErrorKind(
        'PROCESS_EXIT_NON_ZERO',
        'Download failed (exit code 1): ERROR: Could not decrypt cookie: App-Bound Encryption',
      ),
    ).toBe('db_locked');
  });

  test('unrelated errors show no cookie dialog', () => {
    expect(
      getCookieErrorKind('YT_BOT_CHECK', 'Use --cookies-from-browser or --cookies'),
    ).toBeNull();
  });
});

describe('cookie error translations', () => {
  const root = join(import.meta.dir, '..');
  const localesDir = join(root, 'src/i18n/locales');
  const load = (locale: string) =>
    JSON.parse(readFileSync(join(localesDir, locale, 'common.json'), 'utf8'));
  const flatten = (node: unknown, prefix = ''): string[] =>
    typeof node === 'object' && node !== null
      ? Object.entries(node).flatMap(([key, value]) => flatten(value, `${prefix}${key}.`))
      : [prefix.slice(0, -1)];
  const english = load('en');
  const dialogKeys = flatten(english.cookieErrorDialog);

  test.each(readdirSync(localesDir))('%s has every cookie dialog and error string', (locale) => {
    const messages = load(locale);
    expect(flatten(messages.cookieErrorDialog)).toEqual(dialogKeys);
    for (const code of ['YT_BOT_CHECK', 'YT_COOKIE_ACCESS_DENIED', 'YT_COOKIE_PROFILE_NOT_FOUND']) {
      expect(typeof messages.backendErrors[code]).toBe('string');
    }
    // Shown as a toast on every OS; the macOS Full Disk Access steps live in the dialog.
    expect(messages.backendErrors.YT_COOKIE_ACCESS_DENIED).not.toContain('macOS');
  });
});
