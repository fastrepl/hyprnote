use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use futures_util::Stream;
use kalosm_sound::AsyncSource;

use silero_rs::{VadConfig, VadSession, VadTransition};

mod error;
use error::*;

pub struct ChunkStream<S: AsyncSource> {
    source: S,
    chunk_samples: usize,
    buffer: Vec<f32>,
}

impl<S: AsyncSource> ChunkStream<S> {
    fn new(source: S, chunk_duration: Duration) -> Self {
        let sample_rate = source.sample_rate();
        let chunk_samples = (chunk_duration.as_secs_f64() * sample_rate as f64) as usize;

        Self {
            source,
            chunk_samples,
            buffer: Vec::with_capacity(chunk_samples),
        }
    }
}

impl<S: AsyncSource + Unpin> Stream for ChunkStream<S> {
    type Item = Vec<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.buffer.len() < this.chunk_samples {
            match stream.as_mut().poll_next(cx) {
                Poll::Pending => {
                    return Poll::Pending;
                }
                Poll::Ready(Some(sample)) => {
                    this.buffer.push(sample);
                }
                Poll::Ready(None) => {
                    if this.buffer.is_empty() {
                        return Poll::Ready(None);
                    } else {
                        let chunk = std::mem::take(&mut this.buffer);
                        return Poll::Ready(Some(chunk));
                    }
                }
            }
        }

        let mut chunk = Vec::with_capacity(this.chunk_samples);
        chunk.extend(this.buffer.drain(..this.chunk_samples));
        Poll::Ready(Some(chunk))
    }
}

pub trait VadExt: AsyncSource + Sized {
    fn vad_chunks(self) -> VadChunkStream<Self>
    where
        Self: Unpin,
    {
        let config = VadConfig {
            redemption_time: Duration::from_millis(600),
            min_speech_time: Duration::from_millis(50),
            ..Default::default()
        };

        VadChunkStream::new(self, config).unwrap()
    }
}

impl<T: AsyncSource> VadExt for T {}

pub struct VadChunkStream<S: AsyncSource> {
    chunk_stream: ChunkStream<S>,
    vad_session: VadSession,
    pending_chunks: Vec<AudioChunk>,
}

impl<S: AsyncSource> VadChunkStream<S> {
    fn new(source: S, mut config: VadConfig) -> Result<Self, Error> {
        config.sample_rate = source.sample_rate() as usize;

        // https://github.com/emotechlab/silero-rs/blob/26a6460/src/lib.rs#L775
        let chunk_duration = Duration::from_millis(30);

        Ok(Self {
            chunk_stream: ChunkStream::new(source, chunk_duration),
            vad_session: VadSession::new(config).map_err(|_| Error::VadSessionCreationFailed)?,
            pending_chunks: Vec::new(),
        })
    }
}

#[derive(Debug, Clone)]
pub struct AudioChunk {
    pub samples: Vec<f32>,
}

impl<S: AsyncSource + Unpin> Stream for VadChunkStream<S> {
    type Item = Result<AudioChunk, Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        if let Some(chunk) = this.pending_chunks.pop() {
            return Poll::Ready(Some(Ok(chunk)));
        }

        loop {
            match Pin::new(&mut this.chunk_stream).poll_next(cx) {
                Poll::Ready(Some(samples)) => match this.vad_session.process(&samples) {
                    Ok(transitions) => {
                        for transition in transitions {
                            if let VadTransition::SpeechEnd { samples, .. } = transition {
                                this.pending_chunks.push(AudioChunk { samples });
                            }
                        }

                        if let Some(chunk) = this.pending_chunks.pop() {
                            return Poll::Ready(Some(Ok(chunk)));
                        }
                    }
                    Err(e) => {
                        let error = Error::VadProcessingFailed(e.to_string());
                        return Poll::Ready(Some(Err(error)));
                    }
                },
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
