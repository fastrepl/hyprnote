use std::pin::Pin;
use std::task::{Context, Poll};

use super::driver::RubatoChunkResampler;
use futures_util::{pin_mut, Stream};
use kalosm_sound::AsyncSource;
use rubato::{FastFixedIn, PolynomialDegree};

pub trait ResampleExtDynamicNew: AsyncSource + Sized + Unpin {
    fn resampled_chunks(
        self,
        target_rate: u32,
        output_chunk_size: usize,
    ) -> Result<ResamplerDynamicNew<Self>, crate::Error> {
        ResamplerDynamicNew::new(self, target_rate, output_chunk_size)
    }
}

impl<T> ResampleExtDynamicNew for T where T: AsyncSource + Sized + Unpin {}

pub struct ResamplerDynamicNew<S>
where
    S: AsyncSource + Unpin,
{
    source: S,
    target_rate: u32,
    output_chunk_size: usize,
    input_block_size: usize,
    driver: RubatoChunkResampler<FastFixedIn<f32>, 1>,
    last_source_rate: u32,
    draining: bool,
}

impl<S> ResamplerDynamicNew<S>
where
    S: AsyncSource + Unpin,
{
    pub fn new(
        source: S,
        target_rate: u32,
        output_chunk_size: usize,
    ) -> Result<Self, crate::Error> {
        let source_rate = source.sample_rate();
        let input_block_size = output_chunk_size;
        let ratio = target_rate as f64 / source_rate as f64;
        let resampler = FastFixedIn::<f32>::new(
            ratio,
            2.0,
            PolynomialDegree::Linear,
            input_block_size.max(1),
            1,
        )?;
        let driver = RubatoChunkResampler::new(resampler, output_chunk_size, input_block_size);
        Ok(Self {
            source,
            target_rate,
            output_chunk_size,
            input_block_size,
            driver,
            last_source_rate: source_rate,
            draining: false,
        })
    }

    fn rebuild_resampler(&mut self, new_rate: u32) -> Result<(), crate::Error> {
        let ratio = self.target_rate as f64 / new_rate as f64;
        let resampler = FastFixedIn::<f32>::new(
            ratio,
            2.0,
            PolynomialDegree::Linear,
            self.input_block_size.max(1),
            1,
        )?;
        self.driver
            .rebind_resampler(resampler, self.output_chunk_size, self.input_block_size);
        self.last_source_rate = new_rate;
        Ok(())
    }

    fn try_yield_chunk(&mut self) -> Option<Vec<f32>> {
        if self.driver.has_full_chunk() {
            self.driver.take_full_chunk()
        } else if self.draining && !self.driver.output_is_empty() {
            self.driver.take_all_output()
        } else {
            None
        }
    }

    fn drain_for_rate_change(&mut self) -> Result<bool, crate::Error> {
        self.driver.process_all_ready_blocks()?;
        self.driver.process_partial_block(true)?;
        Ok(self.driver.output_is_empty())
    }

    fn drain_at_eos(&mut self) -> Result<(), crate::Error> {
        self.driver.process_all_ready_blocks()?;
        self.driver.process_partial_block(true)?;
        Ok(())
    }
}

impl<S> Stream for ResamplerDynamicNew<S>
where
    S: AsyncSource + Unpin,
{
    type Item = Result<Vec<f32>, crate::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let me = Pin::into_inner(self);

        loop {
            if let Some(chunk) = me.try_yield_chunk() {
                return Poll::Ready(Some(Ok(chunk)));
            }

            if me.draining {
                return Poll::Ready(None);
            }

            let current_rate = me.source.sample_rate();
            if current_rate != me.last_source_rate {
                match me.drain_for_rate_change() {
                    Ok(true) => {
                        if let Err(err) = me.rebuild_resampler(current_rate) {
                            return Poll::Ready(Some(Err(err)));
                        }
                        continue;
                    }
                    Ok(false) => {
                        if me.driver.has_full_chunk() {
                            if let Some(chunk) = me.driver.take_full_chunk() {
                                return Poll::Ready(Some(Ok(chunk)));
                            }
                        }
                        if !me.driver.output_is_empty() {
                            if let Some(chunk) = me.driver.take_all_output() {
                                return Poll::Ready(Some(Ok(chunk)));
                            }
                        }
                        continue;
                    }
                    Err(err) => return Poll::Ready(Some(Err(err))),
                }
            }

            match me.driver.process_all_ready_blocks() {
                Ok(true) => continue,
                Ok(false) => {}
                Err(err) => return Poll::Ready(Some(Err(err))),
            }

            let sample_poll = {
                let inner = me.source.as_stream();
                pin_mut!(inner);
                inner.poll_next(cx)
            };

            match sample_poll {
                Poll::Ready(Some(sample)) => {
                    me.driver.push_sample(sample);
                }
                Poll::Ready(None) => {
                    if let Err(err) = me.drain_at_eos() {
                        return Poll::Ready(Some(Err(err)));
                    }
                    me.draining = true;
                }
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
