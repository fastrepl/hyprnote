use futures_util::Stream;
use std::{
    pin::Pin,
    task::{Context, Poll},
    time::Duration,
};

use kalosm_sound::AsyncSource;
use rodio::buffer::SamplesBuffer;

use crate::Predictor;

pub struct ChunkStream<S: AsyncSource + Unpin, P: Predictor + Unpin> {
    source: S,
    predictor: P,
    buffer: Vec<f32>,
    max_duration: Duration,
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> ChunkStream<S, P> {
    pub fn new(source: S, predictor: P, max_duration: Duration) -> Self {
        Self {
            source,
            predictor,
            buffer: Vec::new(),
            max_duration,
        }
    }

    fn max_samples(&self) -> usize {
        (self.source.sample_rate() as f64 * self.max_duration.as_secs_f64()) as usize
    }

    fn samples_for_duration(&self, duration: Duration) -> usize {
        (self.source.sample_rate() as f64 * duration.as_secs_f64()) as usize
    }

    fn trim_silence(predictor: &P, data: &mut Vec<f32>) {
        const WINDOW_SIZE: usize = 100;

        let mut trim_index = 0;
        for start_idx in (0..data.len()).step_by(WINDOW_SIZE) {
            let end_idx = (start_idx + WINDOW_SIZE).min(data.len());
            let window = &data[start_idx..end_idx];

            if let Ok(false) = predictor.predict(window) {
                trim_index = start_idx;
                break;
            }
        }

        data.drain(0..trim_index);
    }
}

impl<S: AsyncSource + Unpin, P: Predictor + Unpin> Stream for ChunkStream<S, P> {
    type Item = SamplesBuffer<f32>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let max_samples = this.max_samples();
        let sample_rate = this.source.sample_rate();

        let min_buffer_samples = this.samples_for_duration(Duration::from_secs(6));
        let silence_window_samples = this.samples_for_duration(Duration::from_millis(500));

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
                            Self::trim_silence(&this.predictor, &mut data);

                            return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                        }
                    }
                }
                Poll::Ready(None) if !this.buffer.is_empty() => {
                    let mut data = std::mem::take(&mut this.buffer);
                    Self::trim_silence(&this.predictor, &mut data);

                    return Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, data)));
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let mut chunk: Vec<_> = this.buffer.drain(0..max_samples).collect();
        Self::trim_silence(&this.predictor, &mut chunk);

        Poll::Ready(Some(SamplesBuffer::new(1, sample_rate, chunk)))
    }
}
