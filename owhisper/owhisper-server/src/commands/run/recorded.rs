use tokio::io::AsyncReadExt;

pub enum AudioSource {
    File(String),
    Stdin,
}

pub async fn handle_recorded_input(
    source: AudioSource,
    model: String,
    port: u16,
    api_key: Option<String>,
) -> anyhow::Result<()> {
    let audio_data = match source {
        AudioSource::File(path) => tokio::fs::read(&path).await?,
        AudioSource::Stdin => {
            let mut buffer = Vec::new();
            let mut stdin = tokio::io::stdin();
            stdin.read_to_end(&mut buffer).await?;
            buffer
        }
    };

    process_audio_bytes(audio_data, model, port, api_key).await
}

async fn process_audio_bytes(
    audio_data: Vec<u8>,
    model: String,
    _port: u16,
    _api_key: Option<String>,
) -> anyhow::Result<()> {
    println!(
        "Processing {} bytes of audio with model: {}",
        audio_data.len(),
        model
    );
    Ok(())
}
