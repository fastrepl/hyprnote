mod local;
mod remote;
mod types;

pub use local::*;
pub use remote::*;
pub use types::*;

use futures_util::StreamExt;
use std::{
    fs::File,
    io::{BufReader, Read, Write},
    path::Path,
};

pub async fn download_file_with_callback<F: Fn(u64, u64)>(
    url: impl reqwest::IntoUrl,
    output_path: impl AsRef<Path>,
    progress_callback: F,
) -> Result<(), crate::Error> {
    let client = reqwest::Client::new();

    let res = client.get(url.into_url()?).send().await?;
    let total_size = res.content_length().unwrap_or(u64::MAX);

    if let Some(parent) = output_path.as_ref().parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut file = std::fs::File::create(output_path.as_ref())?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk)?;

        downloaded += chunk.len() as u64;
        progress_callback(downloaded, total_size);
    }

    Ok(())
}

pub fn calculate_file_checksum(path: impl AsRef<Path>) -> Result<u32, Error> {
    let file = File::open(path)?;
    let mut reader = BufReader::new(file);
    let mut hasher = crc32fast::Hasher::new();

    let mut buffer = [0; 65536]; // 64KB buffer

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            // eof
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore]
    fn test_calculate_file_checksum() {
        let files = vec![
            dirs::data_dir().unwrap().join(
                "com.hyprnote.dev/lmz/candle-whisper/main/config-tiny.json",
            ),
            dirs::data_dir().unwrap().join(
                "com.hyprnote.dev/lmz/candle-whisper/main/model-tiny-q80.gguf",
            ),
            dirs::data_dir().unwrap().join(
                "com.hyprnote.dev/lmz/candle-whisper/main/tokenizer-tiny.json",
            ),
            dirs::data_dir().unwrap().join(
                "com.hyprnote.dev/Demonthos/candle-quantized-whisper-large-v3-turbo/main/config.json",
            ),
            dirs::data_dir().unwrap().join(
                "com.hyprnote.dev/Demonthos/candle-quantized-whisper-large-v3-turbo/main/model.gguf",
            ),
            dirs::data_dir().unwrap().join(
                "com.hyprnote.dev/Demonthos/candle-quantized-whisper-large-v3-turbo/main/tokenizer.json",
            ),
            dirs::data_dir().unwrap().join("com.hyprnote.dev/llm.gguf"),
        ];

        for file in files {
            let checksum = calculate_file_checksum(&file).unwrap();
            println!("[{:?}]\n{}\n\n", file, checksum);
        }
    }
}
