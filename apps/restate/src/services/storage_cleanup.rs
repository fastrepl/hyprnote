use restate_sdk::prelude::*;
use restate_sdk::serde::Json;
use serde::{Deserialize, Serialize};

use crate::env::Env;
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
    env: &'static Env,
    client: reqwest::Client,
}

impl StorageCleanupImpl {
    pub fn new(env: &'static Env) -> Self {
        Self {
            env,
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
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let cutoff_time = now_ms - cutoff_ms;

        let env = self.env;
        let client = self.client.clone();
        let Json(files): Json<Vec<supabase::StorageFile>> = ctx
            .run(|| async move {
                supabase::list_all_files(&client, env)
                    .await
                    .map(Json)
                    .map_err(|e| TerminalError::new(format!("Failed to list files: {e}")).into())
            })
            .await?;

        let total_scanned = files.len() as u64;
        let mut deleted_count = 0u64;
        let mut failed_count = 0u64;
        let mut errors = Vec::new();

        for file in &files {
            let file_time = chrono::DateTime::parse_from_rfc3339(&file.created_at)
                .map(|dt| dt.timestamp_millis() as u64)
                .unwrap_or(0);

            if file_time < cutoff_time {
                let file_path = file.name.clone();
                let env = self.env;
                let client = self.client.clone();
                let fp = file_path.clone();
                let delete_result: Result<(), TerminalError> = ctx
                    .run(|| async move {
                        supabase::delete_file(&client, env, &fp)
                            .await
                            .map_err(|e| TerminalError::new(e.to_string()).into())
                    })
                    .await;

                match delete_result {
                    Ok(()) => deleted_count += 1,
                    Err(err) => {
                        failed_count += 1;
                        errors.push(format!("Failed to delete {file_path}: {err}"));
                        if errors.len() >= 10 {
                            errors.push("... (truncated, too many errors)".to_string());
                            break;
                        }
                    }
                }
            }
        }

        Ok(Json(CleanupResult {
            deleted_count,
            failed_count,
            total_scanned,
            errors,
        }))
    }
}
