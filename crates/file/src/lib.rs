mod local;
mod remote;
mod types;

pub use local::*;
pub use remote::*;
pub use types::*;

use {
    crate::Error::OtherError,
    futures_util::{stream::FuturesUnordered, StreamExt, TryStreamExt},
    reqwest::StatusCode,
    std::{
        cmp::min,
        fs::File,
        fs::OpenOptions,
        io::{BufReader, Read, Seek, SeekFrom, Write},
        path::Path,
        sync::{Arc, Mutex, OnceLock},
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
) -> Result<reqwest::Response, Error> {
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

    let total_size = get_content_length_from_headers(&res).map(|content_length| {
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

fn process_task_result(
    result: Result<(u64, Vec<u8>), Error>,
    file: &mut File,
) -> Result<(), Error> {
    match result {
        Ok((offset, data)) => {
            file.seek(SeekFrom::Start(offset))?;
            file.write_all(&data)?;
            Ok(())
        }
        Err(e) => Err(e),
    }
}

const DEFAULT_CHUNK_SIZE: u64 = 8 * 1024 * 1024;
const MAX_CONCURRENT_CHUNKS: usize = 8;

pub async fn download_file_parallel<F: Fn(DownloadProgress) + Send + Sync>(
    url: impl reqwest::IntoUrl,
    output_path: impl AsRef<Path>,
    progress_callback: F,
) -> Result<(), Error> {
    let url = url.into_url()?;
    let progress_callback = Arc::new(progress_callback);

    if let Some(parent) = output_path.as_ref().parent() {
        std::fs::create_dir_all(parent)?;
    }

    let head_response = get_client().head(url.clone()).send().await?;
    let total_size = get_content_length_from_headers(&head_response)
        .ok_or_else(|| OtherError("Content-Length header missing".to_string()))?;

    let supports_ranges = head_response
        .headers()
        .get("accept-ranges")
        .map(|v| v.to_str().unwrap_or(""))
        .unwrap_or("")
        == "bytes";

    if !supports_ranges || total_size <= DEFAULT_CHUNK_SIZE {
        return download_file_with_callback(url, output_path, move |progress| {
            progress_callback(progress)
        })
        .await;
    }

    let existing_size = if output_path.as_ref().exists() {
        file_size(&output_path)?
    } else {
        0
    };

    if existing_size >= total_size {
        progress_callback(DownloadProgress::Finished);

        return Ok(());
    }

    let remaining_size = total_size - existing_size;
    let chunk_size = min(
        DEFAULT_CHUNK_SIZE,
        remaining_size / MAX_CONCURRENT_CHUNKS as u64,
    )
    .max(1024 * 1024);
    let num_chunks = (remaining_size + chunk_size - 1) / chunk_size;

    let mut file = if existing_size > 0 {
        OpenOptions::new().write(true).open(output_path.as_ref())?
    } else {
        File::create(output_path.as_ref())?
    };

    let downloaded = Arc::new(Mutex::new(existing_size));
    let mut tasks = FuturesUnordered::new();

    progress_callback(DownloadProgress::Started);

    for chunk_idx in 0..num_chunks {
        let start = existing_size + chunk_idx * chunk_size;
        let end = min(start + chunk_size - 1, total_size - 1);

        let url_clone = url.clone();
        let downloaded_clone = Arc::clone(&downloaded);
        let progress_callback_clone = Arc::clone(&progress_callback);

        let task = async move {
            let client = get_client();
            let range_header = format!("bytes={}-{}", start, end);

            let response = client
                .get(url_clone)
                .header("Range", range_header)
                .send()
                .await?;

            if response.status() != StatusCode::PARTIAL_CONTENT {
                return Err(OtherError(format!(
                    "Server does not support range requests. Got status: {}",
                    response.status()
                )));
            }
            let mut bytes = Vec::new();
            let mut stream = response.bytes_stream();

            while let Some(chunk) = stream.try_next().await? {
                bytes.extend_from_slice(&chunk);

                let mut downloaded_guard = downloaded_clone.lock().unwrap();
                *downloaded_guard += chunk.len() as u64;
                let current_downloaded = *downloaded_guard;
                drop(downloaded_guard);

                progress_callback_clone(DownloadProgress::Progress(current_downloaded, total_size));
            }
            Ok((start, bytes))
        };

        tasks.push(task);

        if tasks.len() >= MAX_CONCURRENT_CHUNKS {
            if let Some(result) = tasks.next().await {
                process_task_result(result, &mut file)?;
            }
        }
    }

    while let Some(result) = tasks.next().await {
        process_task_result(result, &mut file)?;
    }

    file.flush()?;
    progress_callback(DownloadProgress::Finished);

    Ok(())
}

pub fn file_size(path: impl AsRef<Path>) -> Result<u64, Error> {
    let metadata = std::fs::metadata(path.as_ref())?;
    Ok(metadata.len())
}

/// Manually parse content-length header from HTTP response
/// This is a workaround for cases where reqwest's content_length() method returns incorrect values
fn get_content_length_from_headers(response: &reqwest::Response) -> Option<u64> {
    response
        .headers()
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
        .or_else(|| response.content_length())
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

    #[tokio::test]
    #[ignore]
    async fn test_download_file_parallel_mock() {
        use std::time::Instant;
        use tempfile::NamedTempFile;
        use wiremock::matchers::{header, method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let mock_server = MockServer::start().await;

        let large_content = vec![0u8; 1024 * 1024 * 1024];
        let content_length = large_content.len();

        Mock::given(method("HEAD"))
            .and(path("/large-file"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("Content-Length", content_length.to_string().as_str())
                    .insert_header("Accept-Ranges", "bytes"),
            )
            .mount(&mock_server)
            .await;

        let expected_chunk_size = DEFAULT_CHUNK_SIZE as usize;

        for chunk_start in (0..content_length).step_by(expected_chunk_size) {
            let chunk_end =
                std::cmp::min(chunk_start + expected_chunk_size - 1, content_length - 1);
            let chunk_data = large_content[chunk_start..=chunk_end].to_vec();
            let range_header = format!("bytes={}-{}", chunk_start, chunk_end);
            let content_range = format!("bytes {}-{}/{}", chunk_start, chunk_end, content_length);

            Mock::given(method("GET"))
                .and(path("/large-file"))
                .and(header("Range", range_header.as_str()))
                .respond_with(
                    ResponseTemplate::new(206)
                        .set_body_bytes(chunk_data)
                        .insert_header("Content-Range", content_range.as_str()),
                )
                .mount(&mock_server)
                .await;
        }

        Mock::given(method("GET"))
            .and(path("/large-file"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_bytes(large_content.clone())
                    .insert_header("Content-Length", content_length.to_string().as_str()),
            )
            .expect(1)
            .mount(&mock_server)
            .await;

        let url = format!("{}/large-file", mock_server.uri());

        let test_client = reqwest::Client::builder().http1_only().build().unwrap();

        let head_response = test_client
            .head(&url)
            .header("User-Agent", "curl/8.14.1")
            .header("Accept", "*/*")
            .send()
            .await
            .unwrap();

        let file_size = get_content_length_from_headers(&head_response).unwrap_or(0);

        let supports_ranges = head_response
            .headers()
            .get("accept-ranges")
            .map(|v| v.to_str().unwrap_or(""))
            .unwrap_or("")
            == "bytes";
        assert!(file_size > 0, "File size should be greater than 0");

        println!(
            "Server supports ranges: {}, File size: {} MB",
            supports_ranges,
            file_size / 1024 / 1024
        );

        let temp_file1 = NamedTempFile::new().unwrap();
        let start = Instant::now();
        download_file_with_callback(&url, temp_file1.path(), |_| {})
            .await
            .unwrap();
        let serial_duration = start.elapsed();

        let temp_file2 = NamedTempFile::new().unwrap();
        let start = Instant::now();
        download_file_parallel(&url, temp_file2.path(), |_| {})
            .await
            .unwrap();
        let parallel_duration = start.elapsed();

        println!(
            "Serial: {:?}, Parallel: {:?}",
            serial_duration, parallel_duration
        );
        let speedup = serial_duration.as_secs_f64() / parallel_duration.as_secs_f64();
        println!("Speedup: {:.2}x", speedup);

        let serial_size = std::fs::metadata(temp_file1.path()).unwrap().len();
        let parallel_size = std::fs::metadata(temp_file2.path()).unwrap().len();
        assert_eq!(
            serial_size, parallel_size,
            "Both downloads should produce files of the same size"
        );
        assert_eq!(
            serial_size, content_length as u64,
            "Downloaded file should match expected size"
        );

        assert!(speedup >= 1.1, "Parallel download should be at least 10% faster: serial={:?}, parallel={:?}, speedup={:.2}x", serial_duration, parallel_duration, speedup);
    }

    #[tokio::test]
    #[ignore]
    async fn test_download_file_parallel_s3() {
        use std::time::Instant;
        use tempfile::NamedTempFile;

        let url = "https://storage2.hyprnote.com/v0/yujonglee/hypr-llm-sm/model_q4_k_m.gguf";
        let test_client = reqwest::Client::builder().http1_only().build().unwrap();

        let head_response = test_client
            .head(url)
            .header("User-Agent", "curl/8.14.1")
            .header("Accept", "*/*")
            .send()
            .await
            .unwrap();

        let file_size = get_content_length_from_headers(&head_response).unwrap_or(0);

        let supports_ranges = head_response
            .headers()
            .get("accept-ranges")
            .map(|v| v.to_str().unwrap_or(""))
            .unwrap_or("")
            == "bytes";
        assert!(file_size > 0, "File size should be greater than 0");

        println!(
            "Server supports ranges: {}, File size: {} MB",
            supports_ranges,
            file_size / 1024 / 1024
        );

        let temp_file1 = NamedTempFile::new().unwrap();
        let start = Instant::now();
        download_file_with_callback(url, temp_file1.path(), {
            use std::cell::RefCell;
            let last_percent = RefCell::new(0u8);
            move |progress| match progress {
                DownloadProgress::Started => println!("Serial download started"),
                DownloadProgress::Progress(downloaded, total) => {
                    let percent = (downloaded as f64 / total as f64 * 100.0) as u8;
                    let mut last = last_percent.borrow_mut();
                    if percent >= *last + 10 {
                        println!(
                            "Serial download: {}% ({}/{} bytes)",
                            percent, downloaded, total
                        );
                        *last = percent;
                    }
                }
                DownloadProgress::Finished => println!("Serial download finished"),
            }
        })
        .await
        .unwrap();
        let serial_duration = start.elapsed();

        let temp_file2 = NamedTempFile::new().unwrap();
        let start = Instant::now();
        download_file_parallel(url, temp_file2.path(), {
            use std::sync::{Arc, Mutex};
            let last_percent = Arc::new(Mutex::new(0u8));
            move |progress| match progress {
                DownloadProgress::Started => println!("Parallel download started"),
                DownloadProgress::Progress(downloaded, total) => {
                    let percent = (downloaded as f64 / total as f64 * 100.0) as u8;
                    let mut last = last_percent.lock().unwrap();
                    if percent >= *last + 10 {
                        println!(
                            "Parallel download: {}% ({}/{} bytes)",
                            percent, downloaded, total
                        );
                        *last = percent;
                    }
                }
                DownloadProgress::Finished => println!("Parallel download finished"),
            }
        })
        .await
        .unwrap();
        let parallel_duration = start.elapsed();

        println!(
            "Serial: {:?}, Parallel: {:?}",
            serial_duration, parallel_duration
        );
        let speedup = serial_duration.as_secs_f64() / parallel_duration.as_secs_f64();
        println!("Speedup: {:.2}x", speedup);

        let serial_size = std::fs::metadata(temp_file1.path()).unwrap().len();
        let parallel_size = std::fs::metadata(temp_file2.path()).unwrap().len();
        assert_eq!(
            serial_size, parallel_size,
            "Both downloads should produce files of the same size"
        );

        assert!(speedup >= 1.1, "Parallel download should be at least 10% faster: serial={:?}, parallel={:?}, speedup={:.2}x", serial_duration, parallel_duration, speedup);
    }
}
