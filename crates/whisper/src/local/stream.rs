// https://github.com/floneum/floneum/blob/917fa37/models/rwhisper/src/lib.rs#L230-L231
use std::{
    pin::Pin,
    task::{Context, Poll},
};

use cpal::FromSample;
use futures_util::{Stream, StreamExt};
use rodio::Source;

use super::{Segment, Whisper};

pub struct ChunkedTranscriptionTask<S> {
    stream: S,
    whisper: Whisper,
    current_segment_task: Option<Pin<Box<dyn Stream<Item = Segment> + Send>>>,
}

pub trait TranscribeChunkedAudioStreamExt<S>: Sized {
    fn transcribe(self, whisper: Whisper) -> ChunkedTranscriptionTask<S>;
}

impl<S> TranscribeChunkedAudioStreamExt<S> for S
where
    S: Stream + std::marker::Unpin + Send + 'static,
    <S as Stream>::Item: Source + Send + 'static,
    <<S as Stream>::Item as Iterator>::Item: rodio::Sample,
    f32: FromSample<<<S as Stream>::Item as Iterator>::Item>,
{
    fn transcribe(self, whisper: Whisper) -> ChunkedTranscriptionTask<S> {
        ChunkedTranscriptionTask {
            stream: self,
            whisper,
            current_segment_task: None,
        }
    }
}

impl<S> Stream for ChunkedTranscriptionTask<S>
where
    S: Stream + std::marker::Unpin + Send + 'static,
    <S as Stream>::Item: Source + Send + 'static,
    <<S as Stream>::Item as Iterator>::Item: rodio::Sample,
    f32: FromSample<<<S as Stream>::Item as Iterator>::Item>,
{
    type Item = Segment;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        loop {
            if let Some(task) = &mut this.current_segment_task {
                match task.as_mut().poll_next(cx) {
                    Poll::Ready(Some(segment)) => {
                        return Poll::Ready(Some(segment));
                    }
                    Poll::Ready(None) => {
                        this.current_segment_task = None;
                    }
                    Poll::Pending => return Poll::Pending,
                }
            }

            match this.stream.poll_next_unpin(cx) {
                Poll::Ready(Some(source)) => {
                    let samples: Vec<f32> = source.convert_samples().collect();
                    if !samples.is_empty() {
                        match this.whisper.transcribe(&samples) {
                            Err(e) => {
                                tracing::error!("{:?}", e);
                                return Poll::Pending;
                            }
                            Ok(segments) => {
                                this.current_segment_task =
                                    Some(Box::pin(futures_util::stream::iter(segments)));
                            }
                        }
                    }
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
