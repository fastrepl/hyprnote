use std::{io, path::Path};

use anlg_audio_utils::Source;
use anlg_vad::earshot::{FRAME_10MS, VoiceActivityDetector};

pub fn has_speech(path: &Path) -> io::Result<bool> {
    let source = anlg_audio_utils::source_from_path(path).map_err(io::Error::other)?;
    source_has_speech(source)
}

fn source_has_speech(source: impl Source) -> io::Result<bool> {
    let channels = source.channels();
    let sample_rate = source.sample_rate();
    let expected_frames = source
        .total_duration()
        .filter(|duration| !duration.is_zero())
        .ok_or_else(|| io::Error::other("audio_duration_unknown"))?
        .as_secs_f64()
        * 16_000.0;
    let mut source = rodio::conversions::SampleRateConverter::new(
        source,
        sample_rate,
        std::num::NonZeroU32::new(16_000).unwrap(),
        channels,
    );
    let mut detectors = (0..channels.get())
        .map(|_| VoiceActivityDetector::new())
        .collect::<Vec<_>>();
    let mut frames = vec![[0_i16; FRAME_10MS]; usize::from(channels.get())];
    let mut read_frames = 0;
    loop {
        let mut samples = 0;
        for index in 0..FRAME_10MS {
            for frame in &mut frames {
                let Some(sample) = source.next() else {
                    // A truncated or undecodable recording is not proof of silence.
                    if (read_frames + samples) as f64 + 160.0 < expected_frames {
                        return Err(io::Error::other("audio_decode_incomplete"));
                    }
                    for (detector, frame) in detectors.iter_mut().zip(&mut frames) {
                        frame[index..].fill(0);
                        if detector.predict_16khz(frame).map_err(io::Error::other)? {
                            return Ok(true);
                        }
                    }
                    return Ok(false);
                };
                if !sample.is_finite() {
                    return Err(io::Error::other("audio_sample_invalid"));
                }
                frame[index] = (sample * 32768.0).clamp(-32768.0, 32767.0) as i16;
            }
            samples += 1;
        }
        read_frames += samples;
        // Inspect channels separately: downmixing could cancel opposite-phase speech.
        for (detector, frame) in detectors.iter_mut().zip(&frames) {
            if detector.predict_16khz(frame).map_err(io::Error::other)? {
                return Ok(true);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn speech_is_kept_in_wav_and_compressed_audio() {
        for path in [
            anlg_data::english_1::AUDIO_PATH,
            anlg_data::english_1::AUDIO_MP3_PATH,
        ] {
            assert!(has_speech(Path::new(path)).unwrap());
        }
    }

    #[test]
    fn opposite_phase_channels_do_not_cancel_speech() {
        let samples: Vec<f32> =
            anlg_audio_utils::source_from_path(anlg_data::english_1::AUDIO_PATH)
                .unwrap()
                .take(160_000)
                .collect();
        for right_only in [true, false] {
            let stereo = samples
                .iter()
                .flat_map(|sample| [if right_only { 0.0 } else { -*sample }, *sample])
                .collect::<Vec<_>>();
            let source = rodio::buffer::SamplesBuffer::new(
                std::num::NonZeroU16::new(2).unwrap(),
                std::num::NonZeroU32::new(16_000).unwrap(),
                stereo,
            );
            assert!(source_has_speech(source).unwrap());
        }
    }

    #[test]
    fn silence_in_both_channels_is_empty() {
        let source = rodio::buffer::SamplesBuffer::new(
            std::num::NonZeroU16::new(2).unwrap(),
            std::num::NonZeroU32::new(48_000).unwrap(),
            vec![0.0; 96_000],
        );
        assert!(!source_has_speech(source).unwrap());
    }

    #[test]
    fn invalid_and_missing_audio_are_not_classified_as_empty() {
        assert!(has_speech(Path::new("/nonexistent/automatic-capture.wav")).is_err());
        let source = rodio::buffer::SamplesBuffer::new(
            std::num::NonZeroU16::new(1).unwrap(),
            std::num::NonZeroU32::new(16_000).unwrap(),
            vec![f32::NAN; 160],
        );
        assert!(source_has_speech(source).is_err());
    }
}
