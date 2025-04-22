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

pub enum DownloadProgress {
    Started,
    Progress(u64, u64),
    Finished,
}

pub async fn download_file_with_callback<F: Fn(DownloadProgress)>(
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

    progress_callback(DownloadProgress::Started);
    while let Some(item) = stream.next().await {
        let chunk = item?;
        file.write_all(&chunk)?;

        downloaded += chunk.len() as u64;
        progress_callback(DownloadProgress::Progress(downloaded, total_size));
    }

    progress_callback(DownloadProgress::Finished);

    Ok(())
}

pub fn file_size(path: impl AsRef<Path>) -> Result<u64, Error> {
    let metadata = std::fs::metadata(path.as_ref())?;
    Ok(metadata.len())
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
        let base = dirs::data_dir().unwrap().join("com.hyprnote.dev");

        let files = vec![
            base.join("ggml-tiny.en-q8_0.bin"),
            base.join("ggml-base.en-q8_0.bin"),
            base.join("ggml-small.en-q8_0.bin"),
            base.join("ggml-large-v3-turbo-q8_0.bin"),
            base.join("ggml-tiny-q8_0.bin"),
            base.join("ggml-base-q8_0.bin"),
            base.join("ggml-small-q8_0.bin"),
            base.join("llm.gguf"),
        ];

        for file in files {
            let checksum = calculate_file_checksum(&file).unwrap();
            println!("[{:?}]\n{}\n\n", file, checksum);
        }
    }

    #[test]
    #[ignore]
    fn test_file_size() {
        let base = dirs::data_dir().unwrap().join("com.hyprnote.dev");

        let files = vec![
            base.join("ggml-tiny.en-q8_0.bin"),
            base.join("ggml-base.en-q8_0.bin"),
            base.join("ggml-small.en-q8_0.bin"),
            base.join("ggml-large-v3-turbo-q8_0.bin"),
            base.join("ggml-tiny-q8_0.bin"),
            base.join("ggml-base-q8_0.bin"),
            base.join("ggml-small-q8_0.bin"),
            base.join("llm.gguf"),
        ];

        for file in files {
            let size = file_size(&file).unwrap();
            println!("[{:?}]\n{}\n\n", file, size);
        }
    }
}
