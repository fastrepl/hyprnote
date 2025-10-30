mod app;
mod list;
mod mic;
mod utils;

#[cfg(target_os = "macos")]
mod zoom;

pub use app::*;
pub use list::*;
pub use mic::*;

#[cfg(target_os = "macos")]
pub use zoom::*;

use utils::*;

#[derive(Debug, Clone)]
pub enum DetectEvent {
    MicStarted(Vec<InstalledApp>),
    MicStopped,
    #[cfg(target_os = "macos")]
    ZoomMuteStateChanged {
        value: bool,
    },
}

pub type DetectCallback = std::sync::Arc<dyn Fn(DetectEvent) + Send + Sync + 'static>;

pub fn new_callback<F>(f: F) -> DetectCallback
where
    F: Fn(DetectEvent) + Send + Sync + 'static,
{
    std::sync::Arc::new(f)
}

trait Observer: Send + Sync {
    fn start(&mut self, f: DetectCallback);
    fn stop(&mut self);
}

#[derive(Default)]
pub struct Detector {
    mic_detector: MicDetector,
    #[cfg(target_os = "macos")]
    zoom_watcher: ZoomMuteWatcher,
}

impl Detector {
    pub fn start(&mut self, f: DetectCallback) {
        self.mic_detector.start(f.clone());

        #[cfg(target_os = "macos")]
        self.zoom_watcher.start(f);
    }

    pub fn stop(&mut self) {
        self.mic_detector.stop();

        #[cfg(target_os = "macos")]
        self.zoom_watcher.stop();
    }
}
