use std::pin::Pin;
use std::task::{Context, Poll};

use dasp::interpolate::Interpolator;
use futures_util::{pin_mut, Stream};
use kalosm_sound::AsyncSource;

pub struct ResampledAsyncSource<S: AsyncSource> {
    source: S,
    target_sample_rate: u32,
    last_source_rate: u32,
    ratio: f64,

    phase: f64,

    interp: dasp::interpolate::linear::Linear<f32>,
    last_sample: f32,
    seeded: bool,
}

impl<S: AsyncSource> ResampledAsyncSource<S> {
    pub fn new(source: S, target_sample_rate: u32) -> Self {
        let initial_rate = source.sample_rate();
        Self {
            source,
            target_sample_rate,
            last_source_rate: initial_rate,
            ratio: initial_rate as f64 / target_sample_rate as f64,
            phase: 0.0,
            interp: dasp::interpolate::linear::Linear::new(0.0, 0.0),
            last_sample: 0.0,
            seeded: false,
        }
    }

    #[inline]
    fn handle_rate_change(&mut self) {
        let new_rate = self.source.sample_rate();
        if new_rate == self.last_source_rate {
            return;
        }

        self.last_source_rate = new_rate;
        self.ratio = new_rate as f64 / self.target_sample_rate as f64;
        self.phase = 0.0;
        self.interp = dasp::interpolate::linear::Linear::new(self.last_sample, self.last_sample);
    }
}

impl<S: AsyncSource + Unpin> Stream for ResampledAsyncSource<S> {
    type Item = f32;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let me = self.get_mut();

        me.handle_rate_change();

        let inner = me.source.as_stream();
        pin_mut!(inner);

        if !me.seeded {
            match inner.as_mut().poll_next(cx) {
                Poll::Ready(Some(frame)) => {
                    me.last_sample = frame;
                    me.interp = dasp::interpolate::linear::Linear::new(frame, frame);
                    me.seeded = true;
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        while me.phase >= 1.0 {
            match inner.as_mut().poll_next(cx) {
                Poll::Ready(Some(frame)) => {
                    me.phase -= 1.0;
                    me.last_sample = frame;
                    me.interp.next_source_frame(frame);
                }
                Poll::Ready(None) => return Poll::Ready(None),
                Poll::Pending => return Poll::Pending,
            }
        }

        let out = me.interp.interpolate(me.phase);
        me.phase += me.ratio;
        Poll::Ready(Some(out))
    }
}

impl<S: AsyncSource + Unpin> AsyncSource for ResampledAsyncSource<S> {
    fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
        self
    }

    fn sample_rate(&self) -> u32 {
        self.target_sample_rate
    }
}

#[cfg(test)]
mod tests {
    use futures_util::{Stream, StreamExt};
    use kalosm_sound::AsyncSource;
    use rodio::Source;
    use std::pin::Pin;
    use std::task::{Context, Poll};

    use crate::ResampledAsyncSource;

    fn get_samples_with_rate(path: impl AsRef<std::path::Path>) -> (Vec<f32>, u32) {
        let source =
            rodio::Decoder::new(std::io::BufReader::new(std::fs::File::open(path).unwrap()))
                .unwrap();

        let sample_rate = AsyncSource::sample_rate(&source);
        let samples = source.convert_samples::<f32>().collect();
        (samples, sample_rate)
    }

    #[derive(Clone)]
    struct DynamicRateSource {
        segments: Vec<(Vec<f32>, u32)>,
        current_segment: usize,
        current_position: usize,
    }

    impl DynamicRateSource {
        fn new(segments: Vec<(Vec<f32>, u32)>) -> Self {
            Self {
                segments,
                current_segment: 0,
                current_position: 0,
            }
        }
    }

    impl AsyncSource for DynamicRateSource {
        fn as_stream(&mut self) -> impl Stream<Item = f32> + '_ {
            DynamicRateStream { source: self }
        }

        fn sample_rate(&self) -> u32 {
            if self.current_segment < self.segments.len() {
                self.segments[self.current_segment].1
            } else {
                unreachable!()
            }
        }
    }

    struct DynamicRateStream<'a> {
        source: &'a mut DynamicRateSource,
    }

    impl<'a> Stream for DynamicRateStream<'a> {
        type Item = f32;

        fn poll_next(mut self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
            let source = &mut self.source;

            while source.current_segment < source.segments.len() {
                let (samples, _rate) = &source.segments[source.current_segment];

                if source.current_position < samples.len() {
                    let sample = samples[source.current_position];
                    source.current_position += 1;
                    return Poll::Ready(Some(sample));
                }

                source.current_segment += 1;
                source.current_position = 0;
            }

            Poll::Ready(None)
        }
    }

    #[tokio::test]
    async fn test_existing_resampler() {
        let source = DynamicRateSource::new(vec![
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART1_8000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART2_16000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART3_22050HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART4_32000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART5_44100HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART6_48000HZ_PATH),
        ]);

        {
            let resampled = source.clone().resample(16000);
            assert!(resampled.collect::<Vec<_>>().await.len() == 9896247);
        }

        {
            let mut resampled = source.clone().resample(16000);

            let mut out_wav = hound::WavWriter::create(
                "./out_1.wav",
                hound::WavSpec {
                    channels: 1,
                    sample_rate: 16000,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                },
            )
            .unwrap();
            while let Some(sample) = resampled.next().await {
                out_wav.write_sample(sample).unwrap();
            }
        }
    }

    #[tokio::test]
    async fn test_new_resampler() {
        let source = DynamicRateSource::new(vec![
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART1_8000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART2_16000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART3_22050HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART4_32000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART5_44100HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART6_48000HZ_PATH),
        ]);

        {
            let resampled = ResampledAsyncSource::new(source.clone(), 16000);
            assert!(resampled.collect::<Vec<_>>().await.len() == 2791777);
        }

        {
            let mut resampled = ResampledAsyncSource::new(source.clone(), 16000);

            let mut out_wav = hound::WavWriter::create(
                "./out_2.wav",
                hound::WavSpec {
                    channels: 1,
                    sample_rate: 16000,
                    bits_per_sample: 32,
                    sample_format: hound::SampleFormat::Float,
                },
            )
            .unwrap();
            while let Some(sample) = resampled.next().await {
                out_wav.write_sample(sample).unwrap();
            }
        }
    }
}
