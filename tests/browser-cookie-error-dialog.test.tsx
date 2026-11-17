import { expect, test } from 'bun:test';
import i18n from 'i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { initReactI18next } from 'react-i18next';
import { BrowserCookieErrorDialog } from '@/components/BrowserCookieErrorDialog';
import common from '@/i18n/locales/en/common.json';

await i18n.use(initReactI18next).init({ lng: 'en', resources: { en: { common } } });

const noop = () => {};

test('locked cookie database keeps the close-the-browser advice', () => {
  const html = renderToStaticMarkup(
    <BrowserCookieErrorDialog browserName="chrome" onRetry={noop} onDismiss={noop} />,
  );

  expect(html).toContain('Cookie Access Failed');
  expect(html).toContain('Chrome is currently open');
  expect(html).toContain('Retry Download');
});

test('missing profile asks for another profile instead of closing the browser', () => {
  const html = renderToStaticMarkup(
    <BrowserCookieErrorDialog
      kind="profile_not_found"
      browserName="chrome"
      onRetry={noop}
      onDismiss={noop}
      onGoToSettings={noop}
    />,
  );

  expect(html).toContain('Browser Profile Not Found');
  expect(html).toContain('Choose Browser Profile');
  expect(html).not.toContain('is currently open');
});

test.skipIf(navigator.platform.includes('Mac'))(
  'blocked profile folder outside macOS shows the generic permission hint',
  () => {
    const html = renderToStaticMarkup(
      <BrowserCookieErrorDialog
        kind="access_denied"
        browserName="chrome"
        onRetry={noop}
        onDismiss={noop}
      />,
    );

    expect(html).toContain('The system denied access to the browser profile');
    expect(html).not.toContain('Full Disk Access');
  },
);
