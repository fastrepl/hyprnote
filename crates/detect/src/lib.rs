mod app;
mod list;
mod mic;
mod utils;

pub use app::*;
pub use list::*;
pub use mic::*;

use utils::*;

#[derive(Debug, Clone)]
pub enum DetectEvent {
    MicStarted(Vec<InstalledApp>),
    MicStopped,
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
}

impl Detector {
    #[cfg(target_os = "macos")]
    pub fn macos_check_accessibility_permission(&self) -> Result<bool, String> {
        let is_trusted = macos_accessibility_client::accessibility::application_is_trusted();
        Ok(is_trusted)
    }

    #[cfg(target_os = "macos")]
    pub fn macos_request_accessibility_permission(&self) -> Result<(), String> {
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        Ok(())
    }

    pub fn start(&mut self, f: DetectCallback) {
        self.mic_detector.start(f);
    }

    pub fn stop(&mut self) {
        self.mic_detector.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    #[cfg(target_os = "macos")]
    fn test_macos_check_accessibility_permission() {
        let detector = Detector::default();
        let is_trusted = detector.macos_check_accessibility_permission();
        assert!(is_trusted.is_ok());
    }

    #[test]
    #[ignore]
    #[cfg(target_os = "macos")]
    fn test_macos_request_accessibility_permission() {
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
    }
}
