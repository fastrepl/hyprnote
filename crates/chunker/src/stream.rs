use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

use crate::Predictor;

/// Configuration for chunking behavior
#[derive(Debug, Clone)]
pub struct ChunkConfig {
    /// Maximum duration for a single chunk
    pub max_duration: Duration,
    /// Minimum buffer duration before considering silence splits
    pub min_buffer_duration: Duration,
    /// Duration of silence to trigger chunk split
    pub silence_window_duration: Duration,
    /// Window size for silence trimming (in samples)
    pub trim_window_size: usize,
}

impl Default for ChunkConfig {
    fn default() -> Self {
        Self {
            max_duration: Duration::from_secs(30), // Increased from 15s to 30s for Whisper
            min_buffer_duration: Duration::from_secs(6),
            silence_window_duration: Duration::from_millis(500),
            trim_window_size: 480, // 30ms at 16kHz, minimum for Silero VAD
        }
    }
}

pub struct ChunkStream<S: AsyncSource + Unpin, P: Predictor + Unpin> {
    source: S,
    predictor: P,
    buffer: Vec<f32>,
    config: ChunkConfig,
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> ChunkStream<S, P> {
    pub fn new(source: S, predictor: P, max_duration: Duration) -> Self {
        Self::with_config(
            source,
            predictor,
            ChunkConfig {
                max_duration,
                ..Default::default()
            },
        )
    }

    pub fn with_config(source: S, predictor: P, config: ChunkConfig) -> Self {
        Self {
            source,
            predictor,
            buffer: Vec::new(),
            config,
        }
    }

    fn max_samples(&self) -> usize {
        (self.source.sample_rate() as f64 * self.config.max_duration.as_secs_f64()) as usize
    }

    fn samples_for_duration(&self, duration: Duration) -> usize {
        (self.source.sample_rate() as f64 * duration.as_secs_f64()) as usize
    }

    fn trim_silence(predictor: &P, trim_window_size: usize, data: &mut Vec<f32>) {
        let window_size = trim_window_size;

        // Trim silence from the beginning
        let mut trim_start = 0;
        for start_idx in (0..data.len()).step_by(window_size) {
            let end_idx = (start_idx + window_size).min(data.len());
            let window = &data[start_idx..end_idx];

            if let Ok(true) = predictor.predict(window) {
                trim_start = start_idx;
                break;
            }
        }

        // Trim silence from the end - be more aggressive to prevent Whisper hallucinations
        let mut trim_end = data.len();
        let mut consecutive_silence_windows = 0;
        let mut pos = data.len();
        
        // Scan backwards and find the last speech position
        while pos > window_size {
            pos = pos.saturating_sub(window_size);
            let end_idx = (pos + window_size).min(data.len());
            let window = &data[pos..end_idx];

            match predictor.predict(window) {
                Ok(true) => {
                    // Found speech - but add a safety margin
                    // Move forward by a few windows to ensure we're not cutting off speech
                    let safety_margin = window_size * 2; // 60ms safety margin
                    trim_end = (end_idx + safety_margin).min(data.len());
                    break;
                }
                Ok(false) => {
                    consecutive_silence_windows += 1;
                    // If we've seen significant silence, this is likely the end
                    if consecutive_silence_windows > 10 {
                        // More than 300ms of silence, safe to trim here
                        trim_end = pos;
                    }
                }
                Err(_) => {
                    // On error, be conservative and treat as potential speech
                    break;
                }
            }
        }

        // Apply trimming
        if trim_end > trim_start {
            data.drain(..trim_start);
            data.truncate(trim_end - trim_start);
        } else {
            data.clear();
        }
    }
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> Stream for ChunkStream<S, P> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let max_samples = this.max_samples();
        let sample_rate = this.source.sample_rate();

        let min_buffer_samples = this.samples_for_duration(this.config.min_buffer_duration);
        let silence_window_samples = this.samples_for_duration(this.config.silence_window_duration);

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < max_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);

                    if this.buffer.len() >= min_buffer_samples {
                        let buffer_len = this.buffer.len();
                        let silence_start = buffer_len.saturating_sub(silence_window_samples);
                        let last_samples = &this.buffer[silence_start..buffer_len];

                        if let Ok(false) = this.predictor.predict(last_samples) {
                            let mut data = std::mem::take(&mut this.buffer);
                            Self::trim_silence(
                                &this.predictor,
                                this.config.trim_window_size,
                                &mut data,
                            );

                            // Skip empty chunks to prevent Whisper hallucinations
                            if !data.is_empty() {
                                return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                            }
                        }
                    }
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let mut data = std::mem::take(&mut this.buffer);
                    Self::trim_silence(&this.predictor, this.config.trim_window_size, &mut data);

                    // Skip empty chunks to prevent Whisper hallucinations
                    if !data.is_empty() {
                        return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                    } else {
                        return Poll::Ready(None);
                    }
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let mut chunk: Vec<_> = this.buffer.drain(0..max_samples).collect();
        Self::trim_silence(&this.predictor, this.config.trim_window_size, &mut chunk);

        // Skip empty chunks to prevent Whisper hallucinations
        if !chunk.is_empty() {
            Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, chunk)))
        } else {
            // Buffer was full but trimmed to empty - this means we had a long silence
            // Don't wake immediately to avoid busy loop; let more data accumulate
            Poll::Pending
        }
    }
}
