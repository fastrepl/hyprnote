use std::fs::{copy, remove_file, rename, write, File};
use std::io::{BufReader, ErrorKind};
use std::num::{NonZeroU32, NonZeroU8};
use std::path::{Path, PathBuf};

use hypr_audio_utils::{
    encode_vorbis_mono, mix_down_to_mono, resample_audio, Source, VorbisEncodeSettings,
};

use crate::error::AudioProcessingError;

const TARGET_SAMPLE_RATE_HZ: u32 = 16_000;

pub fn import_audio(
    source_path: &Path,
    tmp_path: &Path,
    target_path: &Path,
) -> Result<PathBuf, AudioProcessingError> {
    let reader = BufReader::new(File::open(source_path)?);
    let decoder = rodio::Decoder::new(reader)?;
    let channel_count_raw = decoder.channels().max(1);
    let channel_count_u8 = u8::try_from(channel_count_raw).map_err(|_| {
        AudioProcessingError::UnsupportedChannelCount {
            count: channel_count_raw,
        }
    })?;
    let channel_count =
        NonZeroU8::new(channel_count_u8).ok_or(AudioProcessingError::InvalidChannelCount)?;

    let samples = resample_audio(decoder, TARGET_SAMPLE_RATE_HZ)?;
    let mono_samples = if channel_count.get() > 1 {
        mix_down_to_mono(&samples, channel_count)
    } else {
        samples
    };

    if mono_samples.is_empty() {
        return Err(AudioProcessingError::EmptyInput);
    }

    let target_sample_rate = NonZeroU32::new(TARGET_SAMPLE_RATE_HZ)
        .ok_or(AudioProcessingError::InvalidTargetSampleRate)?;

    let ogg_buffer = encode_vorbis_mono(
        &mono_samples,
        target_sample_rate,
        VorbisEncodeSettings::default(),
    )?;

    write(tmp_path, &ogg_buffer)?;

    match rename(tmp_path, target_path) {
        Ok(()) => {}
        Err(err) => {
            #[cfg(unix)]
            let is_cross_device = err.raw_os_error() == Some(18);
            #[cfg(not(unix))]
            let is_cross_device = false;

            if is_cross_device {
                copy(tmp_path, target_path)?;
                remove_file(tmp_path)?;
            } else if err.kind() == ErrorKind::AlreadyExists {
                remove_file(target_path)?;
                match rename(tmp_path, target_path) {
                    Ok(()) => {}
                    Err(rename_err) => {
                        #[cfg(unix)]
                        let is_cross_device_retry = rename_err.raw_os_error() == Some(18);
                        #[cfg(not(unix))]
                        let is_cross_device_retry = false;

                        if is_cross_device_retry {
                            copy(tmp_path, target_path)?;
                            remove_file(tmp_path)?;
                        } else {
                            return Err(rename_err.into());
                        }
                    }
                }
            } else {
                return Err(err.into());
            }
        }
    }

    Ok(target_path.to_path_buf())
}
