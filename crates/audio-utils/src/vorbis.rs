use std::fs::File;
use std::io::BufReader;
use std::num::{NonZeroU32, NonZeroU8};
use std::path::Path;

use hound::{SampleFormat, WavReader, WavSpec, WavWriter};
use vorbis_rs::{VorbisBitrateManagementStrategy, VorbisDecoder, VorbisEncoderBuilder};

use crate::Error;

pub const DEFAULT_VORBIS_QUALITY: f32 = 0.7;
pub const DEFAULT_VORBIS_BLOCK_SIZE: usize = 4096;

#[derive(Clone, Copy, Debug)]
pub struct VorbisEncodeSettings {
    pub quality: f32,
    pub block_size: usize,
}

impl Default for VorbisEncodeSettings {
    fn default() -> Self {
        Self {
            quality: DEFAULT_VORBIS_QUALITY,
            block_size: DEFAULT_VORBIS_BLOCK_SIZE,
        }
    }
}

pub fn encode_vorbis_from_channels(
    channels: &[&[f32]],
    sample_rate: NonZeroU32,
    settings: VorbisEncodeSettings,
) -> Result<Vec<u8>, Error> {
    let channel_count = channels.len();
    if channel_count == 0 {
        return Err(Error::EmptyChannelSet);
    }

    let channel_count_u8 = u8::try_from(channel_count).map_err(|_| Error::TooManyChannels {
        count: channel_count,
    })?;
    let channel_count = NonZeroU8::new(channel_count_u8).ok_or(Error::EmptyChannelSet)?;

    let reference_len = channels[0].len();
    for (index, channel) in channels.iter().enumerate() {
        if channel.len() != reference_len {
            return Err(Error::ChannelDataLengthMismatch { channel: index });
        }
    }

    let mut ogg_buffer = Vec::new();
    let mut encoder = VorbisEncoderBuilder::new(sample_rate, channel_count, &mut ogg_buffer)?
        .bitrate_management_strategy(VorbisBitrateManagementStrategy::QualityVbr {
            target_quality: settings.quality,
        })
        .build()?;

    let block_size = settings.block_size.max(1);
    let mut offsets = vec![0usize; channels.len()];

    loop {
        let mut slices: Vec<&[f32]> = Vec::with_capacity(channels.len());
        let mut has_samples = false;

        for (index, channel) in channels.iter().enumerate() {
            let start = offsets[index];
            if start >= channel.len() {
                slices.push(&[]);
                continue;
            }

            let end = (start + block_size).min(channel.len());
            if end > start {
                has_samples = true;
            }

            slices.push(&channel[start..end]);
            offsets[index] = end;
        }

        if !has_samples {
            break;
        }

        encoder.encode_audio_block(&slices)?;
    }

    encoder.finish()?;
    Ok(ogg_buffer)
}

pub fn encode_vorbis_from_interleaved(
    samples: &[f32],
    channel_count: NonZeroU8,
    sample_rate: NonZeroU32,
    settings: VorbisEncodeSettings,
) -> Result<Vec<u8>, Error> {
    let channels = deinterleave(samples, channel_count.get() as usize);
    let channel_refs: Vec<&[f32]> = channels.iter().map(Vec::as_slice).collect();
    encode_vorbis_from_channels(&channel_refs, sample_rate, settings)
}

pub fn encode_vorbis_mono(
    samples: &[f32],
    sample_rate: NonZeroU32,
    settings: VorbisEncodeSettings,
) -> Result<Vec<u8>, Error> {
    encode_vorbis_from_channels(&[samples], sample_rate, settings)
}

pub fn decode_vorbis_to_wav_file(
    ogg_path: impl AsRef<Path>,
    wav_path: impl AsRef<Path>,
) -> Result<(), Error> {
    let ogg_reader = BufReader::new(File::open(ogg_path)?);
    let mut decoder = VorbisDecoder::new(ogg_reader)?;

    let wav_spec = WavSpec {
        channels: decoder.channels().get() as u16,
        sample_rate: decoder.sampling_frequency().get(),
        bits_per_sample: 32,
        sample_format: SampleFormat::Float,
    };

    let mut writer = WavWriter::create(wav_path, wav_spec)?;

    while let Some(block) = decoder.decode_audio_block()? {
        let samples = block.samples();
        if samples.is_empty() {
            continue;
        }

        let frame_count = samples[0].len();
        for (index, channel) in samples.iter().enumerate() {
            if channel.len() != frame_count {
                return Err(Error::ChannelDataLengthMismatch { channel: index });
            }
        }

        for frame in 0..frame_count {
            for channel in samples.iter() {
                writer.write_sample(channel[frame])?;
            }
        }
    }

    writer.flush()?;
    writer.finalize()?;
    Ok(())
}

pub fn encode_wav_to_vorbis_file(
    wav_path: impl AsRef<Path>,
    ogg_path: impl AsRef<Path>,
    settings: VorbisEncodeSettings,
) -> Result<(), Error> {
    let mut reader = WavReader::open(wav_path)?;
    let spec = reader.spec();

    let sample_rate =
        NonZeroU32::new(spec.sample_rate).ok_or(Error::InvalidSampleRate(spec.sample_rate))?;
    let channel_count_u8 =
        u8::try_from(spec.channels).map_err(|_| Error::UnsupportedChannelCount {
            count: spec.channels,
        })?;
    let channel_count = NonZeroU8::new(channel_count_u8).ok_or(Error::UnsupportedChannelCount {
        count: spec.channels,
    })?;

    let samples: Vec<f32> = reader.samples::<f32>().collect::<Result<_, _>>()?;
    let encoded = encode_vorbis_from_interleaved(&samples, channel_count, sample_rate, settings)?;
    std::fs::write(ogg_path, encoded)?;

    Ok(())
}

pub fn mix_down_to_mono(samples: &[f32], channels: NonZeroU8) -> Vec<f32> {
    let channel_count = channels.get() as usize;
    if channel_count <= 1 {
        return samples.to_vec();
    }

    let mut mono = Vec::with_capacity(samples.len() / channel_count);
    for frame in samples.chunks(channel_count) {
        let sum: f32 = frame.iter().copied().sum();
        mono.push(sum / frame.len() as f32);
    }
    mono
}

fn deinterleave(samples: &[f32], channels: usize) -> Vec<Vec<f32>> {
    if channels <= 1 {
        return vec![samples.to_vec()];
    }

    let mut output = vec![Vec::with_capacity(samples.len() / channels + 1); channels];
    for (index, sample) in samples.iter().enumerate() {
        output[index % channels].push(*sample);
    }
    output
}
