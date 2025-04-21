mod app;
mod browser;
mod utils;

use app::*;
use browser::*;
use utils::*;

pub type DetectCallback = std::sync::Arc<dyn Fn(String) + Send + Sync + 'static>;

trait Observer: Send + Sync {
    fn start(&mut self, f: DetectCallback);
    fn stop(&mut self);
}

#[derive(Default)]
pub struct Detector {
    app_detector: AppDetector,
    browser_detector: BrowserDetector,
}

impl Detector {
    #[cfg(target_os = "macos")]
    pub fn macos_check_accessibility_permission(&self) -> Result<bool, String> {
        let is_trusted = macos_accessibility_client::accessibility::application_is_trusted();
        Ok(is_trusted)
    }

    pub fn macos_request_accessibility_permission(&self) -> Result<(), String> {
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
        Ok(())
    }

    // Not sure why this not works.
    // TODO: remove `macos_accessibility_client`

    // #[cfg(target_os = "macos")]
    // // https://github.com/next-slide-please/macos-accessibility-client/blob/03025a9/src/lib.rs#L38
    // pub fn macos_request_accessibility_permission(&self) -> Result<(), String> {
    //     let keys = [&*objc2_core_foundation::CFString::from_static_str(
    //         "kAXTrustedCheckOptionPrompt",
    //     )];
    //     let values = [&*objc2_core_foundation::CFBoolean::new(true)];
    //     let options = objc2_core_foundation::CFDictionary::from_slices(&keys, &values);

    //     unsafe {
    //         objc2_application_services::AXIsProcessTrustedWithOptions(Some(options.as_opaque()))
    //     };

    //     Ok(())
    // }

    pub fn start(&mut self, f: DetectCallback) {
        self.app_detector.start(f.clone());
        self.browser_detector.start(f);
    }

    pub fn stop(&mut self) {
        self.app_detector.stop();
        self.browser_detector.stop();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[ignore]
    #[test]
    fn test_macos_check_accessibility_permission() {
        let detector = Detector::default();
        let is_trusted = detector.macos_check_accessibility_permission();
        assert!(is_trusted.is_ok());
    }

    #[ignore]
    #[test]
    fn test_macos_request_accessibility_permission() {
        macos_accessibility_client::accessibility::application_is_trusted_with_prompt();
    }
}
