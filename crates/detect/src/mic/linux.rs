use crate::utils::BackgroundTask;

#[derive(Default)]
pub struct Detector {
    _task: BackgroundTask,
}

impl Detector {
    pub fn start(&mut self, _f: crate::DetectCallback) {
        // Linux microphone detection not implemented yet
        // TODO: Implement using PulseAudio or ALSA APIs
        todo!()
    }

    pub fn stop(&mut self) {
        // Nothing to stop
        todo!()
    }
}
