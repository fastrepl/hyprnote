use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use futures_util::Stream;
use hypr_audio::AsyncSource;
use silero_rs::{VadConfig, VadSession, VadTransition};

pub struct ChunkStream<S: AsyncSource> {
    source: S,
    chunk_duration: Duration,
    chunk_samples: usize,
    buffer: Vec<f32>,
}

impl<S: AsyncSource> ChunkStream<S> {
    fn new(source: S, chunk_duration: Duration) -> Self {
        let sample_rate = source.sample_rate();
        let chunk_samples = (chunk_duration.as_secs_f64() * sample_rate as f64) as usize;

        Self {
            source,
            chunk_duration,
            chunk_samples,
            buffer: Vec::with_capacity(chunk_samples),
        }
    }
}

impl<S: AsyncSource + Unpin> Stream for ChunkStream<S> {
    type Item = Vec<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let mut stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        // Fill buffer until we have enough samples or stream ends
        while this.buffer.len() < this.chunk_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);
                }
                Poll::Ready(None) => {
                    // Stream ended
                    if this.buffer.is_empty() {
                        return Poll::Ready(None);
                    } else {
                        // Return final partial chunk
                        let chunk = std::mem::take(&mut this.buffer);
                        return Poll::Ready(Some(chunk));
                    }
                }
                Poll::Pending => {
                    // Not enough data yet
                    if this.buffer.is_empty() {
                        return Poll::Pending;
                    } else {
                        // For real-time processing, we might want to return partial chunks
                        // after a timeout, but for now we wait for full chunks
                        return Poll::Pending;
                    }
                }
            }
        }

        // We have a full chunk
        let mut chunk = Vec::with_capacity(this.chunk_samples);
        chunk.extend(this.buffer.drain(..this.chunk_samples));
        Poll::Ready(Some(chunk))
    }
}

// If you want the ChunkerExt trait too:
pub trait ChunkerExt: AsyncSource + Sized {
    fn chunks(self, chunk_duration: Duration) -> ChunkStream<Self>
    where
        Self: Unpin,
    {
        ChunkStream::new(self, chunk_duration)
    }
}

impl<T: AsyncSource> ChunkerExt for T {}

pub trait VadExt: AsyncSource + Sized {
    fn vad_chunks(self, config: VadConfig) -> VadChunkStream<Self>
    where
        Self: Unpin,
    {
        VadChunkStream::new(self, config)
    }
}

impl<T: AsyncSource> VadExt for T {}

pub struct VadChunkStream<S: AsyncSource> {
    chunk_stream: ChunkStream<S>,
    vad_session: VadSession,
    pending_chunks: Vec<AudioChunk>,
}

impl<S: AsyncSource> VadChunkStream<S> {
    fn new(source: S, mut config: VadConfig) -> Self {
        // Ensure sample rate matches
        config.sample_rate = source.sample_rate() as usize;

        // Use 30ms chunks as recommended by the VAD
        let chunk_duration = Duration::from_millis(30);

        Self {
            chunk_stream: ChunkStream::new(source, chunk_duration),
            vad_session: VadSession::new(config).expect("Failed to create VAD session"),
            pending_chunks: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AudioChunk {
    pub samples: Vec<f32>,
    pub start_ms: usize,
    pub end_ms: usize,
    pub sample_rate: usize,
}

impl<S: AsyncSource + Unpin> Stream for VadChunkStream<S> {
    type Item = AudioChunk;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        // Return pending chunks first
        if let Some(chunk) = this.pending_chunks.pop() {
            return Poll::Ready(Some(chunk));
        }

        // Process new audio chunks
        loop {
            match Pin::new(&mut this.chunk_stream).poll_next(cx) {
                Poll::Ready(Some(samples)) => {
                    match this.vad_session.process(&samples) {
                        Ok(transitions) => {
                            for transition in transitions {
                                if let VadTransition::SpeechEnd {
                                    start_timestamp_ms,
                                    end_timestamp_ms,
                                    samples,
                                } = transition
                                {
                                    this.pending_chunks.push(AudioChunk {
                                        samples,
                                        start_ms: start_timestamp_ms,
                                        end_ms: end_timestamp_ms,
                                        sample_rate: this.vad_session.config_mut().sample_rate,
                                    });
                                }
                            }

                            if let Some(chunk) = this.pending_chunks.pop() {
                                return Poll::Ready(Some(chunk));
                            }
                        }
                        Err(e) => {
                            eprintln!("VAD error: {}", e);
                            // Continue processing
                        }
                    }
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
