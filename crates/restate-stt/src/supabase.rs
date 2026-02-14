use serde::{Deserialize, Serialize};

use crate::config::Config;

#[derive(Deserialize)]
struct SignedUrlResponse {
    #[serde(alias = "signedURL")]
    signed_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StorageFile {
    pub name: String,
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Clone)]
pub struct SortBy {
    pub column: String,
    pub order: String,
}

fn base_url(config: &Config) -> String {
    config.supabase_url.trim_end_matches('/').to_string()
}

pub async fn create_signed_url(
    client: &reqwest::Client,
    config: &Config,
    object_path: &str,
    expires_in_seconds: u64,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let url = base_url(config);
    let encoded = urlencoding::encode(object_path);

    let response = client
        .post(format!(
            "{url}/storage/v1/object/sign/audio-files/{encoded}"
        ))
        .header(
            "Authorization",
            format!("Bearer {}", config.supabase_service_role_key),
        )
        .header("apikey", &config.supabase_service_role_key)
        .json(&serde_json::json!({ "expiresIn": expires_in_seconds }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to create signed URL: {status} {body}").into());
    }

    let data: SignedUrlResponse = response.json().await?;
    let signed_url = data
        .signed_url
        .ok_or("Signed URL not returned from Supabase")?;

    if signed_url.starts_with("http") {
        Ok(signed_url)
    } else {
        Ok(format!("{url}/storage/v1{signed_url}"))
    }
}

pub async fn delete_file(
    client: &reqwest::Client,
    config: &Config,
    object_path: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let url = base_url(config);
    let encoded = urlencoding::encode(object_path);

    let response = client
        .delete(format!("{url}/storage/v1/object/audio-files/{encoded}"))
        .header(
            "Authorization",
            format!("Bearer {}", config.supabase_service_role_key),
        )
        .header("apikey", &config.supabase_service_role_key)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete file: {status} {body}").into());
    }

    Ok(())
}

pub async fn delete_files(
    client: &reqwest::Client,
    config: &Config,
    object_paths: &[String],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if object_paths.is_empty() {
        return Ok(());
    }

    let url = base_url(config);

    let response = client
        .delete(format!("{url}/storage/v1/object/audio-files"))
        .header(
            "Authorization",
            format!("Bearer {}", config.supabase_service_role_key),
        )
        .header("apikey", &config.supabase_service_role_key)
        .json(&serde_json::json!({ "prefixes": object_paths }))
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to delete files: {status} {body}").into());
    }

    Ok(())
}

pub async fn list_files(
    client: &reqwest::Client,
    config: &Config,
    prefix: &str,
    limit: u64,
    offset: u64,
    sort_by: Option<&SortBy>,
) -> Result<Vec<StorageFile>, Box<dyn std::error::Error + Send + Sync>> {
    let url = base_url(config);

    let mut body = serde_json::json!({
        "prefix": prefix,
        "limit": limit,
        "offset": offset,
    });

    if let Some(sort) = sort_by {
        body["sortBy"] = serde_json::json!({
            "column": sort.column,
            "order": sort.order,
        });
    }

    let response = client
        .post(format!("{url}/storage/v1/object/list/audio-files"))
        .header(
            "Authorization",
            format!("Bearer {}", config.supabase_service_role_key),
        )
        .header("apikey", &config.supabase_service_role_key)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to list files: {status} {body}").into());
    }

    let files: Vec<StorageFile> = response.json().await?;
    Ok(files)
}

pub async fn list_all_files(
    client: &reqwest::Client,
    config: &Config,
    sort_by: Option<&SortBy>,
) -> Result<Vec<StorageFile>, Box<dyn std::error::Error + Send + Sync>> {
    let mut all_files = Vec::new();
    let mut offset = 0u64;
    let limit = 100u64;

    loop {
        let files = list_files(client, config, "", limit, offset, sort_by).await?;
        if files.is_empty() {
            break;
        }

        let batch_len = files.len() as u64;
        for file in files {
            if !file.id.is_empty() {
                all_files.push(file);
            }
        }

        if batch_len < limit {
            break;
        }
        offset += limit;
    }

    Ok(all_files)
}
