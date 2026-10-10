export type HistoryItemPrimaryAction = 'open-folder' | 'split' | 'locate-moved-file' | 'redownload';

export type HistoryItemOverflowAction =
  | 'rename'
  | 'open-url'
  | 'copy-url'
  | 'manage-tags'
  | 'delete';

export interface HistoryItemActionLayoutInput {
  fileExists: boolean;
  isDataExport: boolean;
  isImageGallery: boolean;
  canSplitMedia: boolean;
}

export interface HistoryItemActionLayout {
  primary: HistoryItemPrimaryAction[];
  overflow: HistoryItemOverflowAction[];
}

/**
 * Decide which Library item actions stay visible and which move into the
 * "More" menu. Visible actions are the ones that act on the media file;
 * occasional actions (rename, URL, tags, delete) live in the overflow menu.
 */
export function getHistoryItemActionLayout({
  fileExists,
  isDataExport,
  isImageGallery,
  canSplitMedia,
}: HistoryItemActionLayoutInput): HistoryItemActionLayout {
  const primary: HistoryItemPrimaryAction[] = [];
  const overflow: HistoryItemOverflowAction[] = [];

  if (fileExists) {
    primary.push('open-folder');
    if (canSplitMedia) primary.push('split');
    if (!isImageGallery) overflow.push('rename');
  } else if (!isDataExport) {
    if (!isImageGallery) primary.push('locate-moved-file');
    primary.push('redownload');
  }

  if (!isDataExport) {
    overflow.push('open-url', 'copy-url');
  }

  overflow.push('manage-tags', 'delete');

  return { primary, overflow };
}
