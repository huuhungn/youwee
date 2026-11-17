mod ai;
mod browser_cookies;
mod deno;
mod facebook;
mod ffmpeg;
mod gallerydl;
mod plugin;
pub mod polling;
pub mod telegram;
mod whisper;
mod xiaohongshu;
mod youtube_search;
mod ytdlp;
mod ytdlp_args;

use crate::types::DependencySource;
use std::path::PathBuf;
use tauri::AppHandle;
#[cfg(windows)]
use tauri::Manager;

pub(super) fn get_packaged_dependency_path(app: &AppHandle, binary_name: &str) -> Option<PathBuf> {
    #[cfg(windows)]
    {
        let binary_path = app
            .path()
            .resource_dir()
            .ok()?
            .join("dependencies")
            .join(binary_name);
        binary_path.is_file().then_some(binary_path)
    }

    #[cfg(not(windows))]
    {
        let _ = (app, binary_name);
        None
    }
}

pub(super) fn select_preferred_dependency_path(
    app_managed: Option<PathBuf>,
    packaged: Option<PathBuf>,
    system: Option<PathBuf>,
) -> Option<PathBuf> {
    app_managed.or(packaged).or(system)
}

pub(super) fn select_dependency_path_for_source(
    source: &DependencySource,
    app_managed: Option<PathBuf>,
    packaged: Option<PathBuf>,
    system: Option<PathBuf>,
) -> Option<PathBuf> {
    match source {
        DependencySource::System => system,
        DependencySource::App => app_managed.or(packaged),
        DependencySource::Auto => select_preferred_dependency_path(app_managed, packaged, system),
    }
}

/// Percent to report for a streamed dependency download, or `None` until it has
/// moved at least 5% (or reached 100%) since `last_percent`, so progress events
/// stay sparse. Unknown sizes (`total == 0`) report nothing.
pub(crate) fn dependency_download_percent(
    downloaded: u64,
    total: u64,
    last_percent: u8,
) -> Option<u8> {
    if total == 0 {
        return None;
    }
    let percent = ((downloaded as f64 / total as f64) * 100.0).min(100.0) as u8;
    (percent >= last_percent.saturating_add(5) || (percent == 100 && last_percent != 100))
        .then_some(percent)
}

pub use ai::*;
pub(crate) use browser_cookies::*;
pub use deno::*;
pub use facebook::*;
pub use ffmpeg::*;
pub use gallerydl::*;
pub use plugin::*;
pub use whisper::*;
pub use xiaohongshu::*;
pub use youtube_search::*;
pub use ytdlp::*;
pub use ytdlp_args::*;

#[cfg(test)]
mod tests {
    use super::{
        dependency_download_percent, select_dependency_path_for_source,
        select_preferred_dependency_path,
    };
    use crate::types::DependencySource;
    use std::path::PathBuf;

    fn path(name: &str) -> Option<PathBuf> {
        Some(PathBuf::from(name))
    }

    #[test]
    fn preferred_dependency_path_uses_app_then_packaged_then_system() {
        assert_eq!(
            select_preferred_dependency_path(path("app"), path("packaged"), path("system")),
            path("app")
        );
        assert_eq!(
            select_preferred_dependency_path(None, path("packaged"), path("system")),
            path("packaged")
        );
        assert_eq!(
            select_preferred_dependency_path(None, None, path("system")),
            path("system")
        );
    }

    #[test]
    fn app_source_keeps_packaged_binary_as_offline_fallback() {
        assert_eq!(
            select_dependency_path_for_source(
                &DependencySource::App,
                None,
                path("packaged"),
                path("system"),
            ),
            path("packaged")
        );
    }

    #[test]
    fn system_source_never_falls_back_to_app_or_packaged_binary() {
        assert_eq!(
            select_dependency_path_for_source(
                &DependencySource::System,
                path("app"),
                path("packaged"),
                None,
            ),
            None
        );
    }

    #[test]
    fn download_percent_reports_in_five_percent_steps() {
        assert_eq!(dependency_download_percent(4, 100, 0), None);
        assert_eq!(dependency_download_percent(5, 100, 0), Some(5));
        assert_eq!(dependency_download_percent(9, 100, 5), None);
        assert_eq!(dependency_download_percent(37, 100, 5), Some(37));
    }

    #[test]
    fn download_percent_reports_completion_once() {
        assert_eq!(dependency_download_percent(100, 100, 98), Some(100));
        assert_eq!(dependency_download_percent(100, 100, 100), None);
        // A server that sends more than Content-Length still caps at 100%.
        assert_eq!(dependency_download_percent(150, 100, 98), Some(100));
    }

    #[test]
    fn download_percent_stays_silent_for_unknown_size() {
        assert_eq!(dependency_download_percent(1_000_000, 0, 0), None);
    }
}
