use swift_rs::{swift, Int, SRArray, SRObject, SRString};

swift!(fn _prepare_audio_capture());
swift!(fn _get_default_audio_input_device_uid() -> SRString);
#[repr(C)]
pub struct IntArray {
    data: SRArray<Int>,
}

impl IntArray {
    pub fn buffer(&self) -> Vec<Int> {
        self.data.as_slice().to_vec()
    }
}

// pub struct AudioCapture {}

// impl AudioCapture {
//     pub fn new() -> Self {
//         unsafe { _prepare_audio_capture() };
//         Self {}
//     }
// }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_audio_capture() {
        unsafe { _prepare_audio_capture() };
    }

    #[test]
    fn test_get_default_audio_input_device_uid() {
        let uid = unsafe { _get_default_audio_input_device_uid() };
        println!("Device UID: {:?}", uid.to_string());
    }
}
