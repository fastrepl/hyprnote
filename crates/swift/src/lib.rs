use swift_rs::{swift, Int, SRArray, SRObject, SRString};

swift!(fn _create_audio_capture());
swift!(fn _read_audio_capture() -> SRObject<IntArray>);
swift!(fn _write_audio_capture(data: SRObject<IntArray>));

#[repr(C)]
pub struct IntArray {
    data: SRArray<Int>,
}

impl IntArray {
    pub fn buffer(&self) -> Vec<Int> {
        self.data.as_slice().to_vec()
    }
}

pub struct AudioCapture {}

impl AudioCapture {
    pub fn new() -> Self {
        unsafe { _create_audio_capture() };
        Self {}
    }

    pub fn read(&self) -> SRObject<IntArray> {
        let data = unsafe { _read_audio_capture() };
        data
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_audio_capture() {
        let _ = AudioCapture::new();
    }
}
