use std::fs::File;
use std::io::{BufReader, BufWriter};
use std::num::{NonZeroU32, NonZeroU8};
use std::path::PathBuf;

use ractor::{Actor, ActorName, ActorProcessingErr, ActorRef};
use vorbis_rs::{VorbisBitrateManagementStrategy, VorbisDecoder, VorbisEncoderBuilder};

pub enum RecMsg {
    Audio(Vec<f32>),
}

pub struct RecArgs {
    pub app_dir: PathBuf,
    pub session_id: String,
}

pub struct RecState {
    writer: Option<hound::WavWriter<BufWriter<File>>>,
    wav_path: PathBuf,
    ogg_path: PathBuf,
}

pub struct RecorderActor;

impl RecorderActor {
    pub fn name() -> ActorName {
        "recorder_actor".into()
    }

    async fn ogg_to_wav(ogg_path: &PathBuf, wav_path: &PathBuf) -> Result<(), ActorProcessingErr> {
        let ogg_file = BufReader::new(File::open(ogg_path)?);
        let mut decoder = VorbisDecoder::new(ogg_file)?;

        let spec = hound::WavSpec {
            channels: decoder.channels().get() as u16,
            sample_rate: decoder.sampling_frequency().get(),
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut wav_writer = hound::WavWriter::create(wav_path, spec)?;

        while let Some(block) = decoder.decode_audio_block()? {
            let samples = block.samples();
            if samples.len() > 0 {
                for sample in samples[0] {
                    wav_writer.write_sample(*sample)?;
                }
            }
        }

        wav_writer.finalize()?;
        Ok(())
    }

    async fn wav_to_ogg(wav_path: &PathBuf, ogg_path: &PathBuf) -> Result<(), ActorProcessingErr> {
        let wav_reader = hound::WavReader::open(wav_path)?;
        let spec = wav_reader.spec();

        let samples = wav_reader
            .into_samples::<f32>()
            .collect::<Result<Vec<_>, _>>()?;

        let mut ogg_buffer = Vec::new();
        let mut encoder = VorbisEncoderBuilder::new(
            NonZeroU32::new(spec.sample_rate).unwrap(),
            NonZeroU8::new(spec.channels as u8).unwrap(),
            &mut ogg_buffer,
        )
        .unwrap()
        .bitrate_management_strategy(VorbisBitrateManagementStrategy::QualityVbr {
            target_quality: 0.7,
        })
        .build()?;

        const BLOCK_SIZE: usize = 4096;
        let channel_data = vec![samples];

        for chunk in channel_data[0].chunks(BLOCK_SIZE) {
            encoder.encode_audio_block(&[chunk])?;
        }

        encoder.finish()?;

        std::fs::write(ogg_path, ogg_buffer)?;

        Ok(())
    }
}

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
            Self::ogg_to_wav(&ogg_path, &wav_path).await?;
            std::fs::remove_file(&ogg_path)?;
        }

        let spec = hound::WavSpec {
            channels: 1,
            sample_rate: 16000,
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let writer = if wav_path.exists() {
            hound::WavWriter::append(&wav_path)?
        } else {
            hound::WavWriter::create(&wav_path, spec)?
        };

        Ok(RecState {
            writer: Some(writer),
            wav_path,
            ogg_path,
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

        if st.wav_path.exists() {
            Self::wav_to_ogg(&st.wav_path, &st.ogg_path).await?;
            std::fs::remove_file(&st.wav_path)?;
        }

        Ok(())
    }
}
