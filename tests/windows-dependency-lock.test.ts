import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const lock = JSON.parse(
  readFileSync(join(import.meta.dir, '..', 'src-tauri/dependencies.windows.lock.json'), 'utf8'),
);

test('the bundled yt-dlp pin downloads the release it names and is checksum-pinned', () => {
  const ytdlp = lock.dependencies.find(
    (dependency: { name: string }) => dependency.name === 'yt-dlp',
  );

  expect(ytdlp.version).toMatch(/^\d{4}\.\d{2}\.\d{2}(\.\d+)?$/);
  expect(ytdlp.url).toBe(
    `https://github.com/yt-dlp/yt-dlp/releases/download/${ytdlp.version}/yt-dlp.exe`,
  );
  expect(ytdlp.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(ytdlp.files).toEqual([
    { source: 'yt-dlp.exe', target: 'src-tauri/bin/youwee-yt-dlp-x86_64-pc-windows-msvc.exe' },
  ]);
});
