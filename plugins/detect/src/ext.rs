use std::future::Future;

pub trait DetectPluginExt<R: tauri::Runtime> {
    fn start_detection(&self) -> impl Future<Output = ()>;
    fn stop_detection(&self) -> impl Future<Output = ()>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> DetectPluginExt<R> for T {
    #[tracing::instrument(skip_all)]
    async fn start_detection(&self) {}

    #[tracing::instrument(skip_all)]
    async fn stop_detection(&self) {}
}
