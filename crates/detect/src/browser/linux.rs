use crate::utils::BackgroundTask;

#[derive(Default)]
pub struct Detector {
    _task: BackgroundTask,
}

impl Detector {
    pub fn start(&mut self, _f: crate::DetectCallback) {
        // Linux browser detection not implemented yet
        todo!()
    }

    pub fn stop(&mut self) {
        // Nothing to stop
        todo!()
    }
}
