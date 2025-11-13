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
    }

    impl DynamicRateSource {
        fn new(segments: Vec<(Vec<f32>, u32)>) -> Self {
            Self {
                segments,
                current_segment: 0,
                current_position: 0,
                poll_count: 0,
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
            if source.poll_count % 1000 == 0 {
                cx.waker().wake_by_ref();
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

    #[tokio::test]
    async fn test_kalosm_builtin_resampler() {
        let source = create_test_source();
        let resampled = source.resample(16000);
        assert_eq!(resampled.collect::<Vec<_>>().await.len(), 9896247);
    }

    #[tokio::test]
    async fn test_dynamic_old_resampler() {
        let source = create_test_source();
        let resampled = ResamplerDynamicOld::new(source, 16000);
        assert_eq!(resampled.collect::<Vec<_>>().await.len(), 2791777);
    }

    #[tokio::test]
    async fn test_dynamic_new_resampler() {
        tokio::time::timeout(std::time::Duration::from_secs(5), async {
            let source = create_test_source();
            let chunk_size = 1920;
            let resampler = ResamplerDynamicNew::new(source, 16000, chunk_size).unwrap();

            let chunks: Vec<_> = resampler.collect().await;
            let total_samples: usize = chunks.iter().map(|c| c.as_ref().unwrap().len()).sum();

            assert!((total_samples as i64 - 2784000).abs() < 100000);
        })
        .await
        .expect("Test timed out after 5 seconds");
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
    }
}
