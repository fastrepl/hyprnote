use std::{
    pin::Pin,
    task::{Context, Poll},
};

use earshot::{VoiceActivityDetector, VoiceActivityProfile};
use futures_util::Stream;
use hypr_audio_utils::f32_to_i16_samples;

pub struct ContinuousVadMaskStream<S> {
    inner: S,
    vad: VoiceActivityDetector,
    hangover_frames: usize,
    trailing_non_speech: usize,
    in_speech: bool,
}

impl<S> ContinuousVadMaskStream<S> {
    pub fn new(inner: S) -> Self {
        Self {
            inner,
            vad: VoiceActivityDetector::new(VoiceActivityProfile::QUALITY),
            hangover_frames: 3,
            trailing_non_speech: 0,
            in_speech: true,
        }
    }

    pub fn with_hangover_frames(mut self, frames: usize) -> Self {
        self.hangover_frames = frames;
        self
    }

    fn choose_optimal_frame_size(len: usize) -> usize {
        const FRAME_10MS: usize = 160;
        const FRAME_20MS: usize = 320;
        const FRAME_30MS: usize = 480;

        if len >= FRAME_30MS && len % FRAME_30MS == 0 {
            FRAME_30MS
        } else if len >= FRAME_20MS && len % FRAME_20MS == 0 {
            FRAME_20MS
        } else if len >= FRAME_10MS && len % FRAME_10MS == 0 {
            FRAME_10MS
        } else {
            let padding_30 = (FRAME_30MS - (len % FRAME_30MS)) % FRAME_30MS;
            let padding_20 = (FRAME_20MS - (len % FRAME_20MS)) % FRAME_20MS;
            let padding_10 = (FRAME_10MS - (len % FRAME_10MS)) % FRAME_10MS;

            if padding_30 <= padding_20 && padding_30 <= padding_10 {
                FRAME_30MS
            } else if padding_20 <= padding_10 {
                FRAME_20MS
            } else {
                FRAME_10MS
            }
        }
    }

    fn process_chunk(&mut self, chunk: &mut [f32]) {
        if chunk.is_empty() {
            return;
        }

        let frame_size = Self::choose_optimal_frame_size(chunk.len());

        if chunk.len() <= frame_size {
            self.process_frame(chunk, frame_size);
        } else {
            for frame in chunk.chunks_mut(frame_size) {
                self.process_frame(frame, frame_size);
            }
        }
    }

    fn process_frame(&mut self, frame: &mut [f32], frame_size: usize) {
        let mut padded = frame.to_vec();
        if padded.len() < frame_size {
            padded.resize(frame_size, 0.0);
        }

        let i16_samples = f32_to_i16_samples(&padded);

        let raw_is_speech = self.vad.predict_16khz(&i16_samples).unwrap_or(true);

        let is_speech = if raw_is_speech {
            self.in_speech = true;
            self.trailing_non_speech = 0;
            true
        } else if self.in_speech && self.trailing_non_speech < self.hangover_frames {
            self.trailing_non_speech += 1;
            true
        } else {
            self.in_speech = false;
            self.trailing_non_speech = 0;
            false
        };

        if !is_speech {
            for s in frame.iter_mut() {
                *s = 0.0;
            }
        }
    }
}

impl<S, E> Stream for ContinuousVadMaskStream<S>
where
    S: Stream<Item = Result<Vec<f32>, E>> + Unpin,
{
    type Item = Result<Vec<f32>, E>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        match Pin::new(&mut this.inner).poll_next(cx) {
            Poll::Ready(Some(Ok(mut chunk))) => {
                this.process_chunk(&mut chunk);
                Poll::Ready(Some(Ok(chunk)))
            }
            other => other,
        }
    }
}

pub trait VadMaskExt: Sized {
    fn mask_with_vad(self) -> ContinuousVadMaskStream<Self>;
}

impl<S, E> VadMaskExt for S
where
    S: Stream<Item = Result<Vec<f32>, E>> + Sized + Unpin,
{
    fn mask_with_vad(self) -> ContinuousVadMaskStream<Self> {
        ContinuousVadMaskStream::new(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::{stream, StreamExt};
    use rodio::Source;

    #[tokio::test]
    async fn dump_continuous_vad_mask_stream() {
        let input_audio = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let original_samples: Vec<f32> = input_audio.convert_samples::<f32>().collect();

        {
            let wav = hound::WavSpec {
                channels: 1,
                sample_rate: 16_000,
                bits_per_sample: 32,
                sample_format: hound::SampleFormat::Float,
            };
            let mut writer = hound::WavWriter::create("./test_vad_original.wav", wav).unwrap();
            for sample in &original_samples {
                writer.write_sample(*sample).unwrap();
            }
        }

        let chunk_size = 512;
        let chunks_iter = original_samples
            .chunks(chunk_size)
            .map(|c| Ok::<Vec<f32>, ()>(c.to_vec()));

        let base_stream = stream::iter(chunks_iter);

        let mut vad_stream = ContinuousVadMaskStream::new(base_stream);

        let mut masked_samples = Vec::new();

        while let Some(item) = vad_stream.next().await {
            match item {
                Ok(chunk) => {
                    masked_samples.extend_from_slice(&chunk);
                }
                Err(_) => {}
            }
        }

        let wav = hound::WavSpec {
            channels: 1,
            sample_rate: 16_000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        let mut writer = hound::WavWriter::create("./test_vad_masked.wav", wav).unwrap();
        for sample in masked_samples {
            writer.write_sample(sample).unwrap();
        }
    }
}
