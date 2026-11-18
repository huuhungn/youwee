# Upstream 0.21.0 disposition ledger

Status: the three error-message `port` rows (`9b63b1a`, `df8ac79`, `610d73c`) were adapted on branch `chore/upstream-0.21.0-port` and ship in `0.20.1-custom.15`. `7d815e1` was ported afterwards on `port/upstream-0.21.0-filename-position`, `05cb871` on `chore/upstream-0.21.0-deps`, `bb2ab09` and `581dba3` on `feat/upstream-0.21.0-setup-dialog`, `02821b8` on `fix/linux-desktop-categories`, and `fd8dd62` on `feat/extension-x-inline-buttons`. Every other row is ledger only: 3 `port` rows stay open for a later wave, and 17 `record` rows are closed.

- Fork base: `a4c24f8` (`0.20.1-custom.14`, `origin/main`)
- Upstream tip: `5fed7ac` (`v0.21.0`, 2026-11-13)
- Previous ledger point: `8db7ea4` (`v0.20.4`, see `docs/upstream-0.20.4-ledger.md`)
- Merge base: `939aaba` (2026-06-23)
- Source command: `git log --reverse v0.20.4..v0.21.0` and `git cherry -v a4c24f8 v0.21.0`
- Result: 29 commits below (14 non-merge, 15 merge), and no commit already equivalent
- Divergence at the fork base: 211 commits ahead of and 163 behind `v0.21.0`

The fork diverges on purpose, so nothing here is merged or cherry-picked as is. A row marked `port` means at least one required file or behavior is absent. A row marked `adapt` means the fork already has the area under a different patch; diff upstream against the fork and take only the missing delta. A row marked `record` changes only version, changelog, README, or merge identity and must not be copied onto the custom version line. Upstream changelog text and the `0.21.0` version are never copied.

## Counts

| Disposition | Count | Meaning |
| --- | ---: | --- |
| port | 7 | Missing behavior or missing file. 3 ported (in `0.20.1-custom.15`), `02821b8` ported later, 3 open or not replayed. |
| adapt | 5 | Fork has the area. Diff upstream against the fork and take only the missing delta. All 5 ported (`7d815e1`, `05cb871`, `bb2ab09`, `581dba3`, then `fd8dd62`). |
| record | 17 | Changelog, upstream version identity, or merge commits with no own content. |
| Total | 29 | |

## Equivalent, not replayed

None. `git cherry -v a4c24f8 v0.21.0` marks all 14 non-merge commits `+`.

## Port

| SHA | Date | Subject | Why it is still missing |
| --- | --- | --- | --- |
| `9b63b1a` | 2026-10-30 | fix: explain age-verification quality limit for YouTube downloads | **Ported on `chore/upstream-0.21.0-port`.** `is_youtube_age_verification_notice` and a once-per-download info log, wired into the fork's sidecar stdout/stderr loop and both readers of `handle_tokio_download`. |
| `df8ac79` | 2026-10-30 | fix: report YouTube bot check separately from sign-in errors | **Ported on `chore/upstream-0.21.0-port`.** New `YT_BOT_CHECK` code in `types/error.rs`, `parse_ytdlp_error`, `build_download_error_message`, `backend-error.ts`, and all 13 `common.json` files (upstream strings). |
| `610d73c` | 2026-11-13 | fix: show the real cause when browser cookies can't be read | **Adapted on `chore/upstream-0.21.0-port`.** Backend codes `YT_COOKIE_ACCESS_DENIED` and `YT_COOKIE_PROFILE_NOT_FOUND` with the folder probe, `src/lib/cookie-errors.ts`, and the three-variant dialog translated in 13 locales. The dialog keeps the fork's `ModalShell`. The message fallback keeps the fork's App-Bound/DPAPI coverage (`parse_ytdlp_error`: "failed to" or "could not" decrypt with DPAPI or cookie), which is wider than upstream's `failed to decrypt.*dpapi`. |
| `02821b8` | 2026-10-29 | fix: add categories to Linux desktop entry | **Ported on `fix/linux-desktop-categories`.** Upstream `src-tauri/linux/youwee.desktop` template as is, `bundle.linux.deb.desktopTemplate` (AppImage reuses it), and the CI `Categories=` check after `fix-deb-deep-link-desktop-entry.sh`, which rewrites only `Exec=` and `MimeType=`. The Flatpak manifest already appends the same categories. |
| `9e68aea` | 2026-10-30 | feat: embed AppImage update information | **Open, ledger only.** The fork's AppImage repair step embeds no zsync update information and the release uploads no `.zsync`. The upstream line uses `github.repository_owner` and `github.event.repository.name`, so it resolves to `huuhungn/youwee` without edits; needs `zsync` on the runner and a release dry run. |
| `c121ae1` | 2026-10-30 | fix: read AppImage update information without running it in CI | **Open, ledger only.** CI follow-up of `9e68aea`; port together with it. |
| `0d2f77b` | 2026-11-13 | feat: add Infistar sponsor to README and AI providers | **Not replayed.** Upstream sponsor placement: README sponsor block, a referral link, and an `Infistar` AI provider (`services/infistar.rs`). It is a sponsorship of upstream, not a fix; add only if the owner wants that provider. |

