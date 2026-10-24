# Upstream 0.20.4 disposition ledger

Status: all `port` rows ported (PR #4). Adapt wave 1 (the six 2026-06-28 rows) closed on branch `port/upstream-adapt-wave-1`: 2 changed, 3 already equivalent, 1 recorded. Adapt wave 2 (the ten 2026-06-29 rows) closed on branch `port/upstream-adapt-wave-2`: 2 changed, 6 already equivalent, 1 not replayed, 1 recorded. Adapt wave 3 (the four 2026-06-30 rows) closed on branch `port/upstream-adapt-wave-3`: 1 adapted in `3511969` (PR #8), 3 already equivalent. 35 `adapt` rows remain open (58 minus 3 Linux packaging, 6 wave 1, 10 wave 2, and 4 wave 3).

- Fork base: `9e16de9` (`0.20.1-custom.7`, `origin/main`)
- Upstream tip: `8db7ea4` (`0.20.4`, `upstream/main`)
- Merge base: `939aaba` (2026-06-23)
- Source command: `git cherry -v 9e16de9 upstream/main`
- Result: 88 unique commits below, plus 6 commits already equivalent and excluded

`git cherry` equality is patch identity, not feature identity. A row marked `adapt` means the fork already has the same area under a different patch. A row marked `port` means at least one required file or behavior is absent. A row marked `record` changes only version, changelog, README, or release wording and must not be copied onto the custom version line.

## Counts

| Disposition | Count | Meaning |
| --- | ---: | --- |
| port | 16 | Missing behavior or missing file. Port the behavior, not the version bump. |
| adapt | 58 | Fork has the area. Diff upstream against the fork and take only the missing delta. |
| record | 14 | Docs, changelog, or upstream version identity. Record the fact; do not replay the patch. |
| Total | 88 | |

## Equivalent, not replayed

| SHA | Subject |
| --- | --- |
| `9659e77` | refactor: enhance button styles and spacing in queue item components |
| `58f5c84` | feat: upgrade GitHub release action from v2 to v3 in build configuration |
| `556927c` | Let native titlebar dragging own the drag region |
| `7bf47f4` | Find user-local Unix binaries without stale fork history |
| `e0c0bd9` | Route file reveal actions through the app command |
| `e9a0445` | feat: copy queue item URLs |

## Port

| SHA | Date | Subject | Why it is still missing |
| --- | --- | --- | --- |
| `7b62cec` | 2026-06-27 | feat: add playlist numbering and chapter splitting options in download settings | Already present on the fork: settings UI, persisted flags, item snapshots, and `download.rs` template helpers. No new module imported. |
| `8c99b66` | 2026-06-28 | feat: implement plugin workflow refresh for retried downloads | Ported the missing retry behavior. Manual retry now refreshes plugin workflow snapshots before restarting, while keeping the fork's synchronous queue ref. |
| `ab9461c` | 2026-06-29 | feat: add option to prefix regular queued downloads with their queue order | Already present: `numberQueueItems` is persisted, snapshotted, and passed as `queue_index`. |
| `434e632` | 2026-06-29 | feat: add automatic library collections for expanded playlists, channel downloads, and split chapter files | Already present: `autoOrganizeCollections` reaches the backend, and channel downloads have collection tests. |
| `903386b` | 2026-07-19 | feat: add Flatpak build support and update documentation | Ported the Flatpak manifest, `flatpak-test.yml`, the `flatpak` build job, and `.gitignore` excludes. The upstream metainfo file was later removed upstream, so it was not added. Updater and Settings Flatpak handling were already present. Changelog and README text were not copied. |
| `dc2aa89` | 2026-07-19 | feat: add Flatpak build support and update documentation | Ported the follow-up job content: Flatpak artifact upload, release dependency, required `Youwee-Linux.flatpak` asset, checksum, and release file globs. |
| `e65ddb0` | 2026-07-19 | feat: update Flatpak build configuration with appstream and runtime version change | Ported in the upstream-tip state, not this intermediate one: runtime is `49` (set by `f635cd7`), and the `appstream` package and metainfo check were removed again by `222d507`. |
| `222d507` | 2026-07-19 | feat: update Flatpak build configuration with appstream and runtime version change | Ported: no `appstream` package, no metainfo file or check, matching upstream tip. |
| `53bc789` | 2026-07-30 | fix(windows): improve yt-dlp filename safety without changing defaults | Already present in `services/ytdlp.rs`: Windows adds `--windows-filenames`, and trim length follows the output directory. The fork does not use a separate `utils/filename.rs`. |
| `a24a49a` | 2026-07-30 | fix(windows): cap trim at 180 and measure path length in bytes | Already present: short paths clamp to 180 and `output_path.len()` measures bytes. |
| `81e3dec` | 2026-08-01 | feat: add Turkish language support and update changelogs | Ported `tr` catalogs. Upstream changelog text was not copied. Fork-only keys stay in English. |
| `6cd2621` | 2026-08-01 | feat: add Uzbek language support and update changelogs | Ported `uz` catalogs. Upstream changelog text was not copied. Fork-only keys stay in English. |
| `72aad9c` | 2026-08-01 | feat: add Romanian language support and update changelogs | Ported `ro` catalogs. Upstream changelog text was not copied. Fork-only keys stay in English. |
| `814fcc2` | 2026-07-09 | fix(windows): keep output folders out of yt-dlp templates | Already present: download and metadata pass the folder through `--paths home:...`; the `-o` template stays a filename. |
| `ddab273` | 2026-09-20 | fix: improve AppImage runtime compatibility | Ported `scripts/repair-appimage-runtime.sh` (executable), the release repair and re-sign step, CI deb/AppImage bundle validation, and `squashfs-tools`. The fork deep-link fix script was already identical. |
| `3096176` | 2026-09-20 | fix: avoid system tray crash in Flatpak | Ported as `should_setup_system_tray()`, reusing the fork's `is_flatpak_environment()`. It skips tray setup and menu rebuilds in Flatpak, and closes normally instead of hiding to a missing tray. |

## Adapt

Diff these against the fork before editing. Do not replace the fork copy wholesale.

| SHA | Date | Subject | Fork evidence |
| --- | --- | --- | --- |
| `9e58456` | 2026-06-28 | feat: add cookie skip rules for authentication bypass on specified sites | `src/lib/network-config.ts` already has a cookie-skip catalog. **Wave 1 (2026-10-10): closed, already equivalent.** No code change. |
| `1b0fda1` | 2026-06-28 | feat: add recovered mutation for download.failed plugins to mark successful recoveries | Plugin workflow exists, but `recovered` is absent from `src-tauri/src/types/plugin.rs`. **Wave 1 (2026-10-10): ported in `06d1449`.** Backend `recovered` mutation, history update, finished progress event, SDK types, and queue guards. The fork's existing Universal status-event completion is kept. |
| `5737a75` | 2026-06-28 | feat: add yt-dlp advanced options for enhanced download control | `src/lib/ytdlp-advanced-options.ts` exists. Upstream also expected the missing settings module. **Wave 1 (2026-10-10): adapted in `3b409ad`.** The Universal queue now snapshots and sends the vetted advanced options. The fork's narrower option catalog and UI are kept. |
| `0b39644` | 2026-06-28 | refactor: improve code readability by reorganizing imports and formatting | Touches files the fork already owns. Take only if a later port needs the cleanup. **Wave 1 (2026-10-10): recorded, not replayed.** Upstream-only format refactor with no behavior missing from the fork. |
| `96e4b18` | 2026-06-28 | feat: add support for DOWNLOAD_CANCELLED error handling and state management | `download.rs` already returns `DOWNLOAD_CANCELLED`. **Wave 1 (2026-10-10): closed, already equivalent.** The fork already handles `DOWNLOAD_CANCELLED` in both queues. No code change. |
| `0d37f32` | 2026-06-28 | feat: add option to select output folder for individual downloads in queue | `QueueItem.tsx` already has `onSelectOutputFolder`. **Wave 1 (2026-10-10): closed, already equivalent.** The fork already has per-item output folder selection. No code change. |
| `b4e8574` | 2026-06-29 | chore: update version to 2.3.0 and document changes in CHANGELOG | SDK compatibility constant is still `2.2.0` in `sdk-js/src/compatibility.ts`. Keep app version custom. **Wave 2 (2026-10-11): closed by `237b40e` on `port/upstream-adapt-wave-1`.** SDK 2.3.0 with the `recovered` field; changelog is fork-dated and the app version is unchanged. |
| `c168d40` | 2026-06-29 | chore: update version to 0.18.0 and document changes in CHANGELOG | Also changes SDK package metadata. Do not copy app version `0.18.0`. **Wave 2 (2026-10-11): closed, recorded only.** Only changelogs and the app version `0.18.0` change; no SDK file is touched. Not replayed. |
| `fb87a3e` | 2026-06-29 | fix: resolve extension cold-start links issue preventing video addition on app launch | `src/hooks/useExternalDownloadLinks.ts` exists. Compare the cold-start queue. **Wave 2 (2026-10-11): closed, already equivalent.** All 59 added lines (12+ chars) in `external.rs`, the hook, and the test are present in the fork. |
| `85a66a9` | 2026-06-29 | feat: add tooltip to display binary path for ytdlp version in dependencies section | Dependencies section exists. Tooltip text still needs a diff. **Wave 2 (2026-10-11): closed, already equivalent.** All 12 added lines are present in `DependenciesSection.tsx`. |
| `2effb0a` | 2026-06-29 | feat: fix ordered list numbering in AI Summary to preserve sequence across blank lines | `simple-markdown.tsx` exists. Numbering behavior still needs a diff. **Wave 2 (2026-10-11): closed, already equivalent.** All 24 added lines in `simple-markdown.tsx` and its test are present. |
| `27d46f7` | 2026-06-29 | feat: add cancel action translations for multiple languages in common.json | Existing locale files need the cancel strings. **Wave 2 (2026-10-11): closed, already equivalent.** All toolbar and `common.json` cancel lines are present in the 8 touched locales and both toolbars. |
| `6e50186` | 2026-06-29 | feat: refactor context imports to use consistent naming conventions | Import cleanup only. Apply only where a port touches the same files. **Wave 2 (2026-10-11): closed, not replayed.** Moves context hooks into new lowercase files (`download-context.ts` and others). There is no behavior change, and the fork keeps hooks in the provider files. Replaying it would touch 31 files for naming only. |
| `0eb8e04` | 2026-06-29 | feat: implement summary session context and provider for managing summary state | `src/lib/summary-session.ts` and `tests/summary-session.test.ts` exist. **Wave 2 (2026-10-11): closed, already equivalent.** 10 of 348 added lines differ only because the fork is ahead: `requestSequence`, `resolveCookieSkipPatterns()`, the long-summary status, and loading text with params. |
| `0f8f9cb` | 2026-06-29 | feat: add loading state component to enhance user experience during data processing | Loading UI exists in fork components. Diff the missing state only. **Wave 2 (2026-10-11): closed, already equivalent.** All 22 added lines in `SummaryPage.tsx` are present. |
| `fd34076` | 2026-06-29 | feat: refine library item actions and enhance AI summary display in dedicated dialog | History summary dialog and tests exist. **Wave 2 (2026-10-11): adapted in `e26b1dc`.** Occasional actions moved into a More popover and the row is always visible. The summary dialog was already in the fork. `tests/history-item-actions.test.ts` added. The label reuses each locale's `download.settings.more`. |
| `981c3b4` | 2026-06-30 | feat: add preferred frame rate option for video downloads with quality warnings | Frame-rate settings exist in universal settings. **Wave 3 (2026-10-24): closed, already equivalent.** The fork keeps the settings inline in `DownloadContext.tsx` and `UniversalContext.tsx` instead of upstream's `src/lib/download-settings.ts`; the `preferredFps` default, persistence, and per-item snapshot match, and Rust passes it to `build_format_string` with 30/60 FPS tests in `utils/format.rs`. |
| `aea9114` | 2026-06-30 | feat: add option to prefer 30 FPS downloads with quality warnings and update changelogs | 30 FPS preference was not found as a named setting. Diff before adding. **Wave 3 (2026-10-24): closed, already equivalent.** All 186 added lines of 12+ characters outside the changelogs are present (channel `preferredFps` column, migration, polling, settings bar); only the upstream changelog text is absent. |
| `c8d9553` | 2026-06-30 | feat: update button styles and add control icons for improved UI interaction | Fork has its own button and icon styling. **Wave 3 (2026-10-24): adapted in `3511969` (PR #8).** Floating panel collapse and close buttons use SVG icons through the fork's shared `createIcon` helper instead of upstream's `CONTROL_ICONS`; both quality pickers draw the same SVG chevron as a select background instead of upstream's popup glyph span, so the popup chevron also dims when disabled. All 13 upstream CSS lines are present. |
| `b329fa2` | 2026-06-30 | feat: add stop action for channel video fetching and prevent re-fetching on revisiting followed channels | Channel download tests exist. Compare stop and revisit behavior. **Wave 3 (2026-10-24): closed, already equivalent.** All 93 added lines of 12+ characters outside the changelogs are present (stop command and registration, client, controller, channel pages); only the upstream changelog text is absent. |
| `08b3f65` | 2026-07-01 | feat: implement duplicate download detection and handling in settings | `src/lib/download-duplicates.ts` and its test exist. |
| `ac22aa3` | 2026-07-01 | feat: implement duplicate download detection and handling in settings | Second duplicate-detection pass. Diff against the fork copy. |
| `7ec0816` | 2026-07-01 | feat: add clear input button to URL input fields for improved user experience | Clear-input UI exists. |
| `b349523` | 2026-07-01 | feat: add library delete behavior setting to control media file deletion on item removal | `src/lib/library-delete-behavior.ts` exists. |
| `944b57d` | 2026-07-02 | feat: add audio media icon support in history item display | History items already render media icons. |
| `e121a5a` | 2026-07-03 | feat: fix oversized Font Awesome icons in Settings layouts and update changelogs | `FaIcon.tsx` exists. Check the size override. |
| `3fa7518` | 2026-07-04 | feat: add confirmation dialog for updating queued download folder path | Queue folder selection exists. Confirmation dialog still needs a diff. |
| `7a0dbe2` | 2026-07-04 | feat: add media splitting functionality with FFmpeg support and UI integration | `media_split.rs` and `SplitMediaDialog.tsx` exist. |
| `830dea3` | 2026-07-04 | feat: add remote download functionality with Telegram command support in documentation | Fork already has Telegram remote-download work. Diff the docs and command contract. |
| `abf72db` | 2026-07-18 | feat: add new columns to history table for enhanced data tracking | History storage exists, including SQLite handling. Diff the schema. |
| `fcc1172` | 2026-07-30 | Keep Unicode titles from lossy download output | Fork has Unicode title handling and Windows path code. |
| `b5833b8` | 2026-07-30 | feat: add Japanese language support and translations for the app interface | `src/i18n/locales/ja` exists. Merge new strings only. |
| `09db9d0` | 2026-07-30 | feat: add Spanish language support and translations for the app interface | `src/i18n/locales/es` exists. Merge new strings only. |
| `84a1641` | 2026-07-30 | feat: update changelogs and fix various issues on Windows and Unix | Mixed fix commit. Split the code delta from changelog text. |
| `5262668` | 2026-07-30 | Extract pasted URLs through the shared source helper | `src/lib/sources.ts` and `tests/source-url-extraction.test.ts` exist. |
| `7f6ba10` | 2026-07-30 | feat: add long video summary format options and enhance summary generation process | Summary session and long-summary code exist. |
| `4237340` | 2026-07-30 | feat: implement long video summary batching and cancellation handling | Same summary stack. Diff batching and cancellation. |
| `d926929` | 2026-07-30 | feat: implement summary font size management and update dialog components | `src/lib/summary-font-size.ts` exists. |
| `11030e3` | 2026-07-30 | feat: add long summary word limit management and enhance related functionality | Summary settings exist. Word-limit control still needs a diff. |
| `7144215` | 2026-07-30 | feat: add self-correcting OpenAI sampling-param handling | OpenAI sampling code exists. |
| `c164a0f` | 2026-07-30 | feat: implement yt-dlp auto-update notification and settings management | `src/lib/ytdlp-auto-update.ts` and its test exist. |
| `00a7086` | 2026-07-30 | Resolve Firefox cookie profiles before yt-dlp uses them | `src-tauri/src/utils/firefox_profiles.rs` exists. |
| `584e99e` | 2026-07-30 | feat: extend OpenAI param handling to Proxy + add unit tests | OpenAI param handling exists. Check the Proxy provider path. |
| `0b86a62` | 2026-07-31 | feat: add universal codec selection for video downloads | `src/lib/video-compatibility.ts` exists, including the fork H.264 preset. |
| `5b1c29e` | 2026-08-01 | feat: add filename metadata option for downloads and update changelogs | `src/lib/filename-metadata.ts` and its test exist. |
| `e1ae38d` | 2026-08-01 | feat: add Plugin Store section with settings and validation for plugins | `plugin-store/` and `PluginStoreSection.tsx` exist. |
| `3db7e04` | 2026-08-01 | fix: update dependencies and improve SQLite data handling for filesize and duration | Fork SQLite history handling exists. Diff the type fix only. |
| `8a2ec47` | 2026-08-01 | fix: update export order and improve null checks across multiple components | Fork SDK exports differ. Keep fork export order unless a null check is missing. |
| `17d725e` | 2026-08-01 | fix: resolve Add button issue on older macOS WebViews and replace crypto.randomUUID with createClientId | `src/lib/client-id.ts` and `tests/client-id.test.ts` exist. macOS WebView path is not the fork's Windows target. |
| `57d9f97` | 2026-07-30 | fix: scope output fallback to current download job | Download command exists. Job-scoped fallback was not found as a named guard. |
| `cce6805` | 2026-08-23 | fix: ensure Linux deep-link desktop entry handles youwee:// URLs correctly | `scripts/fix-deb-deep-link-desktop-entry.sh` exists. Diff the later URL fix. |
| `66547d4` | 2026-08-23 | fix: add CI validation for Linux package to ensure deep-link desktop entries preserve URL requests | `.github/workflows/build.yml` exists. Fork has no `flatpak-test.yml`. |
| `760e1b2` | 2026-09-20 | fix: inherit settings for extension downloads | Extension download path exists. Inheritance of global settings was not found. |
| `f9f22be` | 2026-09-20 | fix: respect auto subtitle languages | Subtitle selection code exists. Compare language filtering. |
| `cff9719` | 2026-09-20 | fix: use Linux AppImage binary name | Included in the Linux packaging port: the repair step passes the binary name `youwee`. |
| `f635cd7` | 2026-09-20 | fix: stabilize Flatpak WebKit runtime | Included in the Linux packaging port: manifest runtime `49`, `xvfb`, and the Flatpak launch smoke test in both workflows. |
| `7aeb63a` | 2026-09-20 | fix: update version to 0.20.4 and adjust Firefox extension signing order | Fork Firefox signing flow exists. Take the signing order only, never version `0.20.4`. |
| `8db7ea4` | 2026-09-20 | fix: provide key when re-signing AppImage | Included in the Linux packaging port: the AppImage repair step gets the Tauri signing key env before `tauri signer sign`. |

## Record

Do not cherry-pick these. Their product behavior is either already represented above or they only carry upstream release identity.

| SHA | Date | Subject | Record |
| --- | --- | --- | --- |
| `5edbbbf` | 2026-06-29 | feat: update release body and requirements in build configuration | Release-note wording. Revisit only if a workflow port needs the same template line. |
| `cb7e8fd` | 2026-07-02 | feat: update contribution guidelines to clarify feature branch creation from main | Upstream contributing docs. Fork branch policy stays local. |
| `217812e` | 2026-07-02 | feat: update default branch from develop to main and clarify branch and PR rules | Same. Fork already uses `main`. |
| `7a7b2c3` | 2026-07-04 | feat: bump version to 0.19.0 and update changelogs for new features | Upstream version identity. |
| `5488a2a` | 2026-07-31 | feat: update changelogs with Firefox profiles, Unicode titles, URL extraction, Windows filename safety, and OpenAI sampling | Changelog only. The related code rows are above. |
| `f053abe` | 2026-08-01 | feat: bump version to 0.20.0 and update changelogs with new language translations | Upstream version identity. |
| `97d4ebc` | 2026-08-01 | feat: update changelogs for AppImage icon fix and bump dependencies | Changelog and dependency note. Inspect lockfile only if a later build fails. |
| `cbf7820` | 2026-08-01 | feat: remove sponsor section from README files | README only. |
| `3d4d790` | 2026-08-01 | update package | Package metadata only. |
| `47d4976` | 2026-08-01 | chore: bump version to 0.20.1 and update changelogs for new features | Upstream version identity. |
| `69a9f3c` | 2026-08-01 | fix: update README files to wrap logo image in a link | README only. |
| `7de7b68` | 2026-08-18 | fix: update star history chart links in README files | README only. |
| `e48bf45` | 2026-08-23 | chore: bump version to 0.20.2 and update changelogs for new fixes | Upstream version identity. |
| `150d354` | 2026-08-23 | chore: bump version to 0.20.3 and update changelogs for new fixes | Upstream version identity. |

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

## Next wave

All 6 Linux packaging `port` rows (`903386b`, `dc2aa89`, `e65ddb0`, `222d507`, `ddab273`, `3096176`) were ported on 2026-10-10 on the fork's workflows, without upstream changelog or version text. Not tested locally: the Flatpak and AppImage jobs need an Ubuntu runner. Locales `81e3dec`, `6cd2621`, and `72aad9c` were ported on 2026-10-10 with English fallbacks for fork-only keys and without upstream changelog text. The Windows filename guards `53bc789`, `a24a49a`, and `814fcc2` were rechecked on 2026-10-10 and were already present, so their upstream helper was not copied. After each later port, rerun the relevant `adapt` diff before editing that area.

Adapt wave 1 (2026-10-10, branch `port/upstream-adapt-wave-1`): `5737a75` adapted in `3b409ad` and `1b0fda1` ported in `06d1449`; `9e58456`, `96e4b18`, and `0d37f32` were already equivalent; `0b39644` was recorded only. Tested: `bun test` for universal settings, advanced options, and the SDK; `bunx tsc -b`; biome; `cargo clippy --all-targets -D warnings`; `cargo test --lib plugin`. Not tested: a live Universal download with an advanced option enabled, and a live fallback plugin recovery in the packaged app. The next group is the following date block of open `adapt` rows.

Adapt wave 2 (2026-10-11, branch `port/upstream-adapt-wave-2`): `fd34076` adapted in `e26b1dc`; `b4e8574` closed by `237b40e` (SDK 2.3.0, on the wave 1 branch); `fb87a3e`, `85a66a9`, `2effb0a`, `27d46f7`, `0eb8e04`, and `0f8f9cb` were already equivalent; `6e50186` was not replayed (naming-only context split); `c168d40` was recorded only. To check equivalence, every added upstream line of 12+ characters was searched for in the fork's current copy of the same file. Tested: `bun test` (173 pass), `bunx tsc --noEmit`, biome with LF line endings, and a mocked-IPC preview of `HistoryItem` captured at 1280 px and 390 px in light and dark themes with no horizontal overflow. Not tested: the packaged app, or a real rename, delete, or tag action from the new menu. The next group is the following date block of open `adapt` rows.

Adapt wave 3 (2026-10-24, branch `port/upstream-adapt-wave-3`): `c8d9553` adapted in `3511969` (PR #8); `981c3b4`, `aea9114`, and `b329fa2` were already equivalent. Equivalence used the wave 2 method (every added upstream line of 12+ characters searched for in the fork's copy of the same file); the only absent lines were upstream changelog text and `981c3b4`'s `download-settings.ts` module, whose logic the fork keeps inline. Tested for PR #8: extension build loaded in headless Chromium with pixel comparison of the chevrons at 1x and 2x, and CI on the PR head. Not tested: Firefox. The next group is the 2026-07-01 date block.
