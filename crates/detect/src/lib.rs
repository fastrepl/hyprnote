mod app;
mod browser;

use app::*;
use browser::*;

pub type DetectCallback = std::sync::Arc<dyn Fn(String) + Send + Sync + 'static>;

trait Observer: Send + Sync {
    fn start(&mut self, f: DetectCallback);
    fn stop(&mut self);
}

pub struct Detector {
    app_detector: AppDetector,
    browser_detector: BrowserDetector,
}

impl Detector {
    pub fn start(&mut self, f: DetectCallback) {
        self.app_detector.start(f.clone());
        self.browser_detector.start(f);
    }

    pub fn stop(&mut self) {
        self.app_detector.stop();
        self.browser_detector.stop();
    }
}
