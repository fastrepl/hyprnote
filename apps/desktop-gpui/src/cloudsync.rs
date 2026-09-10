use std::sync::{
    Arc, Mutex,
    atomic::{AtomicU64, Ordering},
};
use std::time::Duration;

use anlg_desktop_db_runtime::{
    CloudsyncE2eeWitness, CloudsyncWorkspaceKeyGrant, CloudsyncWorkspaceProjection,
    CloudsyncWorkspaceProjectionEntry, DesktopDbRuntime, QueryEventSink,
    cloudsync_config::{E2eeSecretReader, load_e2ee_recovery_key},
};
use serde::{Deserialize, Serialize};

const API_URL: Option<&str> = option_env!("VITE_API_URL");
const DEVICE_NAME_HEADER: &str = "x-anarlog-device-name";
const E2EE_KEY_ID_HEADER: &str = "X-Anarlog-E2EE-Key-Id";
const MEMBER_KEY_HEADER: &str = "x-anarlog-e2ee-member-public-key";
const TRANSPORTS_HEADER: &str = "x-anarlog-cloudsync-transports";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CloudsyncStatus {
    Off,
    Syncing,
    Blocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialBlock {
    ActivationFailed,
    ApprovalPending,
    ClockSkew,
    DeviceLimit,
    IdentityMismatch,
    KeychainAccess,
    NotEntitled,
    ReauthRequired,
    SetupRequired,
    Unavailable,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct State {
    pub status: CloudsyncStatus,
    pub block: Option<CredentialBlock>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LegacyCredentials {
    pub database_id: String,
    pub token: String,
    pub expires_at: String,
    pub workspace_id: String,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct E2eeCredentials {
    pub encryption_version: u8,
    pub encryption_key_id: String,
    pub database_id: String,
    pub token: String,
    pub expires_at: String,
    pub workspace_id: String,
    pub account_user_id: String,
    pub personal_workspace_id: String,
    pub workspaces: Vec<Workspace>,
    pub workspace_key_grants: Vec<Grant>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ReplicaCredentials {
    pub transport: String,
    pub encryption_version: u8,
    pub encryption_key_id: String,
    pub expires_at: String,
    pub workspace_id: String,
    pub account_user_id: String,
    pub personal_workspace_id: Option<String>,
    pub workspaces: Option<Vec<Workspace>>,
    pub workspace_key_grants: Option<Vec<Grant>>,
}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum CredentialResponse {
    Replica(ReplicaCredentials),
    E2ee(E2eeCredentials),
    Legacy(LegacyCredentials),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub owner_user_id: String,
    pub kind: String,
    pub name: String,
    pub membership_id: String,
    pub role: String,
    pub membership_created_at: String,
    pub membership_updated_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Grant {
    pub workspace_id: String,
    pub key_id: String,
    pub ephemeral_public_key: String,
    pub nonce: String,
    pub ciphertext: String,
    pub is_active: bool,
}

impl From<Workspace> for CloudsyncWorkspaceProjectionEntry {
    fn from(value: Workspace) -> Self {
        Self {
            id: value.id,
            owner_user_id: value.owner_user_id,
            kind: value.kind,
            name: value.name,
            membership_id: value.membership_id,
            role: value.role,
            membership_created_at: value.membership_created_at,
            membership_updated_at: value.membership_updated_at,
            created_at: value.created_at,
            updated_at: value.updated_at,
        }
    }
}

impl From<Grant> for CloudsyncWorkspaceKeyGrant {
    fn from(value: Grant) -> Self {
        Self {
            workspace_id: value.workspace_id,
            key_id: value.key_id,
            ephemeral_public_key: value.ephemeral_public_key,
            nonce: value.nonce,
            ciphertext: value.ciphertext,
            is_active: value.is_active,
        }
    }
}

pub fn sanitize_device_name(name: Option<&str>) -> Option<String> {
    let ascii: String = name?
        .trim()
        .chars()
        .filter(|character| (' '..='~').contains(character))
        .collect::<String>()
        .trim()
        .chars()
        .take(128)
        .collect();
    (!ascii.is_empty()).then_some(ascii)
}

pub fn credential_block_for_code(code: Option<&str>) -> CredentialBlock {
    match code {
        Some("sync_device_limit_reached") => CredentialBlock::DeviceLimit,
        Some("reauth_required") => CredentialBlock::ReauthRequired,
        Some("clock_skew") => CredentialBlock::ClockSkew,
        Some("identity_mismatch") => CredentialBlock::IdentityMismatch,
        Some("approval_pending") => CredentialBlock::ApprovalPending,
        Some("keychain_access") => CredentialBlock::KeychainAccess,
        Some("setup_required") => CredentialBlock::SetupRequired,
        Some("not_entitled") => CredentialBlock::NotEntitled,
        _ => CredentialBlock::NotEntitled,
    }
}

#[allow(dead_code)]
pub fn refresh_delay(expires_at: u64, now: u64) -> Duration {
    Duration::from_secs(expires_at.saturating_sub(now).saturating_sub(300).max(60))
}

pub struct GpuiE2eeSecrets {
    pub app_id: String,
}

impl E2eeSecretReader for GpuiE2eeSecrets {
    fn read(
        &self,
        scope: &str,
        key: &str,
    ) -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<Option<String>, String>> + Send + '_>,
    > {
        let result = crate::secrets::read(&self.app_id, scope, key);
        Box::pin(async move { result })
    }
}

pub struct Cloudsync<S: QueryEventSink> {
    pub runtime: Arc<DesktopDbRuntime<S>>,
    pub auth: Arc<crate::auth::Auth>,
    pub http: reqwest::Client,
    state: Mutex<State>,
    generation: AtomicU64,
    app_id: String,
}

impl<S: QueryEventSink> Cloudsync<S> {
    pub fn new(
        runtime: Arc<DesktopDbRuntime<S>>,
        auth: Arc<crate::auth::Auth>,
        app_id: impl Into<String>,
    ) -> Self {
        Self {
            runtime,
            auth,
            http: reqwest::Client::new(),
            state: Mutex::new(State {
                status: CloudsyncStatus::Off,
                block: None,
            }),
            generation: AtomicU64::new(0),
            app_id: app_id.into(),
        }
    }

    #[allow(dead_code)]
    pub fn state(&self) -> State {
        self.state.lock().expect("cloudsync state poisoned").clone()
    }

    pub async fn request_credentials(
        &self,
        access_token: &str,
        encryption_key_id: &str,
        member_public_key: &str,
    ) -> anyhow::Result<CredentialResponse> {
        let api_url = API_URL.ok_or_else(|| anyhow::anyhow!("VITE_API_URL is not configured"))?;
        let device_name =
            sysinfo::System::host_name().and_then(|name| sanitize_device_name(Some(&name)));
        let mut request = self
            .http
            .post(format!("{api_url}/sync/token"))
            .bearer_auth(access_token)
            .header(E2EE_KEY_ID_HEADER, encryption_key_id)
            .header(MEMBER_KEY_HEADER, member_public_key)
            .header(TRANSPORTS_HEADER, "replica")
            .header("x-device-fingerprint", anlg_host::fingerprint());
        if let Some(device_name) = device_name {
            request = request.header(DEVICE_NAME_HEADER, device_name);
        }
        let response = request.send().await?;
        let response = if response.status() == reqwest::StatusCode::NOT_FOUND {
            let mut fallback = self
                .http
                .post(format!("{api_url}/sync/replica/credentials"))
                .bearer_auth(access_token)
                .header(E2EE_KEY_ID_HEADER, encryption_key_id)
                .header(MEMBER_KEY_HEADER, member_public_key)
                .header(TRANSPORTS_HEADER, "replica")
                .header("x-device-fingerprint", anlg_host::fingerprint());
            if let Some(device_name) =
                sysinfo::System::host_name().and_then(|name| sanitize_device_name(Some(&name)))
            {
                fallback = fallback.header(DEVICE_NAME_HEADER, device_name);
            }
            fallback.send().await?
        } else {
            response
        };
        if response.status() == reqwest::StatusCode::FORBIDDEN {
            let code = response
                .json::<serde_json::Value>()
                .await
                .ok()
                .and_then(|value| value["error"]["code"].as_str().map(str::to_string));
            let block = credential_block_for_code(code.as_deref());
            *self.state.lock().expect("cloudsync state poisoned") = State {
                status: CloudsyncStatus::Blocked,
                block: Some(block),
            };
            anyhow::bail!("CloudSync credentials rejected");
        }
        Ok(response.error_for_status()?.json().await?)
    }

    pub async fn activate(&self) -> anyhow::Result<()> {
        self.activate_with_enabled(true).await
    }

    pub async fn activate_with_enabled(&self, enabled: bool) -> anyhow::Result<()> {
        let generation = self.generation.fetch_add(1, Ordering::SeqCst) + 1;
        let Some(session) = self.auth.session().map_err(anyhow::Error::msg)? else {
            self.runtime.suspend_cloudsync_for_sign_out().await?;
            *self.state.lock().expect("cloudsync state poisoned") = State {
                status: CloudsyncStatus::Off,
                block: None,
            };
            return Ok(());
        };
        if !enabled {
            self.runtime.suspend_cloudsync().await?;
            *self.state.lock().expect("cloudsync state poisoned") = State {
                status: CloudsyncStatus::Off,
                block: None,
            };
            return Ok(());
        }
        let Some(user) = session.user.as_ref() else {
            anyhow::bail!("authenticated session has no user");
        };
        let secrets = GpuiE2eeSecrets {
            app_id: self.app_id.clone(),
        };
        let recovery = load_e2ee_recovery_key(&secrets, &user.id)
            .await
            .map_err(anyhow::Error::msg)?;
        let Some(recovery) = recovery else {
            self.runtime.suspend_cloudsync().await?;
            *self.state.lock().expect("cloudsync state poisoned") = State {
                status: CloudsyncStatus::Blocked,
                block: Some(CredentialBlock::SetupRequired),
            };
            return Ok(());
        };
        let member_public_key = recovery.member_identity_key()?.public_key();
        let credentials = self
            .request_credentials(
                &session.access_token,
                &recovery.key_id(),
                &member_public_key,
            )
            .await?;
        if generation != self.generation.load(Ordering::SeqCst) {
            return Ok(());
        }
        let result = match credentials {
            CredentialResponse::Replica(credentials) => {
                let projection = credentials.personal_workspace_id.map(|personal| {
                    CloudsyncWorkspaceProjection {
                        account_user_id: credentials.account_user_id.clone(),
                        personal_workspace_id: personal,
                        workspaces: credentials
                            .workspaces
                            .unwrap_or_default()
                            .into_iter()
                            .map(Into::into)
                            .collect(),
                    }
                });
                self.runtime
                    .configure_e2ee_replica_with_keys(
                        &secrets,
                        credentials.workspace_id,
                        CloudsyncE2eeWitness {
                            endpoint: format!(
                                "{api}/sync/e2ee/witness/{id}",
                                api = API_URL.unwrap_or(""),
                                id = user.id
                            ),
                            access_token: session.access_token.clone(),
                        },
                        projection,
                        Some(
                            credentials
                                .workspace_key_grants
                                .unwrap_or_default()
                                .into_iter()
                                .map(Into::into)
                                .collect(),
                        ),
                    )
                    .await
            }
            CredentialResponse::E2ee(credentials) => {
                let projection = CloudsyncWorkspaceProjection {
                    account_user_id: credentials.account_user_id.clone(),
                    personal_workspace_id: credentials.personal_workspace_id.clone(),
                    workspaces: credentials.workspaces.into_iter().map(Into::into).collect(),
                };
                self.runtime
                    .configure_cloudsync_token_with_keys(
                        &secrets,
                        credentials.database_id,
                        credentials.token,
                        credentials.workspace_id,
                        Some(projection),
                        Some(
                            credentials
                                .workspace_key_grants
                                .into_iter()
                                .map(Into::into)
                                .collect(),
                        ),
                        CloudsyncE2eeWitness {
                            endpoint: format!(
                                "{api}/sync/e2ee/witness/{id}",
                                api = API_URL.unwrap_or(""),
                                id = credentials.personal_workspace_id
                            ),
                            access_token: session.access_token.clone(),
                        },
                    )
                    .await
            }
            CredentialResponse::Legacy(credentials) => {
                self.runtime
                    .configure_cloudsync_token_with_keys(
                        &secrets,
                        credentials.database_id,
                        credentials.token,
                        credentials.workspace_id.clone(),
                        None,
                        None,
                        CloudsyncE2eeWitness {
                            endpoint: format!(
                                "{api}/sync/e2ee/witness/{id}",
                                api = API_URL.unwrap_or(""),
                                id = credentials.workspace_id
                            ),
                            access_token: session.access_token.clone(),
                        },
                    )
                    .await
            }
        };
        result.map_err(anyhow::Error::msg)?;
        self.runtime.start_cloudsync().await?;
        *self.state.lock().expect("cloudsync state poisoned") = State {
            status: CloudsyncStatus::Syncing,
            block: None,
        };
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_device_names() {
        assert_eq!(
            sanitize_device_name(Some(" \u{1f600} Mac \n")),
            Some("Mac".into())
        );
        assert_eq!(sanitize_device_name(Some(" \u{0} ")), None);
        assert_eq!(
            sanitize_device_name(Some(&"x".repeat(129))).unwrap().len(),
            128
        );
    }

    #[test]
    fn computes_refresh_delay() {
        assert_eq!(refresh_delay(1_000, 900), Duration::from_secs(60));
        assert_eq!(refresh_delay(2_000, 900), Duration::from_secs(800));
    }

    #[test]
    fn maps_credential_blocks() {
        assert_eq!(
            credential_block_for_code(Some("sync_device_limit_reached")),
            CredentialBlock::DeviceLimit
        );
        assert_eq!(
            credential_block_for_code(Some("unknown")),
            CredentialBlock::NotEntitled
        );
    }

    #[test]
    fn deserializes_all_credential_variants() {
        let legacy = serde_json::from_str::<CredentialResponse>(
            r#"{"databaseId":"db","token":"token","expiresAt":"2025-01-01T00:00:00Z","workspaceId":"workspace"}"#,
        )
        .unwrap();
        assert!(matches!(legacy, CredentialResponse::Legacy(_)));
        let e2ee = serde_json::from_str::<CredentialResponse>(
            r#"{"encryptionVersion":2,"encryptionKeyId":"key","databaseId":"db","token":"token","expiresAt":"2025-01-01T00:00:00Z","workspaceId":"workspace","accountUserId":"user","personalWorkspaceId":"personal","workspaces":[],"workspaceKeyGrants":[]}"#,
        )
        .unwrap();
        assert!(matches!(e2ee, CredentialResponse::E2ee(_)));
        let replica = serde_json::from_str::<CredentialResponse>(
            r#"{"transport":"replica","encryptionVersion":2,"encryptionKeyId":"key","expiresAt":"2025-01-01T00:00:00Z","workspaceId":"workspace","accountUserId":"user"}"#,
        )
        .unwrap();
        assert!(matches!(replica, CredentialResponse::Replica(_)));
    }
}
