#[derive(Default)]
pub struct Detector {}

impl crate::Observer for Detector {
    fn start(&mut self, f: crate::DetectCallback) {}
    fn stop(&mut self) {}
}
