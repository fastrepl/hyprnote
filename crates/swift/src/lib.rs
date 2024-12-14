use swift_rs::{swift, Int16, SRArray, SRObject};

swift!(fn _prepare_audio_capture());
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

    pub fn read(&self) -> Vec<Int16> {
        let result = unsafe { _read_audio_capture() };
        result.buffer()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_audio_capture() {
        AudioCapture::new();
    }

    #[test]
    fn test_read_audio_capture() {
        let audio_capture = AudioCapture::new();
        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![1, 2, 3, 4]);
    }
}
