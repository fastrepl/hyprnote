use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use futures_util::{future, Stream, StreamExt};
use kalosm_sound::AsyncSource;
use silero_rs::{VadConfig, VadSession, VadTransition};

#[derive(Debug, Clone)]
pub enum VadStreamItem {
    AudioSamples(Vec<f32>),
    SpeechStart {
        timestamp_ms: usize,
    },
    SpeechEnd {
        start_timestamp_ms: usize,
        end_timestamp_ms: usize,
    },
}

#[derive(Debug, Clone)]
pub struct AudioChunk {
    pub samples: Vec<f32>,
}

pub struct ContinuousVadStream<S: AsyncSource> {
    source: S,
    vad_session: VadSession,
    chunk_samples: usize,
    buffer: Vec<f32>,
    pending_items: Vec<VadStreamItem>,
}

impl<S: AsyncSource> ContinuousVadStream<S> {
    pub fn new(source: S, mut config: VadConfig) -> Result<Self, crate::Error> {
        config.sample_rate = source.sample_rate() as usize;

        // https://github.com/emotechlab/silero-rs/blob/26a6460/src/lib.rs#L775
        let chunk_duration = Duration::from_millis(30);
        let chunk_samples = (chunk_duration.as_secs_f64() * config.sample_rate as f64) as usize;

        Ok(Self {
            source,
            vad_session: VadSession::new(config)
                .map_err(|_| crate::Error::VadSessionCreationFailed)?,
            chunk_samples,
            buffer: Vec::with_capacity(chunk_samples),
            pending_items: Vec::new(),
        })
    }
}

impl<S: AsyncSource + Unpin> Stream for ContinuousVadStream<S> {
    type Item = Result<VadStreamItem, crate::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        if let Some(item) = this.pending_items.pop() {
            return Poll::Ready(Some(Ok(item)));
        }

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
                    if !this.buffer.is_empty() {
                        let chunk = std::mem::take(&mut this.buffer);

                        match this.vad_session.process(&chunk) {
                            Ok(transitions) => {
                                // Queue transitions in reverse order (we pop from the end)
                                for transition in transitions.into_iter().rev() {
                                    let item = match transition {
                                        VadTransition::SpeechStart { timestamp_ms } => {
                                            VadStreamItem::SpeechStart { timestamp_ms }
                                        }
                                        VadTransition::SpeechEnd {
                                            start_timestamp_ms,
                                            end_timestamp_ms,
                                            ..
                                        } => VadStreamItem::SpeechEnd {
                                            start_timestamp_ms,
                                            end_timestamp_ms,
                                        },
                                    };
                                    this.pending_items.push(item);
                                }

                                // Always emit the audio chunk first
                                return Poll::Ready(Some(Ok(VadStreamItem::AudioSamples(chunk))));
                            }
                            Err(e) => {
                                return Poll::Ready(Some(Err(crate::Error::VadProcessingFailed(
                                    e.to_string(),
                                ))));
                            }
                        }
                    }
                    return Poll::Ready(None);
                }
            }
        }

        // We have a full chunk - process it
        let mut chunk = Vec::with_capacity(this.chunk_samples);
        chunk.extend(this.buffer.drain(..this.chunk_samples));

        match this.vad_session.process(&chunk) {
            Ok(transitions) => {
                // Queue transitions in reverse order (we pop from the end)
                for transition in transitions.into_iter().rev() {
                    let item = match transition {
                        VadTransition::SpeechStart { timestamp_ms } => {
                            VadStreamItem::SpeechStart { timestamp_ms }
                        }
                        VadTransition::SpeechEnd {
                            start_timestamp_ms,
                            end_timestamp_ms,
                            ..
                        } => VadStreamItem::SpeechEnd {
                            start_timestamp_ms,
                            end_timestamp_ms,
                        },
                    };
                    this.pending_items.push(item);
                }

                // Always emit the audio chunk first
                Poll::Ready(Some(Ok(VadStreamItem::AudioSamples(chunk))))
            }
            Err(e) => Poll::Ready(Some(Err(crate::Error::VadProcessingFailed(e.to_string())))),
        }
    }
}

pub trait VadExt: AsyncSource + Sized {
    /// Creates a continuous stream that emits all audio samples along with VAD events
    fn continuous_vad(self, config: VadConfig) -> ContinuousVadStream<Self>
    where
        Self: Unpin,
    {
        ContinuousVadStream::new(self, config).unwrap()
    }

    /// Creates a stream that only emits complete speech chunks
    fn vad_chunks(
        self,
        redemption_time: Duration,
    ) -> impl Stream<Item = Result<AudioChunk, crate::Error>>
    where
        Self: Unpin + 'static,
    {
        let config = VadConfig {
            redemption_time,
            pre_speech_pad: redemption_time,
            post_speech_pad: Duration::from_millis(0),
            min_speech_time: Duration::from_millis(50),
            ..Default::default()
        };

        self.continuous_vad(config)
            .scan(
                (false, Vec::new()),
                |(is_speaking, buffer), item| match item {
                    Ok(VadStreamItem::AudioSamples(samples)) => {
                        if *is_speaking {
                            buffer.extend(samples);
                        }
                        future::ready(Some(None))
                    }
                    Ok(VadStreamItem::SpeechStart { .. }) => {
                        *is_speaking = true;
                        buffer.clear();
                        future::ready(Some(None))
                    }
                    Ok(VadStreamItem::SpeechEnd { .. }) => {
                        *is_speaking = false;
                        if !buffer.is_empty() {
                            let chunk = AudioChunk {
                                samples: std::mem::take(buffer),
                            };
                            future::ready(Some(Some(Ok(chunk))))
                        } else {
                            future::ready(Some(None))
                        }
                    }
                    Err(e) => future::ready(Some(Some(Err(e)))),
                },
            )
            .filter_map(future::ready)
    }
}

impl<T: AsyncSource> VadExt for T {}
