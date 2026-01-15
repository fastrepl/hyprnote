use clap::Parser;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
struct VoiceSettings {
    stability: f32,
    similarity_boost: f32,
    style: f32,
    use_speaker_boost: bool,
}

impl Default for VoiceSettings {
    fn default() -> Self {
        Self {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
struct TTSRequest {
    text: String,
    model_id: String,
    voice_settings: VoiceSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct TranscriptionWord {
    start: u64,
    end: u64,
    text: String,
}

#[derive(Parser, Debug)]
#[command(name = "tts-gen")]
#[command(about = "Generate test audio using ElevenLabs TTS API")]
struct Args {
    #[arg(short, long, help = "Text to convert to speech")]
    text: String,

    #[arg(short, long, help = "Output directory for generated files")]
    output: PathBuf,

    #[arg(short, long, help = "Name prefix for output files (e.g., 'german_1')")]
    name: String,

    #[arg(
        short,
        long,
        default_value = "eleven_multilingual_v2",
        help = "ElevenLabs model ID"
    )]
    model: String,

    #[arg(
        short,
        long,
        default_value = "21m00Tcm4TlvDq8ikWAM",
        help = "Voice ID (default: Rachel)"
    )]
    voice: String,

    #[arg(
        short,
        long,
        help = "Language code for pronunciation (e.g., 'de' for German, 'ko' for Korean)"
    )]
    language: Option<String>,
}

struct ElevenLabsClient {
    client: reqwest::Client,
    api_key: String,
    base_url: String,
}

impl ElevenLabsClient {
    fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
            base_url: "https://api.elevenlabs.io/v1".to_string(),
        }
    }

    async fn text_to_speech(
        &self,
        text: &str,
        voice_id: &str,
        model_id: &str,
        language_code: Option<&str>,
    ) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut url = format!(
            "{}/text-to-speech/{}?output_format=pcm_16000",
            self.base_url, voice_id
        );

        let request = TTSRequest {
            text: text.to_string(),
            model_id: model_id.to_string(),
            voice_settings: VoiceSettings::default(),
        };

        let mut req_builder = self
            .client
            .post(&url)
            .header("xi-api-key", &self.api_key)
            .header("Content-Type", "application/json");

        let body = if let Some(lang) = language_code {
            let mut body = serde_json::to_value(&request)?;
            body["language_code"] = serde_json::Value::String(lang.to_string());
            body
        } else {
            serde_json::to_value(&request)?
        };

        let response = req_builder.json(&body).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, error_text).into());
        }

        Ok(response.bytes().await?.to_vec())
    }
}

fn pcm_to_wav(pcm_data: &[u8], sample_rate: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let samples: Vec<i16> = pcm_data
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]))
        .collect();

    let mut cursor = std::io::Cursor::new(Vec::new());
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::new(&mut cursor, spec)?;
    for sample in samples {
        writer.write_sample(sample)?;
    }
    writer.finalize()?;

    Ok(cursor.into_inner())
}

fn estimate_word_timings(text: &str, total_duration_ms: u64) -> Vec<TranscriptionWord> {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return vec![];
    }

    let total_chars: usize = words.iter().map(|w| w.len()).sum();
    let mut current_time: u64 = 0;
    let mut result = Vec::new();

    for word in words {
        let word_duration = if total_chars > 0 {
            (word.len() as u64 * total_duration_ms) / total_chars as u64
        } else {
            total_duration_ms / words.len() as u64
        };

        result.push(TranscriptionWord {
            start: current_time,
            end: current_time + word_duration,
            text: word.to_string(),
        });

        current_time += word_duration;
    }

    if let Some(last) = result.last_mut() {
        last.end = total_duration_ms;
    }

    result
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();

    let api_key = std::env::var("ELEVENLABS_API_KEY")
        .expect("ELEVENLABS_API_KEY environment variable must be set");

    println!("Generating audio for: {}", args.name);
    println!("Text: {}", args.text);
    if let Some(ref lang) = args.language {
        println!("Language: {}", lang);
    }

    let client = ElevenLabsClient::new(api_key);

    let pcm_data = client
        .text_to_speech(
            &args.text,
            &args.voice,
            &args.model,
            args.language.as_deref(),
        )
        .await?;

    println!("Received {} bytes of PCM audio", pcm_data.len());

    let wav_data = pcm_to_wav(&pcm_data, 16000)?;

    std::fs::create_dir_all(&args.output)?;

    let audio_path = args.output.join("audio.wav");
    std::fs::write(&audio_path, &wav_data)?;
    println!("Saved audio to: {}", audio_path.display());

    let duration_ms = (pcm_data.len() as u64 * 1000) / (16000 * 2);
    let transcription = estimate_word_timings(&args.text, duration_ms);

    let transcription_path = args.output.join("transcription.json");
    let transcription_json = serde_json::to_string_pretty(&transcription)?;
    std::fs::write(&transcription_path, &transcription_json)?;
    println!("Saved transcription to: {}", transcription_path.display());

    let diarization = serde_json::json!({
        "segments": [{
            "speaker": 0,
            "start": 0,
            "end": duration_ms
        }]
    });
    let diarization_path = args.output.join("diarization.json");
    std::fs::write(
        &diarization_path,
        serde_json::to_string_pretty(&diarization)?,
    )?;
    println!("Saved diarization to: {}", diarization_path.display());

    println!("Done! Audio duration: {}ms", duration_ms);

    Ok(())
}
