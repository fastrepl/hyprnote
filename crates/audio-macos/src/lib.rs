use swift_rs::{swift, Bool, Int, Int16, SRArray, SRObject};

swift!(fn _start_audio_capture() -> Bool);
swift!(fn _stop_audio_capture() -> Bool);
swift!(fn _read_samples(max: Int) -> SRObject<IntArray>);
swift!(fn _available_samples() -> Int);
swift!(fn _audio_format() -> Option<SRObject<AudioFormat>>);
swift!(fn _count_taps() -> Int);

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

    pub fn count_taps(&self) -> Int {
        unsafe { _count_taps() }
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

    pub fn read_samples(&self, max: Int) -> Vec<Int16> {
        let result = unsafe { _read_samples(max) };
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
                .amplify(0.002);

            stream_handle.play_raw(source).unwrap();
            sleep(Duration::from_secs(seconds));
        })
    }

    #[test]
    #[serial]
    fn test_audio_format() {
        let audio_capture = AudioCapture::new();

        assert!(audio_capture.start());
        let format = audio_capture.format().unwrap();

        assert_eq!(format.channels, 1);
        assert!(format.sample_rate > 1000);
        assert!(format.bits_per_sample > 8);

        assert!(audio_capture.stop());
    }

    #[test]
    #[serial]
    fn test_start_and_stop() {
        let audio_capture = AudioCapture::new();
        assert!(audio_capture.start());
        assert_eq!(audio_capture.count_taps(), 1);
        assert!(audio_capture.stop());
        assert_eq!(audio_capture.count_taps(), 0);
    }

    #[test]
    #[serial]
    fn test_read() {
        let audio_capture = AudioCapture::new();
        let samples_1 = audio_capture.available_samples();
        assert_eq!(samples_1, 0);

        assert!(audio_capture.start());
        play_for_sec(1).join().unwrap();

        let samples_2 = audio_capture.available_samples();
        assert!(samples_2 > samples_1 + 1000);

        let samples = audio_capture.read_samples(16000 * 2);
        assert!(samples.len() >= 16000 * 1);
        assert!(samples.len() < 16000 * 2);
        assert_eq!(samples.iter().sum::<Int16>(), 0);

        assert!(audio_capture.stop());
        let samples = audio_capture.read_samples(4);
        assert_eq!(samples, vec![]);
    }
}
