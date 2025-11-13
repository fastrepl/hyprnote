use std::convert::TryFrom;

use bytes::{BufMut, Bytes, BytesMut};
use futures_util::{Stream, StreamExt};
use kalosm_sound::AsyncSource;

mod error;
mod resampler;
mod vorbis;

pub use error::*;
pub use resampler::*;
pub use vorbis::*;

pub use rodio::Source;

const I16_SCALE: f32 = 32768.0;

#[derive(Debug, Clone, Copy)]
pub struct AudioMetadata {
    pub sample_rate: u32,
    pub channels: u8,
}

impl<T: AsyncSource> AudioFormatExt for T {}

pub trait AudioFormatExt: AsyncSource {
    fn to_i16_le_chunks(
        self,
        sample_rate: u32,
        chunk_size: usize,
    ) -> impl Stream<Item = Bytes> + Send + Unpin
    where
        Self: Sized + Send + Unpin + 'static,
    {
        self.resample(sample_rate).chunks(chunk_size).map(|chunk| {
            let n = std::mem::size_of::<f32>() * chunk.len();

            let mut buf = BytesMut::with_capacity(n);
            for sample in chunk {
                let scaled = (sample * I16_SCALE).clamp(-I16_SCALE, I16_SCALE);
                buf.put_i16_le(scaled as i16);
            }
            buf.freeze()
        })
    }
}

pub fn i16_to_f32_samples(samples: &[i16]) -> Vec<f32> {
    samples
        .iter()
        .map(|&sample| sample as f32 / I16_SCALE)
        .collect()
}

pub fn f32_to_i16_samples(samples: &[f32]) -> Vec<i16> {
    samples
        .iter()
        .map(|&sample| {
            let scaled = (sample * I16_SCALE).clamp(-I16_SCALE, I16_SCALE);
            scaled as i16
        })
        .collect()
}

pub fn f32_to_i16_bytes<I>(samples: I) -> Bytes
where
    I: Iterator<Item = f32>,
{
    let mut buf = BytesMut::new();
    for sample in samples {
        let i16_sample = (sample * I16_SCALE).clamp(-I16_SCALE, I16_SCALE) as i16;
        buf.put_i16_le(i16_sample);
    }
    buf.freeze()
}

pub fn bytes_to_f32_samples(data: &[u8]) -> Vec<f32> {
    data.chunks_exact(2)
        .map(|chunk| {
            let sample = i16::from_le_bytes([chunk[0], chunk[1]]);
            sample as f32 / I16_SCALE
        })
        .collect()
}

pub fn source_from_path(
    path: impl AsRef<std::path::Path>,
) -> Result<rodio::Decoder<std::io::BufReader<std::fs::File>>, crate::Error> {
    let file = std::fs::File::open(path.as_ref())?;
    let decoder = rodio::Decoder::new(std::io::BufReader::new(file))?;
    Ok(decoder)
}

fn metadata_from_source<S>(source: &S) -> Result<AudioMetadata, crate::Error>
where
    S: Source,
    S::Item: rodio::Sample,
{
    let sample_rate = source.sample_rate();
    if sample_rate == 0 {
        return Err(crate::Error::InvalidSampleRate(sample_rate));
    }

    let channels_u16 = source.channels();
    if channels_u16 == 0 {
        return Err(crate::Error::UnsupportedChannelCount {
            count: channels_u16,
        });
    }
    let channels =
        u8::try_from(channels_u16).map_err(|_| crate::Error::UnsupportedChannelCount {
            count: channels_u16,
        })?;

    Ok(AudioMetadata {
        sample_rate,
        channels,
    })
}

pub fn audio_file_metadata(
    path: impl AsRef<std::path::Path>,
) -> Result<AudioMetadata, crate::Error> {
    let source = source_from_path(path)?;
    metadata_from_source(&source)
}

pub fn resample_audio<S, T>(source: S, to_rate: u32) -> Result<Vec<f32>, crate::Error>
where
    S: rodio::Source<Item = T> + Iterator<Item = T>,
    T: rodio::Sample,
{
    use rubato::{
        Resampler, SincFixedIn, SincInterpolationParameters, SincInterpolationType, WindowFunction,
    };

    let from_rate = source.sample_rate() as f64;
    let channels = source.channels() as usize;
    let to_rate_f64 = to_rate as f64;

    let samples: Vec<f32> = source.map(|sample| sample.to_f32()).collect();

    if (from_rate - to_rate_f64).abs() < 1.0 {
        return Ok(samples);
    }

    let params = SincInterpolationParameters {
        sinc_len: 256,
        f_cutoff: 0.95,
        interpolation: SincInterpolationType::Linear,
        oversampling_factor: 256,
        window: WindowFunction::BlackmanHarris2,
    };

    let mut resampler =
        SincFixedIn::<f32>::new(to_rate_f64 / from_rate, 2.0, params, 1024, channels)?;

    let frames_per_channel = samples.len() / channels;
    let mut input_channels: Vec<Vec<f32>> = vec![Vec::with_capacity(frames_per_channel); channels];

    for (i, &sample) in samples.iter().enumerate() {
        input_channels[i % channels].push(sample);
    }

    let output_channels = resampler.process(&input_channels, None)?;

    let mut output = Vec::new();
    let output_frames = output_channels[0].len();

    for frame in 0..output_frames {
        for ch in 0..channels {
            output.push(output_channels[ch][frame]);
        }
    }

    Ok(output)
}

#[derive(Debug)]
pub struct ChunkedAudio {
    pub chunks: Vec<Bytes>,
    pub sample_count: usize,
    pub frame_count: usize,
    pub metadata: AudioMetadata,
}

pub fn chunk_audio_file(
    path: impl AsRef<std::path::Path>,
    chunk_ms: u64,
) -> Result<ChunkedAudio, crate::Error> {
    let source = source_from_path(path)?;
    let metadata = metadata_from_source(&source)?;
    let samples = resample_audio(source, metadata.sample_rate)?;

    if samples.is_empty() {
        return Ok(ChunkedAudio {
            chunks: Vec::new(),
            sample_count: 0,
            frame_count: 0,
            metadata,
        });
    }

    let channels = metadata.channels.max(1) as usize;
    let frames_per_chunk = {
        let frames = ((chunk_ms as u128).saturating_mul(metadata.sample_rate as u128) + 999) / 1000;
        frames.max(1).min(usize::MAX as u128) as usize
    };
    let samples_per_chunk = frames_per_chunk
        .saturating_mul(channels)
        .max(1)
        .min(usize::MAX);

    let sample_count = samples.len();
    let frame_count = sample_count / channels;
    let chunks = samples
        .chunks(samples_per_chunk)
        .map(|chunk| f32_to_i16_bytes(chunk.iter().copied()))
        .collect();

    Ok(ChunkedAudio {
        chunks,
        sample_count,
        frame_count,
        metadata,
    })
}
