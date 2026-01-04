#[cfg(feature = "app")]
mod app;
mod list;
#[cfg(feature = "locale")]
mod locale;
#[cfg(feature = "mic")]
mod mic;
mod utils;

#[cfg(all(target_os = "macos", feature = "zoom"))]
mod zoom;

#[cfg(feature = "app")]
pub use app::*;
pub use list::*;
#[cfg(feature = "locale")]
pub use locale::*;
#[cfg(feature = "mic")]
pub use mic::*;

#[cfg(all(target_os = "macos", feature = "zoom"))]
pub use zoom::*;

use utils::*;

#[cfg(feature = "mic")]
#[derive(Debug, Clone)]
pub enum DetectEvent {
    MicStarted(Vec<InstalledApp>),
    MicStopped(Vec<InstalledApp>),
    #[cfg(all(target_os = "macos", feature = "zoom"))]
    ZoomMuteStateChanged {
        value: bool,
    },
}

#[cfg(feature = "mic")]
pub type DetectCallback = std::sync::Arc<dyn Fn(DetectEvent) + Send + Sync + 'static>;

#[cfg(feature = "mic")]
pub fn new_callback<F>(f: F) -> DetectCallback
where
    F: Fn(DetectEvent) + Send + Sync + 'static,
{
    std::sync::Arc::new(f)
}

#[cfg(feature = "mic")]
trait Observer: Send + Sync {
    fn start(&mut self, f: DetectCallback);
    fn stop(&mut self);
}

#[cfg(feature = "mic")]
#[derive(Default)]
pub struct Detector {
    mic_detector: MicDetector,
    #[cfg(all(target_os = "macos", feature = "zoom"))]
    zoom_watcher: ZoomMuteWatcher,
}

#[cfg(feature = "mic")]
impl Detector {
    pub fn start(&mut self, f: DetectCallback) {
        self.mic_detector.start(f.clone());

        #[cfg(all(target_os = "macos", feature = "zoom"))]
        self.zoom_watcher.start(f);
    }

    pub fn stop(&mut self) {
        self.mic_detector.stop();

        #[cfg(all(target_os = "macos", feature = "zoom"))]
        self.zoom_watcher.stop();
    }
}
