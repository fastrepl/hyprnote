use swift_rs::{swift, Bool, Int, Int16, SRArray, SRObject};

swift!(fn _prepare_audio_capture() -> Bool);
swift!(fn _start_audio_capture() -> Bool);
swift!(fn _stop_audio_capture() -> Bool);
swift!(fn _read_audio_capture() -> SRObject<IntArray>);
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
    fn test_audio_format() {
        let audio_capture = AudioCapture::new();
        let format = audio_capture.format().unwrap();
        assert_eq!(format.channels, 1);
        assert_eq!(format.sample_rate, 48000);
        assert_eq!(format.bits_per_sample, 32);
    }

    #[test]
    fn test_create_and_start_audio_capture() {
        let audio_capture = AudioCapture::new();

        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![]);

        assert!(audio_capture.start());
        sleep(Duration::from_secs(4));

        let numbers = audio_capture.read();
        assert_eq!(numbers, vec![2048, 2048, 2048, 2048]);
        assert!(audio_capture.stop());
    }
}
