use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use hypr_audio_utils::{
    VorbisEncodeSettings, decode_vorbis_to_mono_wav_file,
    encode_wav_to_vorbis_file_dupe_mono_to_stereo, mix_audio_f32,
};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use tauri_plugin_fs_sync::find_session_dir;

const FLUSH_INTERVAL: std::time::Duration = std::time::Duration::from_millis(1000);

pub enum RecMsg {
    AudioSingle(Arc<[f32]>),
    AudioDual(Arc<[f32]>, Arc<[f32]>),
}

pub struct RecArgs {
    pub app_dir: PathBuf,
    pub session_id: String,
}

pub struct RecState {
    writer: Option<hound::WavWriter<BufWriter<File>>>,
    writer_mic: Option<hound::WavWriter<BufWriter<File>>>,
    writer_spk: Option<hound::WavWriter<BufWriter<File>>>,
    wav_path: PathBuf,
    ogg_path: PathBuf,
    last_flush: Instant,
}

pub struct RecorderActor;

impl RecorderActor {
    pub fn name() -> ActorName {
        "recorder_actor".into()
    }
}

#[ractor::async_trait]
impl Actor for RecorderActor {
    type Msg = RecMsg;
    type State = RecState;
    type Arguments = RecArgs;

    async fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> Result<Self::State, ActorProcessingErr> {
        let dir = find_session_dir(&args.app_dir, &args.session_id);
        std::fs::create_dir_all(&dir)?;

        let filename_base = "audio".to_string();
        let wav_path = dir.join(format!("{}.wav", filename_base));
        let ogg_path = dir.join(format!("{}.ogg", filename_base));

        if ogg_path.exists() {
            decode_vorbis_to_mono_wav_file(&ogg_path, &wav_path).map_err(into_actor_err)?;
            std::fs::remove_file(&ogg_path)?;
        }

        let writer = create_or_append_wav(&wav_path, 1)?;

        let (writer_mic, writer_spk) = if is_debug_mode() {
            let mic_path = dir.join(format!("{}_mic.wav", filename_base));
            let spk_path = dir.join(format!("{}_spk.wav", filename_base));
            let mic_writer = create_or_append_wav(&mic_path, 1)?;
            let spk_writer = create_or_append_wav(&spk_path, 1)?;

            (Some(mic_writer), Some(spk_writer))
        } else {
            (None, None)
        };

        Ok(RecState {
            writer: Some(writer),
            writer_mic,
            writer_spk,
            wav_path,
            ogg_path,
            last_flush: Instant::now(),
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            RecMsg::AudioSingle(samples) => {
                if let Some(ref mut writer) = st.writer {
                    write_samples(writer, &samples)?;
                }
                flush_if_due(st)?;
            }
            RecMsg::AudioDual(mic, spk) => {
                if let Some(ref mut writer) = st.writer {
                    let mixed = mix_audio_f32(&mic, &spk);
                    write_samples(writer, &mixed)?;
                }

                if st.writer_mic.is_some() {
                    if let Some(ref mut writer_mic) = st.writer_mic {
                        write_samples(writer_mic, &mic)?;
                    }

                    if let Some(ref mut writer_spk) = st.writer_spk {
                        write_samples(writer_spk, &spk)?;
                    }
                }

                flush_if_due(st)?;
            }
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        tracing::info!(wav_path = ?st.wav_path, ogg_path = ?st.ogg_path, "recorder_post_stop_started");

        finalize_writer(&mut st.writer)?;
        finalize_writer(&mut st.writer_mic)?;
        finalize_writer(&mut st.writer_spk)?;

        if st.wav_path.exists() {
            let temp_ogg_path = st.ogg_path.with_extension("ogg.tmp");
            tracing::info!(temp_ogg_path = ?temp_ogg_path, "starting_wav_to_ogg_encoding");

            match encode_wav_to_vorbis_file_dupe_mono_to_stereo(
                &st.wav_path,
                &temp_ogg_path,
                VorbisEncodeSettings::default(),
            ) {
                Ok(_) => {
                    tracing::info!("wav_to_ogg_encoding_succeeded");
                    std::fs::rename(&temp_ogg_path, &st.ogg_path)?;
                    std::fs::remove_file(&st.wav_path)?;
                    tracing::info!("ogg_file_created_wav_removed");
                }
                Err(e) => {
                    tracing::error!(error = ?e, "wav_to_ogg_failed_keeping_wav");
                    let _ = std::fs::remove_file(&temp_ogg_path);
                    // Keep WAV as a fallback, but don't cause an actor failure
                }
            }
        } else {
            tracing::warn!(wav_path = ?st.wav_path, "wav_file_does_not_exist_skipping_encoding");
        }

        Ok(())
    }
}

fn into_actor_err(err: hypr_audio_utils::Error) -> ActorProcessingErr {
    Box::new(err)
}

fn is_debug_mode() -> bool {
    cfg!(debug_assertions)
        || std::env::var("HYPRNOTE_DEBUG")
            .map(|v| !v.is_empty() && v != "0" && v != "false")
            .unwrap_or(false)
}

fn create_or_append_wav(
    path: &PathBuf,
    channels: u16,
) -> Result<hound::WavWriter<BufWriter<File>>, hound::Error> {
    let spec = hound::WavSpec {
        channels,
        sample_rate: super::SAMPLE_RATE,
        bits_per_sample: 32,
        sample_format: hound::SampleFormat::Float,
    };
    if path.exists() {
        hound::WavWriter::append(path)
    } else {
        hound::WavWriter::create(path, spec)
    }
}

fn write_samples(
    writer: &mut hound::WavWriter<BufWriter<File>>,
    samples: &[f32],
) -> Result<(), hound::Error> {
    for sample in samples {
        writer.write_sample(*sample)?;
    }
    Ok(())
}

fn flush_if_due(state: &mut RecState) -> Result<(), hound::Error> {
    if state.last_flush.elapsed() < FLUSH_INTERVAL {
        return Ok(());
    }
    flush_all(state)
}

fn flush_all(state: &mut RecState) -> Result<(), hound::Error> {
    if let Some(writer) = state.writer.as_mut() {
        writer.flush()?;
    }
    if let Some(writer_mic) = state.writer_mic.as_mut() {
        writer_mic.flush()?;
    }
    if let Some(writer_spk) = state.writer_spk.as_mut() {
        writer_spk.flush()?;
    }
    state.last_flush = Instant::now();
    Ok(())
}

fn finalize_writer(
    writer: &mut Option<hound::WavWriter<BufWriter<File>>>,
) -> Result<(), hound::Error> {
    if let Some(mut writer) = writer.take() {
        writer.flush()?;
        writer.finalize()?;
    }
    Ok(())
}
