use std::path::PathBuf;

use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};

pub enum RecMsg {
    Audio(Vec<f32>),
}

pub struct RecArgs {
    pub app_dir: PathBuf,
    pub session_id: String,
    pub file_suffix: Option<String>,
}

pub struct RecState {
    writer: Option<hound::WavWriter<std::io::BufWriter<std::fs::File>>>,
}

pub struct Recorder;

impl Recorder {
    pub fn name() -> ActorName {
        "recorder".into()
    }
}

impl Actor for Recorder {
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

        let filename = if let Some(suffix) = args.file_suffix {
            format!("audio{}.wav", suffix)
        } else {
            "audio.wav".to_string()
        };

        let path = dir.join(filename);
        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };
        let writer = if path.exists() {
            hound::WavWriter::append(path)?
        } else {
            hound::WavWriter::create(path, spec)?
        };
        Ok(RecState {
            writer: Some(writer),
        })
    }

    async fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        match msg {
            RecMsg::Audio(v) => {
                if let Some(ref mut writer) = st.writer {
                    for s in v {
                        writer.write_sample(s)?;
                    }
                }
            }
        }

        Ok(())
    }

    async fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> Result<(), ActorProcessingErr> {
        if let Some(writer) = st.writer.take() {
            writer.finalize()?;
        }

        Ok(())
    }
}
