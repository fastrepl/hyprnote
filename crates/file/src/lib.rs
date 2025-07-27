mod local;
mod remote;
mod types;

pub use local::*;
pub use remote::*;
pub use types::*;

use {
    futures_util::StreamExt,
    reqwest::StatusCode,
    std::{
        fs::File,
        fs::OpenOptions,
        io::{BufReader, Read, Write},
        path::Path,
        sync::OnceLock,
    },
};

static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

fn get_client() -> &'static reqwest::Client {
    CLIENT.get_or_init(|| reqwest::Client::new())
}

#[derive(Debug)]
pub enum DownloadProgress {
    Started,
    Progress(u64, u64),
    Finished,
}

/// Makes a request with optional range header and returns the response.
/// This function can be used to test range request behavior.
pub async fn request_with_range(
    url: impl reqwest::IntoUrl,
    start_byte: Option<u64>,
) -> Result<reqwest::Response, crate::Error> {
    let client = get_client();
    let url = url.into_url()?;

    let mut request = client.get(url);
    if let Some(start) = start_byte {
        request = request.header("Range", format!("bytes={}-", start));
    }

    let response = request.send().await?;
    Ok(response)
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
    let url = url.into_url()?;

    if let Some(parent) = output_path.as_ref().parent() {
        std::fs::create_dir_all(parent)?;
    }

    let mut existing_size = if output_path.as_ref().exists() {
        file_size(&output_path)?
    } else {
        0
    };

    let mut res = request_with_range(
        url.clone(),
        if existing_size > 0 {
            Some(existing_size)
        } else {
            None
        },
    )
    .await?;

    if existing_size > 0 && res.status() != StatusCode::PARTIAL_CONTENT {
        std::fs::File::create(output_path.as_ref())?;
        existing_size = 0;
        res = request_with_range(url.clone(), None).await?;
    }

    let total_size = res.content_length().map(|content_length| {
        if existing_size > 0 {
            existing_size + content_length
        } else {
            content_length
        }
    });

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
        progress_callback(DownloadProgress::Progress(
            downloaded,
            total_size.unwrap_or(downloaded),
        ));
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
    async fn test_request_with_range() {
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/test-file"))
            .and(header("Range", "bytes=5-"))
            .respond_with(
                ResponseTemplate::new(206)
                    .set_body_bytes(b"CONTENT")
                    .insert_header("Content-Range", "bytes 5-11/12"),
            )
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/test-file"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(b"FULL_CONTENT")
                    .insert_header("Content-Length", "12"),
            )
            .mount(&mock_server)
            .await;

        let url = format!("{}/test-file", mock_server.uri());

        let full_response = request_with_range(&url, None).await.unwrap();
        assert_eq!(
            full_response.status().as_u16(),
            200,
            "Full request should return 200"
        );

        let range_response = request_with_range(&url, Some(5)).await.unwrap();
        assert_eq!(
            range_response.status().as_u16(),
            206,
            "Range request should return 206"
        );

        let content_range = range_response.headers().get("Content-Range").unwrap();
        assert_eq!(content_range.to_str().unwrap(), "bytes 5-11/12");
    }

    #[tokio::test]
    async fn test_download_file_with_callback_mock() {
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

        let range_response = request_with_range(&url, Some(510)).await.unwrap();
        assert_eq!(
            range_response.status().as_u16(),
            206,
            "Range request should return 206"
        );

        let result = download_file_with_callback(url.clone(), temp_path, |_| {}).await;

        assert!(result.is_ok());

        let content = std::fs::read(temp_path).unwrap();
        assert_eq!(content.len(), 1016);
        assert!(content.starts_with(b"FIRST_HALF"));
        assert!(content.ends_with(b"SECOND_HALF"));
    }

    #[tokio::test]
    async fn test_download_file_with_callback_range_validation() {
        use tempfile::NamedTempFile;
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        Mock::given(method("GET"))
            .and(path("/test-file"))
            .and(header("Range", "bytes=5-"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(b"FULL_CONTENT")
                    .insert_header("Content-Length", "12"),
            )
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/test-file"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(b"FULL_CONTENT")
                    .insert_header("Content-Length", "12"),
            )
            .mount(&mock_server)
            .await;

        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path();

        std::fs::write(temp_path, b"PARTIAL").unwrap();
        let initial_size = std::fs::metadata(temp_path).unwrap().len();
        assert_eq!(initial_size, 7);

        let url = format!("{}/test-file", mock_server.uri());

        let range_response = request_with_range(&url, Some(5)).await.unwrap();
        assert_eq!(
            range_response.status().as_u16(),
            200,
            "Server should return 200 when ignoring Range header"
        );

        let result = download_file_with_callback(url.clone(), temp_path, |_| {}).await;
        assert!(result.is_ok());

        let content = std::fs::read(temp_path).unwrap();
        assert_eq!(content, b"FULL_CONTENT");
        assert_eq!(content.len(), 12);
    }

    #[tokio::test]
    #[ignore]
    async fn test_download_file_with_callback_s3() {
        use std::sync::{Arc, Mutex};
        use tempfile::NamedTempFile;

        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path();

        let s3_url =
            "https://storage2.hyprnote.com/v0/ggerganov/whisper.cpp/main/ggml-tiny-q8_0.bin";

        let partial_content = b"PARTIAL_CONTENT".repeat(100);
        std::fs::write(temp_path, &partial_content).unwrap();

        let initial_size = std::fs::metadata(temp_path).unwrap().len();
        assert_eq!(initial_size, 1500);

        let range_response = request_with_range(s3_url, Some(initial_size))
            .await
            .unwrap();
        assert_eq!(
            range_response.status().as_u16(),
            206,
            "Server should respond with 206 for range requests"
        );

        let progress_events = Arc::new(Mutex::new(Vec::new()));
        let progress_events_clone = Arc::clone(&progress_events);

        let result = download_file_with_callback(s3_url, temp_path, |progress| {
            progress_events_clone.lock().unwrap().push(progress);
        })
        .await;

        assert!(result.is_ok());

        let file_size = std::fs::metadata(temp_path).unwrap().len();
        assert!(
            file_size > initial_size,
            "File should have grown from resume"
        );

        let events = progress_events.lock().unwrap();
        assert!(
            !events.is_empty(),
            "Progress events should have been recorded"
        );
    }
}
