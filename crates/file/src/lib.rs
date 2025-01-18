use reqwest::header::{CONTENT_LENGTH, CONTENT_RANGE};
use tokio::io::{AsyncReadExt, AsyncSeekExt};

pub async fn upload(
    presigned_urls: Vec<String>,
    local_path: std::path::PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
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

        let task = tokio::spawn(async move {
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
                return Err(format!("Upload failed with status: {}", response.status()).into());
            }

            Ok::<_, Box<dyn std::error::Error + Send + Sync>>(())
        });

        tasks.push(task);
    }

    let results = futures_util::future::join_all(tasks).await;
    for result in results {
        let _ = result?;
    }

    Ok(())
}
