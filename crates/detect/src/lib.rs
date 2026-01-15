#[cfg(feature = "app")]
mod app;
#[cfg(all(target_os = "macos", feature = "language"))]
mod language;
#[cfg(feature = "list")]
mod list;
#[cfg(feature = "mic")]
mod mic;

mod utils;

pub use utils::BackgroundTask;

#[cfg(all(
    target_os = "macos",
    feature = "zoom",
    feature = "mic",
    feature = "list"
))]
mod zoom;

#[cfg(all(feature = "google-meet", feature = "mic"))]
mod google_meet;

#[cfg(feature = "app")]
pub use app::*;
#[cfg(all(target_os = "macos", feature = "language"))]
pub use language::*;
#[cfg(feature = "list")]
pub use list::*;
#[cfg(feature = "mic")]
pub use mic::*;

#[cfg(all(
    target_os = "macos",
    feature = "zoom",
    feature = "mic",
    feature = "list"
))]
pub use zoom::*;

#[cfg(all(feature = "google-meet", feature = "mic"))]
pub use google_meet::*;

#[cfg(feature = "mic")]
#[derive(Debug, Clone)]
pub enum DetectEvent {
    MicStarted(Vec<InstalledApp>),
    MicStopped(Vec<InstalledApp>),
    #[cfg(all(target_os = "macos", feature = "zoom"))]
    ZoomMuteStateChanged {
        value: bool,
    },
    #[cfg(feature = "google-meet")]
    GoogleMeetMuteStateChanged {
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
pub(crate) trait Observer: Send + Sync {
    fn start(&mut self, f: DetectCallback);
    fn stop(&mut self);
}

#[cfg(feature = "mic")]
#[derive(Default)]
pub struct Detector {
    mic_detector: MicDetector,
    #[cfg(all(target_os = "macos", feature = "zoom", feature = "list"))]
    zoom_watcher: ZoomMuteWatcher,
    #[cfg(feature = "google-meet")]
    google_meet_watcher: GoogleMeetMuteWatcher,
}

#[cfg(feature = "mic")]
impl Detector {
    pub fn start(&mut self, f: DetectCallback) {
        self.mic_detector.start(f.clone());

        #[cfg(all(target_os = "macos", feature = "zoom", feature = "list"))]
        self.zoom_watcher.start(f.clone());

        #[cfg(feature = "google-meet")]
        self.google_meet_watcher.start(f);
    }

    pub fn stop(&mut self) {
        self.mic_detector.stop();

        #[cfg(all(target_os = "macos", feature = "zoom", feature = "list"))]
        self.zoom_watcher.stop();

        #[cfg(feature = "google-meet")]
        self.google_meet_watcher.stop();
    }
}
