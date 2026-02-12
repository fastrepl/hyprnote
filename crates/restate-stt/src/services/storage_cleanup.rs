use restate_sdk::prelude::*;
use restate_sdk::serde::Json;
use serde::{Deserialize, Serialize};

use crate::config::Config;
use crate::supabase;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupInput {
    #[serde(default = "default_cutoff_hours")]
    pub cutoff_hours: u64,
}

fn default_cutoff_hours() -> u64 {
    24
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    pub deleted_count: u64,
    pub failed_count: u64,
    pub total_scanned: u64,
    pub errors: Vec<String>,
}

#[restate_sdk::service]
pub trait StorageCleanup {
    #[name = "cleanupOldFiles"]
    async fn cleanup_old_files(
        input: Json<CleanupInput>,
    ) -> Result<Json<CleanupResult>, HandlerError>;
}

pub struct StorageCleanupImpl {
    config: &'static Config,
    client: reqwest::Client,
}

impl StorageCleanupImpl {
    pub fn new(config: &'static Config) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
}

impl StorageCleanup for StorageCleanupImpl {
    async fn cleanup_old_files(
        &self,
        ctx: Context<'_>,
        input: Json<CleanupInput>,
    ) -> Result<Json<CleanupResult>, HandlerError> {
        let input = input.into_inner();
        let cutoff_ms = input.cutoff_hours * 60 * 60 * 1000;
        let now_ms: u64 = ctx
            .run(|| async {
                Ok(std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64)
            })
            .name("get-current-time")
            .await?;
        let cutoff_time = now_ms - cutoff_ms;

        let sort_by = supabase::SortBy {
            column: "created_at".to_string(),
            order: "asc".to_string(),
        };

        let config = self.config;
        let client = self.client.clone();
        let sort = sort_by.clone();
        let Json(files): Json<Vec<supabase::StorageFile>> = ctx
            .run(|| async move {
                supabase::list_all_files(&client, config, Some(&sort))
                    .await
                    .map(Json)
                    .map_err(|e| TerminalError::new(format!("Failed to list files: {e}")).into())
            })
            .name("list-storage-files")
            .await?;

        let total_scanned = files.len() as u64;
        tracing::info!(
            total_files = total_scanned,
            cutoff_hours = input.cutoff_hours,
            "starting storage cleanup"
        );

        let mut deleted_count = 0u64;
        let mut failed_count = 0u64;
        let mut errors = Vec::new();

        let mut to_delete: Vec<String> = Vec::new();
        for file in &files {
            let file_time = chrono::DateTime::parse_from_rfc3339(&file.created_at)
                .map(|dt| dt.timestamp_millis() as u64)
                .unwrap_or(0);

            if file_time >= cutoff_time {
                break;
            }

            to_delete.push(file.name.clone());
        }

        for batch in to_delete.chunks(100) {
            let paths = batch.to_vec();
            let config = self.config;
            let client = self.client.clone();
            let batch_paths = paths.clone();
            let delete_result: Result<(), TerminalError> = ctx
                .run(|| async move {
                    supabase::delete_files(&client, config, &batch_paths)
                        .await
                        .map_err(|e| TerminalError::new(e.to_string()).into())
                })
                .name("delete-old-files-batch")
                .await;

            match delete_result {
                Ok(()) => deleted_count += paths.len() as u64,
                Err(err) => {
                    failed_count += paths.len() as u64;
                    errors.push(format!("Failed to delete batch of {}: {err}", paths.len()));
                    if errors.len() >= 10 {
                        errors.push("... (truncated, too many errors)".to_string());
                        break;
                    }
                }
            }
        }

        tracing::info!(
            deleted = deleted_count,
            failed = failed_count,
            total = total_scanned,
            "storage cleanup completed"
        );

        Ok(Json(CleanupResult {
            deleted_count,
            failed_count,
            total_scanned,
            errors,
        }))
    }
}
