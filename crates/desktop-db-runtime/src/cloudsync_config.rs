use std::{
    collections::{HashMap, HashSet},
    future::Future,
    pin::Pin,
    time::Duration,
};

use crate::{
    CloudsyncE2eeWitness, CloudsyncTokenConfigurationResult, CloudsyncWorkspaceKeyGrant,
    CloudsyncWorkspaceProjection, QueryEventSink,
};

pub const E2EE_SECRET_SCOPE: &str = "e2ee";
pub const E2EE_SECRET_READ_TIMEOUT: Duration = Duration::from_secs(25);
pub const E2EE_SECRET_READ_TIMEOUT_ERROR: &str = "E2EE secret read timed out";

pub trait E2eeSecretReader: Send + Sync {
    fn read(
        &self,
        scope: &str,
        key: &str,
    ) -> Pin<Box<dyn Future<Output = Result<Option<String>, String>> + Send + '_>>;
}

pub fn canonical_e2ee_account_user_id(account_user_id: &str) -> Result<String, String> {
    uuid::Uuid::parse_str(account_user_id.trim())
        .map(|id| id.to_string())
        .map_err(|_| "E2EE account ID is invalid".to_string())
}

pub fn e2ee_recovery_key_name(account_user_id: &str) -> Result<String, String> {
    Ok(format!(
        "account:{}:recovery-v1",
        canonical_e2ee_account_user_id(account_user_id)?
    ))
}

pub async fn read_e2ee_secret_with_timeout(
    timeout: Duration,
    read: impl Future<Output = Result<Option<String>, String>>,
) -> Result<Option<String>, String> {
    tokio::time::timeout(timeout, read)
        .await
        .map_err(|_| E2EE_SECRET_READ_TIMEOUT_ERROR.to_string())?
}

pub async fn load_e2ee_recovery_key(
    secrets: &dyn E2eeSecretReader,
    account_user_id: &str,
) -> Result<Option<anlg_e2ee::RecoveryKey>, String> {
    let key = e2ee_recovery_key_name(account_user_id)?;
    read_e2ee_secret_with_timeout(
        E2EE_SECRET_READ_TIMEOUT,
        secrets.read(E2EE_SECRET_SCOPE, &key),
    )
    .await?
    .map(|value| anlg_e2ee::RecoveryKey::parse(&value).map_err(|error| error.to_string()))
    .transpose()
}

pub fn shared_workspace_ids(
    workspace_projection: Option<&CloudsyncWorkspaceProjection>,
) -> HashSet<String> {
    workspace_projection
        .into_iter()
        .flat_map(|projection| projection.workspaces.iter())
        .filter(|workspace| workspace.kind == "shared")
        .map(|workspace| workspace.id.clone())
        .collect()
}

pub fn open_shared_workspace_keyrings(
    recovery_key: &anlg_e2ee::RecoveryKey,
    account_user_id: &str,
    shared_workspace_ids: HashSet<String>,
    grants: Vec<CloudsyncWorkspaceKeyGrant>,
) -> Result<HashMap<String, anlg_e2ee::WorkspaceKeyring>, String> {
    struct Pending {
        active: Option<anlg_e2ee::WorkspaceKey>,
        retired: Vec<anlg_e2ee::WorkspaceKey>,
        key_ids: HashSet<String>,
    }
    let member = recovery_key
        .member_identity_key()
        .map_err(|e| e.to_string())?;
    let mut pending = HashMap::<String, Pending>::new();
    for grant in grants {
        if !shared_workspace_ids.contains(&grant.workspace_id) {
            return Err("workspace E2EE grant targets an unavailable workspace".into());
        }
        let workspace_id = grant.workspace_id.clone();
        let active = grant.is_active;
        let key_id = grant.key_id.clone();
        let key = member
            .open_workspace_key(&workspace_id, account_user_id, &grant.into())
            .map_err(|e| e.to_string())?;
        let entry = pending.entry(workspace_id).or_insert_with(|| Pending {
            active: None,
            retired: Vec::new(),
            key_ids: HashSet::new(),
        });
        if !entry.key_ids.insert(key_id) || (active && entry.active.is_some()) {
            return Err("workspace E2EE grant generations are invalid".into());
        }
        if active {
            entry.active = Some(key);
        } else {
            entry.retired.push(key);
        }
    }
    let mut keyrings = HashMap::with_capacity(shared_workspace_ids.len());
    for workspace_id in shared_workspace_ids {
        let Some(entry) = pending.remove(&workspace_id) else {
            return Err("shared workspace E2EE key is unavailable".into());
        };
        let Some(active) = entry.active else {
            return Err("shared workspace active E2EE key is unavailable".into());
        };
        let mut keyring = anlg_e2ee::WorkspaceKeyring::new(active);
        for key in entry.retired {
            keyring.insert_retired(key);
        }
        keyrings.insert(workspace_id, keyring);
    }
    Ok(keyrings)
}