## Adapt

Diff these against the fork before editing. Do not replace the fork copy wholesale.

| SHA | Date | Subject | Fork evidence |
| --- | --- | --- | --- |
| `7d815e1` | 2026-11-12 | feat: let filename metadata go after the title | The fork has `filenameMetadataEnabled` and `filenameMetadataFields` in `src/lib/types.ts` but no `filenameMetadataPosition`. **Ported** on branch `port/upstream-0.21.0-filename-position`. The position (`prefix` default, `suffix`) is threaded through the fork's settings, item snapshots, history re-download and Channels flows; `build_output_template` inserts the metadata before the extension, so custom filename templates work and numbering stays first. |
| `bb2ab09` | 2026-11-12 | feat: add first-run setup dialog for yt-dlp Stable and FFmpeg | The fork has `FFmpegDialog.tsx`, `DenoDialog.tsx` and `DependenciesContext`. **Ported** on branch `feat/upstream-0.21.0-setup-dialog`, adapted. `SetupDialog` drives the fork's own `DependenciesContext` actions (`downloadChannelBinary`, `setYtdlpChannel`, `downloadFfmpeg`) inside the fork's `ModalShell`, and Master users keep Master as Nightly users keep Nightly. Owner decision: the fork keeps zero-setup for the Full pack, so the dialog opens on its own only when something is really missing (FFmpeg not installed, or the selected yt-dlp channel's file is gone). Upstream also opens it to move bundled yt-dlp to Stable; here that step is listed only when the user opens the dialog from "Set up high quality". Kept: `FFmpegDialog`, which stays as the reminder on later launches while FFmpeg is missing (the setup dialog takes the first launch, at most one of the two opens per launch, and both wait for the Deno first-run dialog and the update dialog), `DenoDialog` and its auto-install, and the dependency pack: FFmpeg packaged with Youwee counts as installed, so the dialog never offers it. The seen flag is `youwee_setup_dialog_seen` in localStorage, like the fork's other UI flags. Backend delta: only the streamed `download_ytdlp_channel` with `ytdlp-download-progress` events; the 5% event throttle is `dependency_download_percent` in `services/mod.rs`, shared with gallery-dl. Also taken: the `dependency-progress.ts` labels in Settings → Dependencies and the download Guide entry that reopens the dialog. |
| `581dba3` | 2026-11-12 | feat: install gallery-dl from the app | The fork already installs gallery-dl in the app from Codeberg, verified against `SHA256SUMS`, with a Homebrew hint on macOS (`services/gallerydl.rs`; keep list). **Ported** (remaining delta only) on branch `feat/upstream-0.21.0-setup-dialog`: `install_gallerydl` streams the same Codeberg download with `gallerydl-download-progress` events (source and checksum check unchanged), the Gallery page has an "Install gallery-dl" entry with the setup dialog's progress bar, Settings → Dependencies shows the same stage labels, and the Gallery "Open Dependencies" button opens Dependencies (upstream changelog `682b7ab`). The install entry is shown only where `GalleryDlStatus.can_install` is true, which the backend derives from the same asset rule as the download (Windows and x86_64 Linux). Not taken: upstream's parallel `download_gallerydl` command, the Homebrew/pip copy box and the two new error codes. |
| `fd8dd62` | 2026-11-13 | feat: add inline download buttons to X video posts in browser extension | The fork extension already lists `x.com` and `twitter.com` hosts and video selectors in `extensions/youwee-webext/src/shared.js`. **Ported on `feat/extension-x-inline-buttons`.** Upstream adds inline buttons on X posts (`content.js`, `content.css`). Adapted: the icon is built with the fork's `createActionIcon` DOM helper instead of `innerHTML`, and the button keeps a visible `:focus-visible` outline (upstream sets `outline: none`) and drops its color transition under `prefers-reduced-motion`. Checked with the built Chromium extension on a stubbed x.com feed: buttons only on video posts (also ones added later), placed before Bookmark, no floating widget, and click or Enter opens `youwee://download?...url=<post permalink>&action=download_now&media=video&quality=best`. |
| `05cb871` | 2026-11-13 | chore: update dependencies | The fork matches upstream's previous dependency wave (PR #28, PR #29). **Ported** on branch `chore/upstream-0.21.0-deps` as its own upgrade wave. Tauri 2.12 (Rust crates and the `@tauri-apps` JS packages together), rusqlite 0.42, zip 9.5, Biome 2.6 (exact pin, Markdown and YAML formatter and linter off, `lineEnding` `lf` in place of the fork's earlier `auto`), Vite 8.3, React 19.3 and the other frontend bumps, with the zip 9 call-site fixes in `utils/extract.rs` and `services/plugin/package.rs` and `TFunction` typing in `HistoryItem.tsx` and `post-download-plugins-shared.tsx`. Fork-only dependencies and `rust-version` handling follow the fork's Cargo.toml (`1.90` now), and the app version is unchanged. |

