use std::collections::VecDeque;
use std::pin::Pin;
use std::task::{Context, Poll};

use futures_util::{pin_mut, Stream};
use kalosm_sound::AsyncSource;
use rubato::{FastFixedIn, PolynomialDegree, ResampleError, Resampler, ResamplerConstructionError};

const CHANNELS: usize = 1;
const MAX_RESAMPLE_RATIO_RELATIVE: f64 = 2.0;

pub struct RubatoChunkResampler<S>
where
    S: AsyncSource + Unpin,
{
    source: S,
    target_rate: u32,
    chunk_size: usize,
    resampler: FastFixedIn<f32>,
    last_source_rate: u32,

    input_queue: VecDeque<f32>,
    channel_buffer: Vec<Vec<f32>>,
    output_buffer: Vec<Vec<f32>>,
    pending: VecDeque<f32>,
    draining: bool,
    tail_flushed: bool,
}

enum DrainOutcome {
    ReadyForRebuild,
    ProducedOutput,
}

impl<S> RubatoChunkResampler<S>
where
    S: AsyncSource + Unpin,
{
    pub fn new(
        source: S,
        target_rate: u32,
        chunk_size: usize,
    ) -> Result<Self, ResamplerConstructionError> {
        let source_rate = source.sample_rate();
        let resampler = build_resampler(source_rate, target_rate, chunk_size)?;
        let channel_buffer = resampler.input_buffer_allocate(false);
        let output_buffer = resampler.output_buffer_allocate(true);
        let pending_capacity = resampler.output_frames_max().max(chunk_size);
        Ok(Self {
            source,
            target_rate,
            chunk_size,
            resampler,
            last_source_rate: source_rate,
            input_queue: VecDeque::with_capacity(chunk_size * CHANNELS),
            channel_buffer,
            output_buffer,
            pending: VecDeque::with_capacity(pending_capacity),
            draining: false,
            tail_flushed: false,
        })
    }

    fn rebuild_resampler(&mut self, new_rate: u32) -> Result<(), ResamplerConstructionError> {
        self.resampler = build_resampler(new_rate, self.target_rate, self.chunk_size)?;
        self.last_source_rate = new_rate;
        self.channel_buffer = self.resampler.input_buffer_allocate(false);
        self.output_buffer = self.resampler.output_buffer_allocate(true);
        let desired_capacity = self.resampler.output_frames_max().max(self.chunk_size);
        if self.pending.capacity() < desired_capacity {
            self.pending
                .reserve(desired_capacity - self.pending.capacity());
        }
        self.input_queue.clear();
        self.draining = false;
        self.tail_flushed = false;
        Ok(())
    }

    fn feed_resampler(&mut self) -> Result<(), ResampleError> {
        let needed = self.resampler.input_frames_next();
        if self.input_queue.len() < needed {
            return Ok(());
        }

        self.channel_buffer[0].clear();
        self.channel_buffer[0].extend(self.input_queue.drain(..needed));

        let (_, produced) = self.resampler.process_into_buffer(
            &self.channel_buffer[..],
            &mut self.output_buffer[..],
            None,
        )?;

        self.pending
            .extend(self.output_buffer[0].iter().take(produced).copied());

        self.tail_flushed = false;
        self.channel_buffer[0].clear();
        Ok(())
    }

    fn process_partial_queue(&mut self) -> Result<(), ResampleError> {
        loop {
            let needed = self.resampler.input_frames_next();
            if self.input_queue.len() < needed {
                break;
            }
            self.feed_resampler()?;
        }

        if self.input_queue.is_empty() {
            return Ok(());
        }

        let needed = self.resampler.input_frames_next();
        let available = self.input_queue.len();
        self.channel_buffer[0].clear();
        self.channel_buffer[0].extend(self.input_queue.drain(..available));
        if available < needed {
            self.channel_buffer[0].resize(needed, 0.0);
        }

        let (_, produced) = self.resampler.process_into_buffer(
            &self.channel_buffer[..],
            &mut self.output_buffer[..],
            None,
        )?;

        self.pending
            .extend(self.output_buffer[0].iter().take(produced).copied());
        self.tail_flushed = false;
        self.channel_buffer[0].clear();
        Ok(())
    }

    fn flush_tail_once(&mut self) -> Result<bool, ResampleError> {
        let output = self.resampler.process_partial::<Vec<f32>>(None, None)?;
        self.tail_flushed = true;
        if output[0].is_empty() {
            Ok(true)
        } else {
            self.pending.extend(output[0].iter().copied());
            Ok(false)
        }
    }

    fn drain_before_rate_change(&mut self) -> Result<DrainOutcome, ResampleError> {
        if !self.input_queue.is_empty() {
            self.process_partial_queue()?;
            return Ok(DrainOutcome::ProducedOutput);
        }

        if !self.tail_flushed {
            let before = self.pending.len();
            let done = self.flush_tail_once()?;
            if self.pending.len() > before {
                return Ok(DrainOutcome::ProducedOutput);
            }
            if !done {
                return Ok(DrainOutcome::ProducedOutput);
            }
        }

        Ok(DrainOutcome::ReadyForRebuild)
    }

    fn flush_resampler(&mut self, final_block: bool) -> Result<bool, ResampleError> {
        if !final_block && !self.input_queue.is_empty() {
            self.process_partial_queue()?;
            return Ok(false);
        }
        if self.tail_flushed {
            return Ok(true);
        }

        self.flush_tail_once()
    }
}

