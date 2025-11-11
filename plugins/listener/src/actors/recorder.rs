use std::fs::File;
use std::io::BufWriter;
use std::path::PathBuf;
use std::pin::Pin;
use std::time::Instant;

use hypr_audio::ResampledAsyncSource;
use hypr_audio_utils::{
    decode_vorbis_to_wav_file, drain_stream, encode_wav_to_vorbis_file, PushSource,
    PushSourceHandle, VorbisEncodeSettings,
};
use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};

const FLUSH_INTERVAL: std::time::Duration = std::time::Duration::from_millis(1000);
const TARGET_SAMPLE_RATE_HZ: u32 = 16_000;

pub enum RecMsg {
    Audio { samples: Vec<f32>, sample_rate: u32 },
}

pub struct RecArgs {
    pub app_dir: PathBuf,
    pub session_id: String,
}

pub struct RecState {
    writer: Option<hound::WavWriter<BufWriter<File>>>,
    wav_path: PathBuf,
    ogg_path: PathBuf,
    last_flush: Instant,
    resampler: ResampledAsyncSource<PushSource>,
    input_handle: PushSourceHandle,
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
            sample_rate: TARGET_SAMPLE_RATE_HZ,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let writer = if wav_path.exists() {
            hound::WavWriter::append(&wav_path)?
        } else {
            hound::WavWriter::create(&wav_path, spec)?
        };

        let (source, input_handle) = PushSource::new(TARGET_SAMPLE_RATE_HZ);
        let resampler = ResampledAsyncSource::new(source, TARGET_SAMPLE_RATE_HZ);

        Ok(RecState {
            writer: Some(writer),
            wav_path,
            ogg_path,
            last_flush: Instant::now(),
            resampler,
            input_handle,
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            RecMsg::Audio {
                samples,
                sample_rate,
            } => {
                st.push_samples(samples, sample_rate)?;
            }
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        st.input_handle.close();
        st.drain_resampler()?;

        if let Some(mut writer) = st.writer.take() {
            writer.flush()?;
            writer.finalize()?;
        }

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

impl RecState {
    fn push_samples(
        &mut self,
        samples: Vec<f32>,
        sample_rate: u32,
    ) -> Result<(), ActorProcessingErr> {
        if samples.is_empty() || sample_rate == 0 {
            return Ok(());
        }

        self.input_handle.push(samples, sample_rate);
        self.drain_resampler()
    }

    fn drain_resampler(&mut self) -> Result<(), ActorProcessingErr> {
        let writer = match self.writer.as_mut() {
            Some(writer) => writer,
            None => return Ok(()),
        };

        let progress = drain_stream(Pin::new(&mut self.resampler), |sample| {
            writer
                .write_sample(sample)
                .map_err(|err| Box::new(err) as ActorProcessingErr)
        })?;

        if progress.processed && self.last_flush.elapsed() >= FLUSH_INTERVAL {
            writer.flush()?;
            self.last_flush = Instant::now();
        }

        Ok(())
    }
}