## Record

Do not cherry-pick these. Their product behavior is either already represented above or they only carry upstream release or merge identity.

| SHA | Date | Subject | Record |
| --- | --- | --- | --- |
| `e258713` | 2026-10-30 | Merge pull request #131 from vanloctech/fix/issue-127-linux-desktop-category | Merge of `02821b8`; no own content. |
| `fe12642` | 2026-10-30 | Merge remote-tracking branch 'origin/main' into fix/issue-125-appimage-update-info | Branch sync; resolves upstream changelog conflicts only. |
| `bdb9e48` | 2026-10-30 | Merge pull request #133 from vanloctech/fix/issue-125-appimage-update-info | Merge of `9e68aea` and `c121ae1`; no own content. |
| `b715e0a` | 2026-10-30 | Merge pull request #134 from vanloctech/fix/issue-128-age-restricted-quality | Merge of `9b63b1a`; no own content. |
| `ad83976` | 2026-10-30 | Merge remote-tracking branch 'origin/main' into fix/issue-129-youtube-bot-check | Branch sync; resolves upstream changelog conflicts only. |
| `458751a` | 2026-11-12 | Merge pull request #135 from vanloctech/fix/issue-129-youtube-bot-check | Merge of `df8ac79`; no own content. |
| `1054ce6` | 2026-11-12 | Merge pull request #139 from vanloctech/feat/issue-138-filename-metadata-position | Merge of `7d815e1`; no own content. |
| `6666ad2` | 2026-11-12 | Merge pull request #140 from vanloctech/feat/first-run-setup-dialog | Merge of `bb2ab09`; no own content. |
| `95db8dd` | 2026-11-13 | Merge pull request #141 from vanloctech/feat/issue-136-install-gallery-dl | Merge of `581dba3`; no own content. |
| `048248f` | 2026-11-13 | Merge remote-tracking branch 'origin/main' into docs/readme-infistar-sponsor | Branch sync; resolves upstream changelog conflicts only. |
| `3e57400` | 2026-11-13 | Merge pull request #142 from vanloctech/docs/readme-infistar-sponsor | Merge of `0d2f77b`; no own content. |
| `0265829` | 2026-11-13 | Merge pull request #144 from vanloctech/fix/cookie-access-errors | Merge of `610d73c`; no own content. |
| `305ec94` | 2026-11-13 | Merge pull request #145 from vanloctech/chore/update-dependencies | Merge of `05cb871`; resolves upstream changelog conflicts only. |
| `ffe9c6d` | 2026-11-13 | Merge pull request #143 from nguyenphutrong/feat/x-inline-download-buttons | Merge of `fd8dd62`; no own content. |
| `682b7ab` | 2026-11-13 | docs: add missing Gallery fix to the Unreleased changelog | Changelog only. The Gallery button fix it describes is part of `581dba3` (see Adapt). |
| `710c9d9` | 2026-11-13 | Merge pull request #146 from vanloctech/docs/changelog-unreleased | Merge of `682b7ab`; no own content. |
| `5fed7ac` | 2026-11-13 | chore: release v0.21.0 | Upstream version identity. |

## Keep list

These fork-only surfaces must still exist after every later port wave:

- TikTok Live recorder modules and `tests/tiktok-live-duration.test.ts`
- In-app gallery-dl install
- `plugin-store/` and its `minAppVersion` gate
- Bundled signed Firefox extension and `tests/firefox-extension-validation.test.ts`
- H.264 compatibility preset
- Xiaohongshu gallery support
- `scripts/bump-custom-version.mjs`
- Custom updater endpoint in `src-tauri/tauri.conf.json`
- Version line `0.20.1-custom.x` in both `package.json` and `src-tauri/Cargo.toml`
- `ModalShell` dialog semantics (`tests/dialog-accessibility.test.tsx`)

## Next wave

Port wave 1 (2026-11-17, branch `chore/upstream-0.21.0-port`, release `0.20.1-custom.15`): `9b63b1a` and `df8ac79` ported, `610d73c` adapted. To check fit, each upstream hunk was compared with the fork's copy of `download.rs`, `ytdlp.rs`, `error.rs`, `backend-error.ts`, the two download contexts and `BrowserCookieErrorDialog.tsx`; the Rust hunks applied to code of the same shape, while the dialog and the cookie message pattern were adapted as noted in the Port table. Locale strings were copied from upstream for all 13 locales, and `tests/cookie-errors.test.ts` checks that every locale has every new key. Tested: `bun test`, `bun x tsc -b`, Biome with LF line endings, `cargo check --tests`, `cargo fmt --check`, and CI on the PR head. Not tested: a live bot check, an age-restricted download, or the macOS Full Disk Access path in the packaged app.

Open rows, in suggested order: the AppImage update-information rows `9e68aea` and `c121ae1` together (Ubuntu runner and a release dry run). `02821b8` and `fd8dd62` shipped on their own, since neither depends on them. `0d2f77b` waits for an owner decision.
