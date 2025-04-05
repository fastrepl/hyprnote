// https://github.com/floneum/floneum/blob/52967ae/interfaces/kalosm-sound/src/transform/voice_audio_detector.rs

use kalosm_sound::{AsyncSource, ResampledAsyncSource};

pub struct VoiceActivityDetectorStream<S: AsyncSource + Unpin> {
    source: ResampledAsyncSource<S>,
    buffer: Vec<f32>,
    chunk_size: usize,
}
