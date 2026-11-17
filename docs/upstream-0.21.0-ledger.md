# Upstream 0.21.0 port ledger

Selected upstream (`vanloctech/youwee`, MIT) commits ported into the fork one by one. Each row records how the commit was applied; conflicts were resolved against the fork's reshaped files (`ModalShell` dialogs, split locale layout, `handle_tokio_download`) instead of replaying the patch as is.

- Fork base: `a4c24f8` (`0.20.1-custom.14`, `origin/main`)
- Source: upstream `v0.21.0`

| SHA | Subject | Disposition | Notes |
| --- | --- | --- | --- |
| `df8ac79` | fix: report YouTube bot check separately from sign-in errors | ported | `YT_BOT_CHECK` code, Rust and TypeScript detection, 13 locales, two Rust tests. |
| `9b63b1a` | fix: explain age-verification quality limit for YouTube downloads | ported | Notice logged once per download from both stdout and stderr readers; the fork's stdout loop has no `parse_ytdlp_output_filepath` call, so the log call sits right after `push_recent_output_shared`. |
| `610d73c` | fix: show the real cause when browser cookies can't be read | ported | `YT_COOKIE_ACCESS_DENIED` / `YT_COOKIE_PROFILE_NOT_FOUND`, `classify_missing_cookie_db`, `cookie-errors.ts`; `BrowserCookieErrorDialog` keeps the fork's `ModalShell` and gets the translated blocked / missing-profile / locked variants. Locale keys were merged by key, not by line. |
