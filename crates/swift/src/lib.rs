use swift_rs::{swift, Bool, Int, Int16, SRArray, SRObject};

swift!(fn _prepare_audio_capture() -> Bool);
swift!(fn _start_audio_capture() -> Bool);
swift!(fn _stop_audio_capture() -> Bool);
swift!(fn _read_samples() -> SRObject<IntArray>);
swift!(fn _available_samples() -> Int);
swift!(fn _audio_format() -> Option<SRObject<AudioFormat>>);

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
        unsafe { _prepare_audio_capture() };
        Self {}
    }

    pub fn format(&self) -> Option<AudioFormat> {
        let format = unsafe { _audio_format() };
        match format {
            None => None,
            Some(format) => Some(AudioFormat {
                channels: format.channels,
                sample_rate: format.sample_rate,
                bits_per_sample: format.bits_per_sample,
            }),
        }
    }

    pub fn start(&self) -> bool {
        unsafe { _start_audio_capture() }
    }

    pub fn stop(&self) -> bool {
        unsafe { _stop_audio_capture() }
    }

    pub fn read_samples(&self) -> Vec<Int16> {
        let result = unsafe { _read_samples() };
        result.buffer()
    }

    pub fn available_samples(&self) -> Int {
        unsafe { _available_samples() }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serial_test::serial;

    fn play_for_sec(seconds: u64) -> std::thread::JoinHandle<()> {
        use rodio::{
            cpal::SampleRate,
            source::{Function::Sine, SignalGenerator, Source},
            OutputStream,
        };
        use std::{
            thread::{sleep, spawn},
            time::Duration,
        };

        spawn(move || {
            let (_stream, stream_handle) = OutputStream::try_default().unwrap();
            let source = SignalGenerator::new(SampleRate(44100), 440.0, Sine);

            let source = source
                .convert_samples()
                .take_duration(Duration::from_secs(seconds))
                .amplify(0.01);

            stream_handle.play_raw(source).unwrap();
            sleep(Duration::from_secs(seconds));
        })
    }

    #[test]
    #[serial]
    fn test_audio_format() {
        let audio_capture = AudioCapture::new();
        let format = audio_capture.format().unwrap();
        assert_eq!(format.channels, 1);
        assert_eq!(format.sample_rate, 48000);
        assert_eq!(format.bits_per_sample, 32);
    }

    #[test]
    #[serial]
    fn test_start_and_stop() {
        let audio_capture = AudioCapture::new();
        assert!(audio_capture.start());
        assert!(audio_capture.stop());
    }

    #[test]
    #[serial]
    fn test_read() {
        let audio_capture = AudioCapture::new();
        let len = audio_capture.available_samples();
        assert_eq!(len, 0);

        assert!(audio_capture.start());
        play_for_sec(1).join().unwrap();
        assert!(audio_capture.stop());

        let len = audio_capture.available_samples();
        assert_ne!(len, 0);
    }
}
