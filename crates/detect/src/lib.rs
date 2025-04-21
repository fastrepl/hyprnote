#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
type PlatformDetector = macos::Detector;

#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "windows")]
type PlatformDetector = windows::Detector;

trait Observer: Send + Sync {
    fn start(&mut self, f: Box<dyn Fn(String) + Send + Sync + 'static>);
    fn stop(&mut self);
}

pub struct Detector {
    observer: PlatformDetector,
}

pub type DetectCallback = Box<dyn Fn(String) + Send + Sync + 'static>;

impl Default for Detector {
    fn default() -> Self {
        let observer = PlatformDetector::default();
        Self { observer }
    }
}

impl Detector {
    pub fn start(&mut self, f: DetectCallback) {
        self.observer.start(f);
    }

    pub fn stop(&mut self) {
        self.observer.stop();
    }
}
