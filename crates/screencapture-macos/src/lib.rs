use swift_rs::{swift, Bool, Int, Int16, SRArray, SRObject};

swift!(fn _start_audio_capture() -> Bool);
swift!(fn _stop_audio_capture() -> Bool);

#[repr(C)]
#[derive(Debug)]
pub struct AudioFormat {
    channels: Int,
    sample_rate: Int,
    bits_per_sample: Int,
}

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
        Self {}
    }

    pub fn start(&self) -> bool {
        unsafe { _start_audio_capture() }
    }

    pub fn stop(&self) -> bool {
        unsafe { _stop_audio_capture() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_start_and_stop() {
        let audio_capture = AudioCapture::new();
    }
}
