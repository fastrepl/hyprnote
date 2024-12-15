use swift_rs::{swift, Bool, Int16, SRArray, SRObject};

swift!(fn _prepare_audio_capture() -> Bool);
swift!(fn _start_audio_capture() -> Bool);
swift!(fn _stop_audio_capture() -> Bool);
swift!(fn _read_audio_capture() -> SRObject<IntArray>);

#[repr(C)]
pub struct IntArray {
    data: SRArray<Int16>,
}

impl IntArray {
    pub fn buffer(&self) -> Vec<Int16> {
        self.data.as_slice().to_vec()
    }
}

pub struct AudioCapture {}

impl AudioCapture {
    pub fn new() -> Self {
        unsafe { _prepare_audio_capture() };
        Self {}
    }

    pub fn start(&self) -> bool {
        unsafe { _start_audio_capture() }
    }

    pub fn stop(&self) -> bool {
        unsafe { _stop_audio_capture() }
    }

    pub fn read(&self) -> Vec<Int16> {
        let result = unsafe { _read_audio_capture() };
        result.buffer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_start_audio_capture() {
        let audio_capture = AudioCapture::new();
        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![]);
        assert!(audio_capture.start());
        std::thread::sleep(std::time::Duration::from_secs(1));
        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![0, 0, 0, 0]);
        assert!(audio_capture.stop());
    }
}
