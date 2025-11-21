use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;

use hypr_audio_utils::{
    decode_vorbis_to_wav_file, encode_wav_to_vorbis_file, mix_audio_f32, VorbisEncodeSettings,
};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};

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
        let dir = args.app_dir.join(&args.session_id);
        std::fs::create_dir_all(&dir)?;

        let filename_base = "audio".to_string();
        let wav_path = dir.join(format!("{}.wav", filename_base));
        let ogg_path = dir.join(format!("{}.ogg", filename_base));

        if ogg_path.exists() {
            decode_vorbis_to_wav_file(&ogg_path, &wav_path).map_err(into_actor_err)?;
            std::fs::remove_file(&ogg_path)?;
        }

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: super::SAMPLE_RATE,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let writer = if wav_path.exists() {
            hound::WavWriter::append(&wav_path)?
        } else {
            hound::WavWriter::create(&wav_path, spec)?
        };

        let (writer_mic, writer_spk) = if is_debug_mode() {
            let mic_path = dir.join(format!("{}_mic.wav", filename_base));
            let spk_path = dir.join(format!("{}_spk.wav", filename_base));

            let mic_writer = if mic_path.exists() {
                hound::WavWriter::append(&mic_path)?
            } else {
                hound::WavWriter::create(&mic_path, spec)?
            };

            let spk_writer = if spk_path.exists() {
                hound::WavWriter::append(&spk_path)?
            } else {
                hound::WavWriter::create(&spk_path, spec)?
            };

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
                    for s in samples.iter() {
                        writer.write_sample(*s)?;
                    }
                }
                flush_if_due(st)?;
            }
            RecMsg::AudioDual(mic, spk) => {
                if let Some(ref mut writer) = st.writer {
                    let mixed = mix_audio_f32(&mic, &spk);
                    for sample in mixed {
                        writer.write_sample(sample)?;
                    }
                }

                if st.writer_mic.is_some() {
                    if let Some(ref mut writer_mic) = st.writer_mic {
                        for s in mic.iter() {
                            writer_mic.write_sample(*s)?;
                        }
                    }

                    if let Some(ref mut writer_spk) = st.writer_spk {
                        for s in spk.iter() {
                            writer_spk.write_sample(*s)?;
                        }
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
        finalize_writer(&mut st.writer)?;
        finalize_writer(&mut st.writer_mic)?;
        finalize_writer(&mut st.writer_spk)?;

        if st.wav_path.exists() {
            let temp_ogg_path = st.ogg_path.with_extension("ogg.tmp");

            match encode_wav_to_vorbis_file(
                &st.wav_path,
                &temp_ogg_path,
                VorbisEncodeSettings::default(),
            )
            .map_err(into_actor_err)
            {
                Ok(_) => {
                    std::fs::rename(&temp_ogg_path, &st.ogg_path)?;
                    std::fs::remove_file(&st.wav_path)?;
                }
                Err(e) => {
                    tracing::error!(error = ?e, "wav_to_ogg_failed_keeping_wav");
                    let _ = std::fs::remove_file(&temp_ogg_path);
                    return Err(e);
                }
            }
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
