use std::future::Future;
use tauri_specta::Event;

pub trait DetectPluginExt<R: tauri::Runtime> {
    fn start_detection(&self) -> impl Future<Output = ()>;
    fn stop_detection(&self) -> impl Future<Output = ()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DetectPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn start_detection(&self) {}

    #[tracing::instrument(skip_all)]
    async fn stop_detection(&self) {}

    // #[tracing::instrument(skip_all)]
    // async fn list_installed_apps(&self) -> Vec<hypr_detect::InstalledApp> {
    //     hypr_detect::list_installed_apps()
    // }

    // #[tracing::instrument(skip_all)]
    // async fn list_mic_using_apps(&self) -> Vec<String> {
    //     hypr_detect::list_mic_using_apps()
    // }
}
