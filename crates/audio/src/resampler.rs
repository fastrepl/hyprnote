use dasp::interpolate::Interpolator;
use futures_util::Stream;
use kalosm_sound::AsyncSource;

pub struct ResampledAsyncSource<S: AsyncSource> {
    source: S,
    target_sample_rate: u32,
    sample_position: f64,
    resampler: dasp::interpolate::linear::Linear<f32>,
    last_source_rate: u32,
}

impl<S: AsyncSource> ResampledAsyncSource<S> {
    pub fn new(source: S, target_sample_rate: u32) -> Self {
        let initial_rate = source.sample_rate();
        Self {
            source,
            target_sample_rate,
            sample_position: initial_rate as f64 / target_sample_rate as f64,
            resampler: dasp::interpolate::linear::Linear::new(0.0, 0.0),
            last_source_rate: initial_rate,
        }
    }
}

impl<S: AsyncSource + Unpin> Stream for ResampledAsyncSource<S> {
    type Item = f32;

    fn poll_next(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
    ) -> std::task::Poll<Option<Self::Item>> {
        let myself = self.get_mut();

        let current_source_rate = myself.source.sample_rate();
        if current_source_rate != myself.last_source_rate {
            myself.last_source_rate = current_source_rate;
        }

        let source_output_sample_ratio =
            current_source_rate as f64 / myself.target_sample_rate as f64;

        let source = myself.source.as_stream();
        let mut source = std::pin::pin!(source);

        while myself.sample_position >= 1.0 {
            match source.as_mut().poll_next(cx) {
                std::task::Poll::Ready(Some(frame)) => {
                    myself.sample_position -= 1.0;
                    myself.resampler.next_source_frame(frame);
                }
                std::task::Poll::Ready(None) => return std::task::Poll::Ready(None),
                std::task::Poll::Pending => return std::task::Poll::Pending,
            }
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

        let mut resampled = source.resample(16000);
        while let Some(sample) = resampled.next().await {
            out_wav.write_sample(sample).unwrap();
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

        let mut resampled = ResampledAsyncSource::new(source, 16000);
        while let Some(sample) = resampled.next().await {
            out_wav.write_sample(sample).unwrap();
        }
    }
}
