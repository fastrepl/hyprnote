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
    use rodio::{
        cpal::SampleRate,
        source::{Function::Sine, SignalGenerator, Source},
        OutputStream,
    };
    use std::{
        thread::{sleep, spawn, JoinHandle},
        time::Duration,
    };

    fn play_for_sec(seconds: u64) -> JoinHandle<()> {
        spawn(move || {
            let (_stream, stream_handle) = OutputStream::try_default().unwrap();
            let source = SignalGenerator::new(SampleRate(44100), 440.0, Sine);

            let source = source
                .convert_samples()
                .take_duration(Duration::from_secs(seconds))
                .amplify(0.1);

            stream_handle.play_raw(source).unwrap();
            sleep(Duration::from_secs(seconds));
        })
    }

    #[test]
    fn test_create_and_start_audio_capture() {
        // let play_thread = play_for_sec(2);
        let audio_capture = AudioCapture::new();

        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![]);
        assert!(audio_capture.start());

        // play_thread.join().unwrap();

        sleep(Duration::from_secs(2));

        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![2048, 2048, 2048, 2048]);
        assert!(audio_capture.stop());
    }
}
