use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE};
use tokio::io::{AsyncReadExt, AsyncSeekExt};

pub async fn upload(
    presigned_urls: Vec<String>,
    local_path: std::path::PathBuf,
) -> Result<Vec<String>, crate::Error> {
    const CHUNK_SIZE: usize = 30 * 1024 * 1024;

    let file = tokio::fs::File::open(&local_path).await?;
    let file_size = file.metadata().await?.len() as usize;

    let mut tasks = Vec::new();
    let client = reqwest::Client::new();

    for (chunk_index, presigned_url) in presigned_urls.into_iter().enumerate() {
        let start = chunk_index * CHUNK_SIZE;
        let end = (start + CHUNK_SIZE).min(file_size);
        let length = end - start;

        let local_path = local_path.clone();
        let client = client.clone();

        let task: tokio::task::JoinHandle<Result<String, crate::Error>> =
            tokio::spawn(async move {
                let mut file = tokio::fs::File::open(&local_path).await?;
                file.seek(std::io::SeekFrom::Start(start as u64)).await?;

                let mut buffer = vec![0u8; length];
                file.read_exact(&mut buffer).await?;

                let response = client
                    .put(&presigned_url)
                    .header(CONTENT_LENGTH, length.to_string())
                    .header(
                        CONTENT_RANGE,
                        format!("bytes {}-{}/{}", start, end - 1, file_size),
                    )
                    .body(buffer)
                    .send()
                    .await?;

                if !response.status().is_success() {
                    return Err(crate::Error::UploadError(
                        response.error_for_status().unwrap_err(),
                    ));
                }

                let etag = response
                    .headers()
                    .get("ETag")
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_string();

                Ok(etag)
            });

        tasks.push(task);
    }

    let results = futures_util::future::join_all(tasks).await;
    let etags = results
        .into_iter()
        .map(|result| result.unwrap().unwrap())
        .collect::<Vec<String>>();

    Ok(etags)
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::io::Write;
    use testcontainers_modules::{minio, testcontainers::runners::AsyncRunner};

    #[tokio::test]
    async fn test_upload() {
        let container = minio::MinIO::default().start().await.unwrap();
        let port = container.get_host_port_ipv4(9000).await.unwrap();

        let admin_s3 = hypr_s3::Client::builder()
            .endpoint_url(format!("http://127.0.0.1:{}", port))
            .bucket("test")
            .credentials("minioadmin", "minioadmin")
            .build()
            .await;
        let user_s3 = admin_s3.for_user("test-user");

        let _ = admin_s3.create_bucket().await.unwrap();

        let file_key = "audio.wav";
        let mut temp_file = tempfile::NamedTempFile::new().unwrap();
        let test_data = vec![0u8; 120 * 1024 * 1024];
        temp_file.write_all(&test_data).unwrap();

        let upload_id = user_s3.create_multipart_upload(file_key).await.unwrap();
        let presigned_urls = user_s3
            .presigned_url_for_multipart_upload(file_key, &upload_id, 2)
            .await
            .unwrap();
        assert!(presigned_urls.len() == 2);

        let etags = upload(presigned_urls, temp_file.into_temp_path().to_path_buf())
            .await
            .unwrap();
        assert!(etags.len() == 2);

        // let _ = user_s3
        //     .complete_multipart_upload(file_key, &upload_id, etags)
        //     .await
        //     .unwrap();
    }
}
