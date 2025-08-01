use clap::{builder::PossibleValuesParser, Parser};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub enum Model {
    WhisperBase,
    WhisperSmall,
    WhisperMedium,
    WhisperLarge,
    WhisperLargeV2,
    WhisperLargeV3,
    Custom(String),
}

impl FromStr for Model {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "whisper-base" => Ok(Model::WhisperBase),
            "whisper-small" => Ok(Model::WhisperSmall),
            "whisper-medium" => Ok(Model::WhisperMedium),
            "whisper-large" => Ok(Model::WhisperLarge),
            "whisper-large-v2" => Ok(Model::WhisperLargeV2),
            "whisper-large-v3" => Ok(Model::WhisperLargeV3),
            _ => Ok(Model::Custom(s.to_string())),
        }
    }
}

impl std::fmt::Display for Model {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Model::WhisperBase => write!(f, "whisper-base"),
            Model::WhisperSmall => write!(f, "whisper-small"),
            Model::WhisperMedium => write!(f, "whisper-medium"),
            Model::WhisperLarge => write!(f, "whisper-large"),
            Model::WhisperLargeV2 => write!(f, "whisper-large-v2"),
            Model::WhisperLargeV3 => write!(f, "whisper-large-v3"),
            Model::Custom(s) => write!(f, "{}", s),
        }
    }
}

#[derive(Parser)]
pub struct PullArgs {
    /// The model name to pull from the registry
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

pub async fn handle_pull(args: PullArgs) -> anyhow::Result<()> {
    Ok(())
}
