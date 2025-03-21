mod local;
mod remote;
mod types;

pub use local::*;
pub use remote::*;
pub use types::*;

use futures_util::StreamExt;
use std::{io::Write, path::Path};

pub async fn download_file_with_callback<F: Fn(u64, u64)>(
    url: impl reqwest::IntoUrl,
    output_path: impl AsRef<Path>,
    progress_callback: F,
) -> Result<(), crate::Error> {
    let client = reqwest::Client::new();

    let res = client.get(url.into_url()?).send().await?;
    let total_size = res.content_length().unwrap_or(std::u64::MAX);

    std::fs::create_dir_all(output_path.as_ref())?;
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