fn build_resampler(
    from_rate: u32,
    to_rate: u32,
    chunk_size: usize,
) -> Result<FastFixedIn<f32>, ResamplerConstructionError> {
    let ratio = to_rate as f64 / from_rate as f64;
    FastFixedIn::<f32>::new(
        ratio,
        MAX_RESAMPLE_RATIO_RELATIVE,
        PolynomialDegree::Linear,
        chunk_size.max(1),
        CHANNELS,
    )
}

#[derive(Debug)]
pub enum ResamplerError {
    Resample(ResampleError),
    Construction(ResamplerConstructionError),
}

impl From<ResampleError> for ResamplerError {
    fn from(err: ResampleError) -> Self {
        Self::Resample(err)
    }
}

impl From<ResamplerConstructionError> for ResamplerError {
    fn from(err: ResamplerConstructionError) -> Self {
        Self::Construction(err)
    }
}

impl<S> Stream for RubatoChunkResampler<S>
where
    S: AsyncSource + Unpin,
{
    type Item = Result<Vec<f32>, ResamplerError>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let me = Pin::into_inner(self);

        loop {
            if me.pending.len() >= me.chunk_size {
                let chunk = me.pending.drain(..me.chunk_size).collect();
                return Poll::Ready(Some(Ok(chunk)));
            }

            if me.draining {
                match me.flush_resampler(true) {
                    Ok(true) => {
                        if me.pending.is_empty() {
                            return Poll::Ready(None);
                        }
                    }
                    Ok(false) => {}
                    Err(err) => return Poll::Ready(Some(Err(err.into()))),
                }

                if !me.pending.is_empty() {
                    let chunk = if me.pending.len() >= me.chunk_size {
                        me.pending.drain(..me.chunk_size).collect()
                    } else {
                        me.pending.drain(..).collect()
                    };
                    return Poll::Ready(Some(Ok(chunk)));
                }

                return Poll::Ready(None);
            }

            let current_rate = me.source.sample_rate();
            if current_rate != me.last_source_rate {
                match me.drain_before_rate_change() {
                    Ok(DrainOutcome::ReadyForRebuild) => {
                        if let Err(err) = me.rebuild_resampler(current_rate) {
                            return Poll::Ready(Some(Err(err.into())));
                        }
                        continue;
                    }
                    Ok(DrainOutcome::ProducedOutput) => {
                        if !me.pending.is_empty() {
                            let chunk = if me.pending.len() >= me.chunk_size {
                                me.pending.drain(..me.chunk_size).collect()
                            } else {
                                me.pending.drain(..).collect()
                            };
                            return Poll::Ready(Some(Ok(chunk)));
                        }
                        continue;
                    }
                    Err(err) => return Poll::Ready(Some(Err(err.into()))),
                }
            }

            if let Err(err) = me.feed_resampler() {
                return Poll::Ready(Some(Err(err.into())));
            }
            if me.pending.len() >= me.chunk_size {
                let chunk = me.pending.drain(..me.chunk_size).collect();
                return Poll::Ready(Some(Ok(chunk)));
            }

            let sample_poll = {
                let inner = me.source.as_stream();
                pin_mut!(inner);
                inner.poll_next(cx)
            };

            match sample_poll {
                Poll::Ready(Some(sample)) => me.input_queue.push_back(sample),
                Poll::Ready(None) => {
                    me.draining = true;
                    me.tail_flushed = false;
                    if let Err(err) = me.flush_resampler(false) {
                        return Poll::Ready(Some(Err(err.into())));
                    }
                    if !me.pending.is_empty() {
                        let chunk = me.pending.drain(..).collect();
                        return Poll::Ready(Some(Ok(chunk)));
                    }
                    return Poll::Ready(None);
                }
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}

pub trait AsyncSourceChunkResampleExt: AsyncSource + Sized + Unpin {
    fn resampled_chunks(
        self,
        target_rate: u32,
        chunk_size: usize,
    ) -> Result<RubatoChunkResampler<Self>, ResamplerConstructionError> {
        RubatoChunkResampler::new(self, target_rate, chunk_size)
    }
}

impl<T> AsyncSourceChunkResampleExt for T where T: AsyncSource + Sized + Unpin {}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::StreamExt;
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
                16000
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
            let chunk_size = 1920;
            let resampler = RubatoChunkResampler::new(source, 16000, chunk_size).unwrap();

            let chunks: Vec<_> = resampler.collect().await;

            let mut total_samples = 0;
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

            for chunk in chunks {
                let c = chunk.unwrap();
                total_samples += c.len();
                for sample in c {
                    out_wav.write_sample(sample).unwrap();
                }
            }

            assert!((total_samples as i64 - 2784000).abs() < 100000);
        }
    }
}
