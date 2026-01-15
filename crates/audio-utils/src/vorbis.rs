use std::fs::File;
use std::io::BufReader;
use std::num::{NonZeroU8, NonZeroU32};
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
    decode_vorbis_to_wav_file_with_mode(ogg_path, wav_path, DecodeMixMode::PreserveChannels)
}

pub fn decode_vorbis_to_mono_wav_file(
    ogg_path: impl AsRef<Path>,
    wav_path: impl AsRef<Path>,
) -> Result<(), Error> {
    decode_vorbis_to_wav_file_with_mode(ogg_path, wav_path, DecodeMixMode::MixDownMono)
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

pub fn encode_wav_to_vorbis_file_dupe_mono_to_stereo(
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
    let mono = mix_down_to_mono(&samples, channel_count);
    let interleaved = interleave_stereo_f32(&mono, &mono);
    let encoded = encode_vorbis_from_interleaved(
        &interleaved,
        NonZeroU8::new(2).unwrap(),
        sample_rate,
        settings,
    )?;
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

pub fn interleave_stereo_f32(left: &[f32], right: &[f32]) -> Vec<f32> {
    let max_len = left.len().max(right.len());
    let mut output = Vec::with_capacity(max_len * 2);
    for i in 0..max_len {
        let l = left.get(i).copied().unwrap_or(0.0);
        let r = right.get(i).copied().unwrap_or(0.0);
        output.push(l);
        output.push(r);
    }
    output
}

enum DecodeMixMode {
    PreserveChannels,
    MixDownMono,
}

fn decode_vorbis_to_wav_file_with_mode(
    ogg_path: impl AsRef<Path>,
    wav_path: impl AsRef<Path>,
    mode: DecodeMixMode,
) -> Result<(), Error> {
    let ogg_reader = BufReader::new(File::open(ogg_path)?);
    let mut decoder = VorbisDecoder::new(ogg_reader)?;

    let channels = match mode {
        DecodeMixMode::PreserveChannels => decoder.channels().get() as u16,
        DecodeMixMode::MixDownMono => 1,
    };
    let wav_spec = WavSpec {
        channels,
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

        match mode {
            DecodeMixMode::PreserveChannels => {
                for frame in 0..frame_count {
                    for channel in samples.iter() {
                        writer.write_sample(channel[frame])?;
                    }
                }
            }
            DecodeMixMode::MixDownMono => {
                let channel_count = samples.len() as f32;
                for frame in 0..frame_count {
                    let sum: f32 = samples.iter().map(|channel| channel[frame]).sum();
                    writer.write_sample(sum / channel_count)?;
                }
            }
        }
    }

    writer.flush()?;
    writer.finalize()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    fn temp_path(name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        let unique = format!(
            "hyprnote_{}_{}_{}",
            name,
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        path.push(unique);
        path
    }

    fn write_mono_wav(path: &Path, samples: &[f32]) -> Result<(), Error> {
        let spec = WavSpec {
            channels: 1,
            sample_rate: 16_000,
            bits_per_sample: 32,
            sample_format: SampleFormat::Float,
        };
        let mut writer = WavWriter::create(path, spec)?;
        for sample in samples {
            writer.write_sample(*sample)?;
        }
        writer.flush()?;
        writer.finalize()?;
        Ok(())
    }

    fn write_stereo_wav(path: &Path, left: &[f32], right: &[f32]) -> Result<(), Error> {
        let spec = WavSpec {
            channels: 2,
            sample_rate: 16_000,
            bits_per_sample: 32,
            sample_format: SampleFormat::Float,
        };
        let mut writer = WavWriter::create(path, spec)?;
        let frame_count = left.len().max(right.len());
        for i in 0..frame_count {
            writer.write_sample(left.get(i).copied().unwrap_or(0.0))?;
            writer.write_sample(right.get(i).copied().unwrap_or(0.0))?;
        }
        writer.flush()?;
        writer.finalize()?;
        Ok(())
    }

    #[test]
    fn appends_to_existing_mono_wav() {
        let path = temp_path("append_mono.wav");
        let initial = [0.1, 0.2, 0.3];
        let extra = [0.4, 0.5];

        write_mono_wav(&path, &initial).unwrap();

        let mut writer = WavWriter::append(&path).unwrap();
        for sample in extra {
            writer.write_sample(sample).unwrap();
        }
        writer.flush().unwrap();
        writer.finalize().unwrap();

        let mut reader = WavReader::open(&path).unwrap();
        assert_eq!(reader.spec().channels, 1);
        let samples: Vec<f32> = reader.samples::<f32>().collect::<Result<_, _>>().unwrap();

        assert_eq!(
            samples,
            initial
                .iter()
                .chain(extra.iter())
                .copied()
                .collect::<Vec<_>>()
        );
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn encodes_mono_wav_as_stereo_ogg() {
        let wav_path = temp_path("mono_for_stereo.wav");
        let ogg_path = temp_path("stereo.ogg");
        let decoded_path = temp_path("decoded.wav");
        let samples = [0.1, -0.2, 0.3];

        write_mono_wav(&wav_path, &samples).unwrap();
        encode_wav_to_vorbis_file_dupe_mono_to_stereo(
            &wav_path,
            &ogg_path,
            VorbisEncodeSettings::default(),
        )
        .unwrap();

        decode_vorbis_to_wav_file(&ogg_path, &decoded_path).unwrap();
        let mut reader = WavReader::open(&decoded_path).unwrap();
        assert_eq!(reader.spec().channels, 2);
        let decoded: Vec<f32> = reader.samples::<f32>().collect::<Result<_, _>>().unwrap();
        assert_eq!(decoded.len(), samples.len() * 2);
        for pair in decoded.chunks_exact(2) {
            let diff = (pair[0] - pair[1]).abs();
            assert!(diff < 1e-4, "pair mismatch: {pair:?}");
        }

        let _ = std::fs::remove_file(&wav_path);
        let _ = std::fs::remove_file(&ogg_path);
        let _ = std::fs::remove_file(&decoded_path);
    }

    #[test]
    fn encodes_stereo_wav_as_duped_stereo_ogg() {
        let wav_path = temp_path("stereo_input.wav");
        let ogg_path = temp_path("stereo_duped.ogg");
        let decoded_path = temp_path("decoded_stereo.wav");

        let left = [0.2, -0.1, 0.4];
        let right = [-0.2, 0.3, -0.4];
        let expected: Vec<f32> = left
            .iter()
            .zip(right.iter())
            .map(|(l, r)| (l + r) / 2.0)
            .collect();

        write_stereo_wav(&wav_path, &left, &right).unwrap();
        encode_wav_to_vorbis_file_dupe_mono_to_stereo(
            &wav_path,
            &ogg_path,
            VorbisEncodeSettings::default(),
        )
        .unwrap();

        decode_vorbis_to_wav_file(&ogg_path, &decoded_path).unwrap();
        let mut reader = WavReader::open(&decoded_path).unwrap();
        assert_eq!(reader.spec().channels, 2);
        let decoded: Vec<f32> = reader.samples::<f32>().collect::<Result<_, _>>().unwrap();

        for (index, pair) in decoded.chunks_exact(2).enumerate() {
            let diff = (pair[0] - pair[1]).abs();
            assert!(diff < 1e-4, "pair mismatch: {pair:?}");

            let expected_sample = expected[index];
            let mean = (pair[0] + pair[1]) / 2.0;
            let delta = (mean - expected_sample).abs();
            assert!(delta < 1e-2, "sample mismatch: {mean} vs {expected_sample}");
        }

        let _ = std::fs::remove_file(&wav_path);
        let _ = std::fs::remove_file(&ogg_path);
        let _ = std::fs::remove_file(&decoded_path);
    }
}
