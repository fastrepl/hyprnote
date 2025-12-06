use std::{
    pin::Pin,
    task::{Context, Poll},
};

use futures_util::Stream;
use hypr_audio_utils::f32_to_i16_samples;
use hypr_vvad::VoiceActivityDetector;

pub struct ContinuousVadMaskStream<S> {
    inner: S,
    vad: VoiceActivityDetector,
    hangover_frames: usize,
    trailing_non_speech: usize,
    in_speech: bool,
    scratch_frame: Vec<f32>,
    amplitude_floor: f32,
}

impl<S> ContinuousVadMaskStream<S> {
    pub fn new(inner: S) -> Self {
        Self {
            inner,
            vad: VoiceActivityDetector::new(),
            hangover_frames: 3,
            trailing_non_speech: 0,
            in_speech: true,
            scratch_frame: Vec::new(),
            amplitude_floor: 0.001,
        }
    }

    pub fn with_hangover_frames(mut self, frames: usize) -> Self {
        self.hangover_frames = frames;
        self
    }

    fn process_chunk(&mut self, chunk: &mut [f32]) {
        if chunk.is_empty() {
            return;
        }

        let frame_size = hypr_vad3::choose_optimal_frame_size(chunk.len());
        debug_assert!(frame_size > 0, "VAD frame size must be > 0");

        for frame in chunk.chunks_mut(frame_size) {
            self.process_frame(frame, frame_size);
        }
    }

    fn smooth_vad_decision(&mut self, raw_is_speech: bool) -> bool {
        if raw_is_speech {
            self.in_speech = true;
            self.trailing_non_speech = 0;
            true
        } else if self.in_speech && self.trailing_non_speech < self.hangover_frames {
            self.trailing_non_speech += 1;
            true
        } else {
            self.in_speech = false;
            self.trailing_non_speech = 0;
            false
        }
    }

    fn process_frame(&mut self, frame: &mut [f32], frame_size: usize) {
        if frame.is_empty() {
            return;
        }

        let rms = Self::calculate_rms(frame);
        if rms < self.amplitude_floor {
            let is_speech = self.smooth_vad_decision(false);
            if !is_speech {
                frame.fill(0.0);
            }
            return;
        }

        let raw_is_speech = if frame.len() == frame_size {
            let i16_samples = f32_to_i16_samples(frame);
            self.vad.predict_16khz(&i16_samples).unwrap_or(true)
        } else {
            self.scratch_frame.clear();
            self.scratch_frame.extend_from_slice(frame);
            self.scratch_frame.resize(frame_size, 0.0);

            let i16_samples = f32_to_i16_samples(&self.scratch_frame);
            self.vad.predict_16khz(&i16_samples).unwrap_or(true)
        };

        let is_speech = self.smooth_vad_decision(raw_is_speech);

        if !is_speech {
            frame.fill(0.0);
        }
    }

    fn calculate_rms(samples: &[f32]) -> f32 {
        if samples.is_empty() {
            return 0.0;
        }
        let sum_sq: f32 = samples.iter().map(|&s| s * s).sum();
        (sum_sq / samples.len() as f32).sqrt()
    }
}

impl<S, E> Stream for ContinuousVadMaskStream<S>
where
    S: Stream<Item = Result<Vec<f32>, E>> + Unpin,
{
    type Item = Result<Vec<f32>, E>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        match Pin::new(&mut this.inner).poll_next(cx) {
            Poll::Ready(Some(Ok(mut chunk))) => {
                this.process_chunk(&mut chunk);
                Poll::Ready(Some(Ok(chunk)))
            }
            other => other,
        }
    }
}

pub trait VadMaskExt: Sized {
    fn mask_with_vad(self) -> ContinuousVadMaskStream<Self>;
}

