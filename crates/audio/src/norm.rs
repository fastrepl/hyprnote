use std::pin::Pin;
use std::task::{Context, Poll};

use ebur128::{EbuR128, Mode};
use futures_util::{Stream, StreamExt};
use ringbuf::traits::{Observer, Split};
use ringbuf::{
    traits::{Consumer, Producer},
    HeapCons, HeapProd, HeapRb,
};

const CHANNELS: u32 = 1;
const TARGET_LUFS: f64 = -23.0; // Standard EBU R128 target
const TRUE_PEAK_LIMIT: f64 = -1.0; // dBTP limit
const LOOKAHEAD_MS: usize = 3000; // 3s lookahead for loudness analysis
const LIMITER_LOOKAHEAD_MS: usize = 10; // 10ms lookahead for true peak limiting

pub struct NormalizedSource<S: kalosm_sound::AsyncSource> {
    source: S,
    gain: f32,
    ebur128: EbuR128,
    buffer: Vec<f32>,
    input_buffer: HeapProd<f32>,
    output_buffer: HeapCons<f32>,
    limiter: TruePeakLimiter,
}

struct TruePeakLimiter {
    lookahead_samples: usize,
    buffer: Vec<f32>,
    gain_reduction: Vec<f32>,
    current_position: usize,
}

impl TruePeakLimiter {
    fn new(sample_rate: u32) -> Self {
        let lookahead_samples = ((sample_rate as usize * LIMITER_LOOKAHEAD_MS) / 1000).max(1);

        Self {
            lookahead_samples,
            buffer: vec![0.0; lookahead_samples],
            gain_reduction: vec![1.0; lookahead_samples],
            current_position: 0,
        }
    }

    fn process(&mut self, sample: f32, true_peak_limit: f32) -> f32 {
        // Store the sample in the buffer
        self.buffer[self.current_position] = sample;

        // Calculate gain reduction if needed
        let sample_abs = sample.abs();
        if sample_abs > true_peak_limit {
            let reduction = true_peak_limit / sample_abs;
            self.gain_reduction[self.current_position] = reduction;
        } else {
            self.gain_reduction[self.current_position] = 1.0;
        }

        // Get the output sample (from oldest position)
        let output_position = (self.current_position + 1) % self.lookahead_samples;
        let output_sample = self.buffer[output_position] * self.gain_reduction[output_position];

        // Move to next position
        self.current_position = output_position;

        output_sample
    }
}

pub trait NormalizeExt<S: kalosm_sound::AsyncSource> {
    fn normalize(self) -> NormalizedSource<S>;
}

impl<S: kalosm_sound::AsyncSource> NormalizeExt<S> for S {
    fn normalize(self) -> NormalizedSource<S> {
        let sample_rate = self.sample_rate();
        let lookahead_samples = (sample_rate as usize * LOOKAHEAD_MS) / 1000;

        let buffer = HeapRb::new(lookahead_samples * 2);
        let (prod, cons) = buffer.split();

        let ebur128 = EbuR128::new(CHANNELS, sample_rate, Mode::I | Mode::TRUE_PEAK).unwrap();

        NormalizedSource {
            source: self,
            gain: 1.0,
            ebur128,
            buffer: Vec::with_capacity(1024),
            input_buffer: prod,
            output_buffer: cons,
            limiter: TruePeakLimiter::new(sample_rate),
        }
    }
}

impl<S: kalosm_sound::AsyncSource + Unpin> Stream for NormalizedSource<S> {
    type Item = f32;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        let stream = this.source.as_stream();
        let mut stream = std::pin::pin!(stream);

        while this.output_buffer.occupied_len() < 100 {
            match stream.as_mut().poll_next(cx) {
                Poll::Ready(Some(sample)) => return Poll::Ready(Some(sample)),
                Poll::Pending => return Poll::Pending,
                Poll::Ready(None) => return Poll::Ready(None),
            }
        }

        Poll::Ready(None)
    }
}
