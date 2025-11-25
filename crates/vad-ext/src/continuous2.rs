use std::{
    pin::Pin,
    task::{Context, Poll},
};

use futures_util::Stream;
use hypr_audio_utils::f32_to_i16_samples;
use hypr_vad3::earshot::{VoiceActivityDetector, VoiceActivityProfile};

pub struct ContinuousVadMaskStream<S> {
    inner: S,
    vad: VoiceActivityDetector,
    hangover_frames: usize,
    trailing_non_speech: usize,
    in_speech: bool,
}

impl<S> ContinuousVadMaskStream<S> {
    pub fn new(inner: S) -> Self {
        Self {
            inner,
            vad: VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
            hangover_frames: 3,
            trailing_non_speech: 0,
            in_speech: true,
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

        if chunk.len() <= frame_size {
            self.process_frame(chunk, frame_size);
        } else {
            for frame in chunk.chunks_mut(frame_size) {
                self.process_frame(frame, frame_size);
            }
        }
    }

    fn process_frame(&mut self, frame: &mut [f32], frame_size: usize) {
        let mut padded = frame.to_vec();
        if padded.len() < frame_size {
            padded.resize(frame_size, 0.0);
        }

        let i16_samples = f32_to_i16_samples(&padded);

        let raw_is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);

        let is_speech = if raw_is_speech {
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
        };

        if !is_speech {
            for s in frame.iter_mut() {
                *s = 0.0;
            }
        }
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

        let non_zero_count = masked_samples.iter().filter(|&&s| s != 0.0).count();
        assert!(
            non_zero_count < 100,
            "Silence should be mostly masked (found {} non-zero samples)",
            non_zero_count
        );
    }

    #[tokio::test]
    async fn test_hangover_period() {
        let mut vad_stream = ContinuousVadMaskStream::new(stream::empty::<Result<Vec<f32>, ()>>());
        vad_stream.hangover_frames = 3;

        vad_stream.in_speech = true;
        vad_stream.trailing_non_speech = 0;

        let mut frame = vec![0.0; 160];
        vad_stream.process_frame(&mut frame, 160);

        assert!(
            frame.iter().any(|&s| s == 0.0),
            "First non-speech frame should still pass due to hangover"
        );
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

    #[tokio::test]
    async fn test_frame_size_selection() {
        assert_eq!(hypr_vad3::choose_optimal_frame_size(160), 160);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(320), 320);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(480), 480);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(960), 480);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(640), 320);
        assert_eq!(hypr_vad3::choose_optimal_frame_size(512), 320);
    }
}
