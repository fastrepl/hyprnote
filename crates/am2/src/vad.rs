use std::sync::OnceLock;

use crate::ffi::{am2_vad_detect, am2_vad_index_to_seconds, am2_vad_init};

static VAD_INITIALIZED: OnceLock<bool> = OnceLock::new();

pub fn init() -> bool {
    *VAD_INITIALIZED.get_or_init(|| unsafe { am2_vad_init() })
}

pub fn is_ready() -> bool {
    VAD_INITIALIZED.get().copied().unwrap_or(false)
}

pub fn detect(samples: &[f32]) -> Vec<bool> {
    let result = unsafe { am2_vad_detect(samples.as_ptr(), samples.len() as i64) };
    result.data.as_slice().to_vec()
}

pub fn index_to_seconds(index: usize) -> f32 {
    unsafe { am2_vad_index_to_seconds(index as i64) }
}

#[derive(Debug, Clone)]
pub struct VoiceSegment {
    pub start_seconds: f32,
    pub end_seconds: f32,
}

pub fn detect_segments(samples: &[f32]) -> Vec<VoiceSegment> {
    let voice_activity = detect(samples);
    let mut segments = Vec::new();
    let mut in_voice = false;
    let mut segment_start = 0.0;

    for (i, &is_voice) in voice_activity.iter().enumerate() {
        if is_voice && !in_voice {
            segment_start = index_to_seconds(i);
            in_voice = true;
        } else if !is_voice && in_voice {
            segments.push(VoiceSegment {
                start_seconds: segment_start,
                end_seconds: index_to_seconds(i),
            });
            in_voice = false;
        }
    }

    if in_voice {
        segments.push(VoiceSegment {
            start_seconds: segment_start,
            end_seconds: index_to_seconds(voice_activity.len()),
        });
    }

    segments
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vad_init() {
        crate::init();
        assert!(init());
        assert!(is_ready());
    }
}
