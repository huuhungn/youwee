import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderPluginManifestIcon } from '../src/components/settings/plugins/post-download-plugins-shared';

const iconClass = (icon: string | null) =>
  renderToStaticMarkup(renderPluginManifestIcon(icon)).match(/lucide-([a-z0-9-]+)/)?.[1];

describe('renderPluginManifestIcon', () => {
  test('renders the Lucide icon a manifest names', () => {
    expect(iconClass('Globe')).toBe('globe');
    expect(iconClass('file-cog')).toBe('file-cog');
    expect(iconClass('sparkles.svg')).toBe('sparkles');
  });

  test('falls back to the puzzle icon for unknown or non-icon names', () => {
    expect(iconClass('not-an-icon')).toBe('puzzle');
    expect(iconClass('')).toBe('puzzle');
    expect(iconClass(null)).toBe('puzzle');
    expect(iconClass('icons')).toBe('puzzle');
    expect(iconClass('Icon')).toBe('puzzle');
    expect(iconClass('createLucideIcon')).toBe('puzzle');
  });
});
