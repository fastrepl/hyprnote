mod local;
mod remote;
mod types;

pub use local::*;
pub use remote::*;
pub use types::*;

use futures_util::StreamExt;
use std::{
    fs::File,
    fs::OpenOptions,
    io::{BufReader, Read, Write},
    path::Path,
};

#[derive(Debug)]
pub enum DownloadProgress {
    Started,
    Progress(u64, u64),
    Finished,
}

/// Downloads a file with resume capability. If the file already exists,
/// it will resume from where it left off using HTTP Range requests.
/// This is the preferred method for downloading large files that might
/// be interrupted.
pub async fn download_file_with_callback<F: Fn(DownloadProgress)>(
    url: impl reqwest::IntoUrl,
    output_path: impl AsRef<Path>,
    progress_callback: F,
) -> Result<(), crate::Error> {
    let client = reqwest::Client::new();
    let url = url.into_url()?;

    if let Some(parent) = output_path.as_ref().parent() {
        std::fs::create_dir_all(parent)?;
    }

    let existing_size = if output_path.as_ref().exists() {
        file_size(&output_path)?
    } else {
        0
    };

    let mut request = client.get(url.clone());
    if existing_size > 0 {
        request = request.header("Range", format!("bytes={}-", existing_size));
    }

    let res = request.send().await?;
    let total_size = if let Some(content_length) = res.content_length() {
        if existing_size > 0 {
            existing_size + content_length
        } else {
            content_length
        }
    } else {
        u64::MAX
    };

    let mut file = if existing_size > 0 {
        OpenOptions::new().append(true).open(output_path.as_ref())?
    } else {
        std::fs::File::create(output_path.as_ref())?
    };

    let mut downloaded: u64 = existing_size;
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
            base.join("hypr-llm.gguf"),
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
            base.join("hypr-llm.gguf"),
        ];

        for file in files {
            let size = file_size(&file).unwrap();
            println!("[{:?}]\n{}\n\n", file, size);
        }
    }

    #[tokio::test]
    async fn test_download_resume() {
        use tempfile::NamedTempFile;
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/test-file"))
            .and(header("Range", "bytes=510-"))
            .respond_with(
                ResponseTemplate::new(206)
                    .set_body_bytes(b"SECOND_HALF".repeat(46))
                    .insert_header("Content-Range", "bytes 510-1015/1016"),
            )
            .mount(&mock_server)
            .await;

        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path();
        std::fs::write(temp_path, b"FIRST_HALF".repeat(51)).unwrap();

        let url = format!("{}/test-file", mock_server.uri());
        let result = download_file_with_callback(url.clone(), temp_path, |_| {}).await;

        assert!(result.is_ok());

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .header("Range", "bytes=510-")
            .send()
            .await
            .unwrap();
        assert_eq!(response.status().as_u16(), 206);

        let content = std::fs::read(temp_path).unwrap();
        assert_eq!(content.len(), 1016);
        assert!(content.starts_with(b"FIRST_HALF"));
        assert!(content.ends_with(b"SECOND_HALF"));
    }

    #[tokio::test]
    #[ignore]
    async fn test_s3_partial_download() {
        use tempfile::NamedTempFile;

        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path();

        let s3_url =
            "https://storage.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny-q8_0.bin";
        let range_start = 0;

        let client = reqwest::Client::new();
        let response = client
            .get(s3_url)
            .header("Range", format!("bytes={}-", range_start))
            .send()
            .await
            .unwrap();

        assert_eq!(response.status().as_u16(), 206);

        assert!(response.headers().get("Content-Range").is_some());

        let bytes = response.bytes().await.unwrap();
        std::fs::write(temp_path, &bytes).unwrap();

        let file_size = std::fs::metadata(temp_path).unwrap().len();
        assert!(file_size > 0);
    }
}
