use std::sync::OnceLock;

use crate::ffi::{am2_diarization_deinit, am2_diarization_init, am2_diarization_process};

static DIARIZATION_INITIALIZED: OnceLock<bool> = OnceLock::new();

#[derive(Debug, Clone)]
pub struct DiarizationSegment {
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub speaker: i32,
}

pub fn init() -> bool {
    *DIARIZATION_INITIALIZED.get_or_init(|| unsafe { am2_diarization_init() })
}

pub fn is_ready() -> bool {
    DIARIZATION_INITIALIZED.get().copied().unwrap_or(false)
}

pub fn process(samples: &[f32], num_speakers: Option<i32>) -> Vec<DiarizationSegment> {
    let num_speakers = num_speakers.unwrap_or(0);
    let result =
        unsafe { am2_diarization_process(samples.as_ptr(), samples.len() as i64, num_speakers) };

    let count = result.count as usize;
    let starts = result.starts.as_slice();
    let ends = result.ends.as_slice();
    let speakers = result.speakers.as_slice();

    (0..count)
        .map(|i| DiarizationSegment {
            start_seconds: starts[i],
            end_seconds: ends[i],
            speaker: speakers[i],
        })
        .collect()
}

pub fn deinit() {
    unsafe { am2_diarization_deinit() }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bytes_to_f32_samples(bytes: &[u8]) -> Vec<f32> {
        bytes
            .chunks_exact(2)
            .map(|chunk| {
                let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
                sample as f32 / 32768.0
            })
            .collect()
    }

    #[test]
    fn test_diarization_init() {
        crate::init();
        assert!(init());
        assert!(is_ready());
    }

    #[test]
    #[ignore]
    fn test_diarization_process_with_auto_speakers() {
        crate::init();
        init();

        let audio_bytes = hypr_data::english_1::AUDIO;
        let samples = bytes_to_f32_samples(audio_bytes);

        let segments = process(&samples, None);

        assert!(!segments.is_empty());

        for segment in &segments {
            println!(
                "Speaker {}: {:.2}s - {:.2}s",
                segment.speaker, segment.start_seconds, segment.end_seconds
            );
        }
    }

    #[test]
    #[ignore]
    fn test_diarization_process_with_num_speakers() {
        crate::init();
        init();

        let audio_bytes = hypr_data::english_1::AUDIO;
        let samples = bytes_to_f32_samples(audio_bytes);

        let segments = process(&samples, Some(2));

        assert!(!segments.is_empty());

        let speakers: std::collections::HashSet<i32> = segments.iter().map(|s| s.speaker).collect();
        println!("Found {} unique speakers", speakers.len());

        for segment in &segments {
            println!(
                "Speaker {}: {:.2}s - {:.2}s",
                segment.speaker, segment.start_seconds, segment.end_seconds
            );
        }
    }
}
