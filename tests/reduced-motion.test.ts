import { afterEach, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { prefersReducedMotion, scrollBehavior } from '@/lib/motion';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

function stubWindow(value: unknown) {
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
}

function stubReducedMotion(reduce: boolean) {
  stubWindow({
    matchMedia: (query: string) => ({
      matches: reduce && query === '(prefers-reduced-motion: reduce)',
    }),
  });
}

afterEach(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

describe('reduced motion', () => {
  test('follows the system setting', () => {
    stubReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(scrollBehavior()).toBe('auto');

    stubReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
    expect(scrollBehavior()).toBe('smooth');
  });

  test('keeps motion when matchMedia is unavailable', () => {
    stubWindow({});
    expect(prefersReducedMotion()).toBe(false);
    Reflect.deleteProperty(globalThis, 'window');
    expect(prefersReducedMotion()).toBe(false);
  });

  test('the stylesheet stops animations but keeps progress spinners', () => {
    const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
    const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(block).toContain('*:not([class~="animate-spin"]):not([class~="animate-pulse"])');
    expect(block).toContain('animation-iteration-count: 1 !important');
    expect(block).toContain('transition-duration: 0.01ms !important');
  });
});
