mod driver;
mod dynamic_new;
mod dynamic_old;
mod static_new;

pub use dynamic_new::*;
pub use dynamic_old::*;
pub use static_new::*;

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{Stream, StreamExt};
    use kalosm_sound::AsyncSource;
    use rodio::Source;
    use std::pin::Pin;
    use std::task::{Context, Poll};

    fn get_samples_with_rate(path: impl AsRef<std::path::Path>) -> (Vec<f32>, u32) {
        let source =
            rodio::Decoder::new(std::io::BufReader::new(std::fs::File::open(path).unwrap()))
                .unwrap();

        let sample_rate = rodio::Source::sample_rate(&source);
        let samples = source.convert_samples::<f32>().collect();
        (samples, sample_rate)
    }

    #[derive(Clone)]
    struct DynamicRateSource {
        segments: Vec<(Vec<f32>, u32)>,
        current_segment: usize,
        current_position: usize,
        poll_count: usize,
        pending_yield: bool,
    }

    impl DynamicRateSource {
        fn new(segments: Vec<(Vec<f32>, u32)>) -> Self {
            Self {
                segments,
                current_segment: 0,
                current_position: 0,
                poll_count: 0,
                pending_yield: false,
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
                16000
            }
        }
    }

    struct DynamicRateStream<'a> {
        source: &'a mut DynamicRateSource,
    }

    impl<'a> Stream for DynamicRateStream<'a> {
        type Item = f32;

        fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
            let source = &mut self.source;

            source.poll_count += 1;
            if source.pending_yield {
                source.pending_yield = false;
            } else if source.poll_count % 1000 == 0 {
                let waker = cx.waker().clone();
                source.pending_yield = true;
                tokio::spawn(async move {
                    tokio::task::yield_now().await;
                    waker.wake();
                });
                return Poll::Pending;
            }

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

    fn create_test_source() -> DynamicRateSource {
        DynamicRateSource::new(vec![
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART1_8000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART2_16000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART3_22050HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART4_32000HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART5_44100HZ_PATH),
            get_samples_with_rate(hypr_data::english_1::AUDIO_PART6_48000HZ_PATH),
        ])
    }

    macro_rules! write_wav {
        ($path:expr, $sample_rate:expr, $samples:expr $(,)?) => {{
            let spec = hound::WavSpec {
                channels: 1,
                sample_rate: $sample_rate,
                bits_per_sample: 32,
                sample_format: hound::SampleFormat::Float,
            };

            let mut writer = hound::WavWriter::create($path, spec).unwrap();
            for sample in $samples {
                writer.write_sample(sample).unwrap();
            }
            writer.finalize().unwrap();
        }};
    }

    #[tokio::test]
    async fn test_kalosm_builtin_resampler() {
        let source = create_test_source();
        let resampled = source.resample(16000);
        assert_eq!(resampled.collect::<Vec<_>>().await.len(), 9906153);
    }

    #[tokio::test]
    async fn test_dynamic_old_resampler() {
        let source = create_test_source();
        let samples = ResamplerDynamicOld::new(source, 16000)
            .collect::<Vec<_>>()
            .await;

        assert_eq!(samples.len(), 2791776);
        write_wav!("dynamic_old_resampler.wav", 16000, samples.iter().copied());
    }

    #[tokio::test]
    async fn test_dynamic_new_resampler() {
        let source = create_test_source();
        let chunk_size = 1920;
        let resampler = ResamplerDynamicNew::new(source, 16000, chunk_size).unwrap();

        let chunks: Vec<_> = resampler.collect().await;
        let total_samples: usize = chunks.iter().map(|c| c.as_ref().unwrap().len()).sum();

        assert!((total_samples as i64 - 2784000).abs() < 100000);

        write_wav!(
            "dynamic_new_resampler.wav",
            16000,
            chunks.iter().flatten().flatten().copied()
        );
    }

    #[tokio::test]
    async fn test_dynamic_new_resampler_passthrough() {
        let (original_sample_rate, original_samples) = {
            let mut static_source = DynamicRateSource::new(vec![get_samples_with_rate(
                hypr_data::english_1::AUDIO_PART2_16000HZ_PATH,
            )]);

            let original_sample_rate = static_source.sample_rate();
            let original_samples = static_source.as_stream().collect::<Vec<_>>().await;

            (original_sample_rate, original_samples)
        };

        let (resampled_sample_rate, resampled_samples) = {
            let mut static_source = DynamicRateSource::new(vec![get_samples_with_rate(
                hypr_data::english_1::AUDIO_PART2_16000HZ_PATH,
            )]);

            let resampled_sample_rate = static_source.sample_rate();
            let resampled_samples = static_source.as_stream().collect::<Vec<_>>().await;

            (resampled_sample_rate, resampled_samples)
        };

        assert_eq!(resampled_sample_rate, original_sample_rate);
        assert_eq!(resampled_samples, original_samples);
    }

    #[tokio::test]
    async fn test_static_new_resampler() {
        let static_source = DynamicRateSource::new(vec![get_samples_with_rate(
            hypr_data::english_1::AUDIO_PART1_8000HZ_PATH,
        )]);

        let chunk_size = 1920;
        let resampler = ResamplerStaticNew::new(static_source, 16000, chunk_size).unwrap();

        let chunks: Vec<_> = resampler.collect().await;
        let total_samples: usize = chunks.iter().map(|c| c.as_ref().unwrap().len()).sum();

        assert!(total_samples > 0);

        write_wav!(
            "static_new_resampler.wav",
            16000,
            chunks.iter().flatten().flatten().copied()
        );
    }
}
