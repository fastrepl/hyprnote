use clap::{builder::PossibleValuesParser, Parser};

// https://huggingface.co/ggerganov/whisper.cpp/tree/main
#[derive(Debug, Clone)]
pub enum Model {
    WhisperTiny,
    WhisperTinyEn,
    WhisperBase,
    WhisperBaseEn,
    WhisperSmall,
    WhisperSmallEn,
}

#[derive(Parser)]
pub struct PullArgs {
    #[arg(
        value_parser = PossibleValuesParser::new(&[
            "whisper-base",
            "whisper-small", 
            "whisper-medium",
            "whisper-large",
            "whisper-large-v2",
            "whisper-large-v3"
        ])
    )]
    pub model: String,
}

pub async fn handle_pull(_args: PullArgs) -> anyhow::Result<()> {
    Ok(())
}
