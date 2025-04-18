#[cfg(target_os = "macos")]
mod macos;

trait Observer: Send + Sync {
    fn start(&mut self, f: Box<dyn Fn(String) + Send + Sync + 'static>);
    fn stop(&mut self);
}

pub struct Detector {
    observer: Box<dyn Observer>,
}

pub type DetectCallback = Box<dyn Fn(String) + Send + Sync + 'static>;

impl Default for Detector {
    fn default() -> Self {
        let observer = {
            #[cfg(target_os = "macos")]
            {
                Box::new(macos::Detector::default())
            }
            #[cfg(not(target_os = "macos"))]
            {
                panic!("Unsupported platform");
            }
        };

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
