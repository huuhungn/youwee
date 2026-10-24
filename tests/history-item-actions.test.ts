import { describe, expect, test } from 'bun:test';
import { getHistoryItemActionLayout } from '../src/components/history/historyItemActions';

describe('getHistoryItemActionLayout', () => {
  test('keeps file actions visible and moves the rest into More', () => {
    const layout = getHistoryItemActionLayout({
      fileExists: true,
      isDataExport: false,
      isImageGallery: false,
      canSplitMedia: true,
    });

    expect(layout.primary).toEqual(['open-folder', 'split']);
    expect(layout.overflow).toEqual(['rename', 'open-url', 'copy-url', 'manage-tags', 'delete']);
  });

  test('offers locate and re-download when the media file is missing', () => {
    const layout = getHistoryItemActionLayout({
      fileExists: false,
      isDataExport: false,
      isImageGallery: false,
      canSplitMedia: false,
    });

    expect(layout.primary).toEqual(['locate-moved-file', 'redownload']);
    expect(layout.overflow).toEqual(['open-url', 'copy-url', 'manage-tags', 'delete']);
  });

  test('does not offer rename, split, or locate for image galleries', () => {
    expect(
      getHistoryItemActionLayout({
        fileExists: true,
        isDataExport: false,
        isImageGallery: true,
        canSplitMedia: false,
      }),
    ).toEqual({
      primary: ['open-folder'],
      overflow: ['open-url', 'copy-url', 'manage-tags', 'delete'],
    });

    expect(
      getHistoryItemActionLayout({
        fileExists: false,
        isDataExport: false,
        isImageGallery: true,
        canSplitMedia: false,
      }).primary,
    ).toEqual(['redownload']);
  });

  test('does not show URL or re-download actions for data exports', () => {
    expect(
      getHistoryItemActionLayout({
        fileExists: true,
        isDataExport: true,
        isImageGallery: false,
        canSplitMedia: false,
      }),
    ).toEqual({ primary: ['open-folder'], overflow: ['rename', 'manage-tags', 'delete'] });

    expect(
      getHistoryItemActionLayout({
        fileExists: false,
        isDataExport: true,
        isImageGallery: false,
        canSplitMedia: false,
      }),
    ).toEqual({ primary: [], overflow: ['manage-tags', 'delete'] });
  });
});