impl<S, E> VadMaskExt for S
where
    S: Stream<Item = Result<Vec<f32>, E>> + Sized + Unpin,
{
    fn mask_with_vad(self) -> ContinuousVadMaskStream<Self> {
        ContinuousVadMaskStream::new(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{stream, StreamExt};
    use rodio::Source;

    #[tokio::test]
    async fn test_continuous_stream_preserves_length() {
        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let original_samples: Vec<f32> = input_audio.convert_samples::<f32>().collect();
        let original_len = original_samples.len();

        let chunk_size = 512;
        let chunks_iter = original_samples
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);
        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();
        while let Some(item) = vad_stream.next().await {
            if let Ok(chunk) = item {
                masked_samples.extend_from_slice(&chunk);
            }
        }

        assert_eq!(
            original_len,
            masked_samples.len(),
            "VAD masking should preserve stream length"
        );
    }

    #[tokio::test]
    async fn test_vad_masks_silence() {
        let silence: Vec<f32> = vec![0.0; 16000];

        let chunk_size = 512;
        let chunks_iter = silence
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);
        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();
        while let Some(item) = vad_stream.next().await {
            if let Ok(chunk) = item {
                masked_samples.extend_from_slice(&chunk);
            }
        }

        // We should not *introduce* any non-zero samples, and the vast majority
        // of silence should stay zero.
        let non_zero_count = masked_samples.iter().filter(|&&s| s != 0.0).count();
        assert!(
            non_zero_count < 100,
            "Silence should be mostly masked (found {} non-zero samples)",
            non_zero_count
        );
    }

    #[test]
    fn test_hangover_logic() {
        // Use an empty inner stream; we only care about the internal state machine.
        let mut vad_stream = ContinuousVadMaskStream::new(stream::empty::<Result<Vec<f32>, ()>>());
        vad_stream.hangover_frames = 3;

        // Initial state is conservative: in_speech = true
        assert!(vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 0);

        // Simulate raw VAD decisions: T, F, F, F, F
        // First: raw speech
        assert!(vad_stream.smooth_vad_decision(true));
        assert!(vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 0);

        // First false: still treated as speech (hangover 1/3)
        assert!(vad_stream.smooth_vad_decision(false));
        assert!(vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 1);

        // Second false: still speech (hangover 2/3)
        assert!(vad_stream.smooth_vad_decision(false));
        assert!(vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 2);

        // Third false: still speech (hangover 3/3)
        assert!(vad_stream.smooth_vad_decision(false));
        assert!(vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 3);

        // Fourth false: now we finally flip to non-speech
        assert!(!vad_stream.smooth_vad_decision(false));
        assert!(!vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 0);

        // More false: stays non-speech
        assert!(!vad_stream.smooth_vad_decision(false));
        assert!(!vad_stream.in_speech);
        assert_eq!(vad_stream.trailing_non_speech, 0);
    }

    #[tokio::test]
    async fn test_different_chunk_sizes() {
        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let original_samples: Vec<f32> = input_audio.convert_samples::<f32>().collect();

        for chunk_size in [160, 320, 480, 512, 1024] {
            let chunks_iter = original_samples
                .chunks(chunk_size)
                .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

            let base_stream = stream::iter(chunks_iter);
            let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

            let mut masked_samples = Vec::new();
            while let Some(item) = vad_stream.next().await {
                if let Ok(chunk) = item {
                    masked_samples.extend_from_slice(&chunk);
                }
            }

            assert_eq!(
                original_samples.len(),
                masked_samples.len(),
                "Chunk size {} should preserve stream length",
                chunk_size
            );
        }
    }

    #[tokio::test]
    async fn test_vad_preserves_speech() {
        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let original_samples: Vec<f32> = input_audio.convert_samples::<f32>().collect();

        let chunk_size = 512;
        let chunks_iter = original_samples
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);
        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();
        while let Some(item) = vad_stream.next().await {
            if let Ok(chunk) = item {
                masked_samples.extend_from_slice(&chunk);
            }
        }

        let original_non_zero = original_samples.iter().filter(|&&s| s.abs() > 0.01).count();
        let masked_non_zero = masked_samples.iter().filter(|&&s| s.abs() > 0.01).count();

        let preservation_ratio = masked_non_zero as f64 / original_non_zero as f64;
        assert!(
            preservation_ratio > 0.5,
            "VAD should preserve at least 50% of speech samples (preserved {}%)",
            preservation_ratio * 100.0
        );
    }

    #[test]
    fn test_frame_size_selection() {
        // Sanity-check assumptions about the VAD helper we're using.
        assert_eq!(hypr_vad3::choose_optimal_frame_size(160), 160);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(320), 320);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(480), 480);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(960), 480);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(640), 320);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(512), 320);
    }
}
