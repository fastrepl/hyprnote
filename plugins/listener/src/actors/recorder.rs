use std::path::PathBuf;

use ractor::{Actor, ActorProcessingErr, ActorRef};

pub enum RecMsg {
    Mixed(Vec<f32>),
    Mic(Vec<f32>),
    Spk(Vec<f32>),
}

pub struct RecArgs {
    pub app_dir: PathBuf,
    pub session_id: String,
}
pub struct RecState {
    writer: Option<hound::WavWriter<std::io::BufWriter<std::fs::File>>>,
}
pub struct Recorder;
impl Actor for Recorder {
    type Msg = RecMsg;
    type State = RecState;
    type Arguments = RecArgs;

    fn pre_start(
        &self,
        _myself: ActorRef<Self::Msg>,
        args: Self::Arguments,
    ) -> impl std::future::Future<Output = Result<Self::State, ActorProcessingErr>> + Send {
        async move {
            let dir = args.app_dir.join(&args.session_id);
            std::fs::create_dir_all(&dir)?;
            let path = dir.join("audio.wav");
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
    }

    fn handle(
        &self,
        _myself: ActorRef<Self::Msg>,
        msg: Self::Msg,
        st: &mut Self::State,
    ) -> impl std::future::Future<Output = Result<(), ActorProcessingErr>> + Send {
        async move {
            if let RecMsg::Mixed(v) = msg {
                if let Some(ref mut writer) = st.writer {
                    for s in v {
                        writer.write_sample(s)?;
                    }
                }
            }
            Ok(())
        }
    }

    fn post_stop(
        &self,
        _myself: ActorRef<Self::Msg>,
        st: &mut Self::State,
    ) -> impl std::future::Future<Output = Result<(), ActorProcessingErr>> + Send {
        async move {
            if let Some(writer) = st.writer.take() {
                writer.finalize()?;
            }
            Ok(())
        }
    }
}