impl<S: QueryEventSink> crate::DesktopDbRuntime<S> {
    #[allow(clippy::too_many_arguments)]
    pub async fn configure_cloudsync_token_with_keys(
        &self,
        secrets: &dyn E2eeSecretReader,
        database_id: String,
        token: String,
        workspace_id: String,
        workspace_projection: Option<CloudsyncWorkspaceProjection>,
        workspace_key_grants: Option<Vec<CloudsyncWorkspaceKeyGrant>>,
        e2ee_witness: CloudsyncE2eeWitness,
    ) -> Result<CloudsyncTokenConfigurationResult, String> {
        let result = async {
            let generation = self.begin_cloudsync_auth_configuration();
            let personal = workspace_projection
                .as_ref()
                .map(|p| p.personal_workspace_id.clone())
                .unwrap_or_else(|| workspace_id.clone());
            let recovery = load_e2ee_recovery_key(secrets, &workspace_id)
                .await?
                .ok_or_else(|| "end-to-end encryption recovery key setup is required before CloudSync can start".to_string())?;
            let keyrings = open_shared_workspace_keyrings(
                &recovery,
                &workspace_id,
                shared_workspace_ids(workspace_projection.as_ref()),
                workspace_key_grants.unwrap_or_default(),
            )?;
            self.configure_cloudsync_token_with_projection_at_generation(
                crate::runtime::CloudsyncTokenConfiguration::new(
                    database_id,
                    token,
                    workspace_id,
                    workspace_projection.map(Into::into),
                    e2ee_witness,
                ),
                Some(crate::runtime::E2eeWorkspaceKeyConfiguration::new(
                    personal, recovery, keyrings,
                )),
                generation,
            )
            .await
            .map_err(|e| e.to_string())
        }.await;
        self.record_cloudsync_configuration_result("configure_token", &result);
        result
    }

    pub async fn configure_e2ee_replica_with_keys(
        &self,
        secrets: &dyn E2eeSecretReader,
        workspace_id: String,
        e2ee_witness: CloudsyncE2eeWitness,
        workspace_projection: Option<CloudsyncWorkspaceProjection>,
        workspace_key_grants: Option<Vec<CloudsyncWorkspaceKeyGrant>>,
    ) -> Result<CloudsyncTokenConfigurationResult, String> {
        let result = async {
            let generation = self.begin_cloudsync_auth_configuration();
            let recovery = load_e2ee_recovery_key(secrets, &workspace_id)
                .await?
                .ok_or_else(|| {
                    "end-to-end encryption recovery key setup is required before sync can start"
                        .to_string()
                })?;
            let keyrings = open_shared_workspace_keyrings(
                &recovery,
                &workspace_id,
                shared_workspace_ids(workspace_projection.as_ref()),
                workspace_key_grants.unwrap_or_default(),
            )?;
            self.configure_replica_transport_at_generation(
                workspace_id.clone(),
                e2ee_witness,
                crate::runtime::E2eeWorkspaceKeyConfiguration::new(
                    workspace_id,
                    recovery,
                    keyrings,
                ),
                workspace_projection.map(Into::into),
                generation,
            )
            .await
            .map_err(|e| e.to_string())
        }
        .await;
        self.record_cloudsync_configuration_result("configure_replica", &result);
        result
    }
}
