use dasp::interpolate::{linear::Linear, Interpolator as _};
use futures_core::Stream;

pub trait AsyncSource {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_;
    fn sample_rate(&self) -> u32;
    fn resample(self, to: u32) -> ResampledAsyncSource<Self>
    where
        Self: Sized + Unpin,
    {
        tracing::info!(from = ?self.sample_rate(), to = ?to, "resampling");
        ResampledAsyncSource::new(self, to)
    }

    fn resample_from_to(self, from: u32, to: u32) -> ResampledAsyncSource<Self>
    where
        Self: Sized + Unpin,
    {
        tracing::info!(from = ?from, to = ?to, "resampling");
        ResampledAsyncSource::new_from_to(self, from, to)
    }
}

// https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mod.rs#L69
pub struct ResampledAsyncSource<S: AsyncSource> {
    source: S,
    source_output_sample_ratio: f64,
    sample_position: f64,
    sample_rate: u32,
    resampler: Linear<f32>,
}

impl<S: AsyncSource> ResampledAsyncSource<S> {
    fn new(source: S, sample_rate: u32) -> Self {
        let (from, to) = (source.sample_rate(), sample_rate);
        Self::new_from_to(source, from, to)
    }

    // TODO: escape hatch, since sample rate of output device is wrong when device like Airpod is connected
    fn new_from_to(source: S, from: u32, to: u32) -> Self {
        let source_output_sample_ratio = from as f64 / to as f64;
        Self {
            source,
            source_output_sample_ratio,
            sample_position: source_output_sample_ratio,
            sample_rate: to,
            resampler: Linear::new(0.0, 0.0),
        }
    }
}

// https://github.com/floneum/floneum/blob/50afe10/interfaces/kalosm-sound/src/source/mod.rs#L90
impl<S: AsyncSource + Unpin> Stream for ResampledAsyncSource<S> {
    type Item = f32;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        let myself = self.get_mut();
        let mut source = myself.source.as_stream();
        let mut source = std::pin::pin!(source);
        let source_output_sample_ratio = myself.source_output_sample_ratio;

        while myself.sample_position >= 1.0 {
            myself.sample_position -= 1.0;
            myself
                .resampler
                .next_source_frame(match source.as_mut().poll_next(cx) {
                    std::task::Poll::Ready(Some(frame)) => frame,
                    std::task::Poll::Ready(None) => return std::task::Poll::Ready(None),
                    std::task::Poll::Pending => return std::task::Poll::Pending,
                })
        }

        let interpolated = myself.resampler.interpolate(myself.sample_position);
        myself.sample_position += source_output_sample_ratio;

        std::task::Poll::Ready(Some(interpolated))
    }
}

impl<S: AsyncSource + Unpin> AsyncSource for ResampledAsyncSource<S> {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.sample_rate
    }
}
