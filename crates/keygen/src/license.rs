use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::KeygenClient;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct License {
    pub id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub attributes: LicenseAttributes,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<LicenseRelationships>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseAttributes {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expiry: Option<String>,
    pub status: String,
    #[serde(default)]
    pub uses: u32,
    #[serde(rename = "maxMachines", skip_serializing_if = "Option::is_none")]
    pub max_machines: Option<u32>,
    #[serde(default)]
    pub metadata: HashMap<String, serde_json::Value>,
    #[serde(rename = "created", skip_serializing_if = "Option::is_none")]
    pub created: Option<String>,
    #[serde(rename = "updated", skip_serializing_if = "Option::is_none")]
    pub updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseRelationships {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub policy: Option<PolicyRelationship>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<UserRelationship>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRelationship {
    pub data: PolicyData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyData {
    #[serde(rename = "type")]
    pub type_: String,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRelationship {
    pub data: UserData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserData {
    #[serde(rename = "type")]
    pub type_: String,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseResponse {
    pub data: License,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseListResponse {
    pub data: Vec<License>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<ListMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub page: Option<PageInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageInfo {
    pub size: u32,
    pub number: u32,
    pub total: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateLicenseRequest {
    pub data: CreateLicenseData,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateLicenseData {
    #[serde(rename = "type")]
    pub type_: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attributes: Option<CreateLicenseAttributes>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relationships: Option<LicenseRelationships>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateLicenseAttributes {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expiry: Option<String>,
    #[serde(rename = "maxMachines", skip_serializing_if = "Option::is_none")]
    pub max_machines: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateLicenseRequest {
    pub data: UpdateLicenseData,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateLicenseData {
    #[serde(rename = "type")]
    pub type_: String,
    pub attributes: UpdateLicenseAttributes,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateLicenseAttributes {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expiry: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(rename = "maxMachines", skip_serializing_if = "Option::is_none")]
    pub max_machines: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidateLicenseRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<ValidateMeta>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidateKeyRequest {
    pub meta: ValidateKeyMeta,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidateMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<ValidationScope>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidateKeyMeta {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<ValidationScope>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ValidationScope {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResponse {
    pub data: License,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<ValidationMeta>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub valid: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
}

#[derive(Debug, Clone)]
pub struct LicenseQueryParams {
    pub limit: Option<u32>,
    pub page: Option<u32>,
    pub user_id: Option<String>,
    pub policy_id: Option<String>,
    pub status: Option<String>,
}

impl Default for LicenseQueryParams {
    fn default() -> Self {
        Self {
            limit: None,
            page: None,
            user_id: None,
            policy_id: None,
            status: None,
        }
    }
}

impl KeygenClient {
    /// Create a new license
    pub async fn create_license(
        &self,
        account_id: &str,
        policy_id: &str,
        attributes: Option<CreateLicenseAttributes>,
        user_id: Option<&str>,
    ) -> Result<LicenseResponse, Box<dyn std::error::Error + Send + Sync>> {
        let mut relationships = LicenseRelationships {
            policy: Some(PolicyRelationship {
                data: PolicyData {
                    type_: "policies".to_string(),
                    id: policy_id.to_string(),
                },
            }),
            user: None,
        };

        if let Some(uid) = user_id {
            relationships.user = Some(UserRelationship {
                data: UserData {
                    type_: "users".to_string(),
                    id: uid.to_string(),
                },
            });
        }

        let request = CreateLicenseRequest {
            data: CreateLicenseData {
                type_: "licenses".to_string(),
                attributes,
                relationships: Some(relationships),
            },
        };

        let url = self
            .api_base
            .join(&format!("v1/accounts/{}/licenses", account_id))?;
        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/vnd.api+json")
            .header("Accept", "application/vnd.api+json")
            .json(&request)
            .send()
            .await?
            .error_for_status()?;

        let license_response: LicenseResponse = response.json().await?;
        Ok(license_response)
    }

    /// Retrieve a license by ID
    pub async fn get_license(
        &self,
        account_id: &str,
        license_id: &str,
    ) -> Result<LicenseResponse, Box<dyn std::error::Error + Send + Sync>> {
        let url = self.api_base.join(&format!(
            "v1/accounts/{}/licenses/{}",
            account_id, license_id
        ))?;

        let response = self
            .client
            .get(url)
            .header("Accept", "application/vnd.api+json")
            .send()
            .await?
            .error_for_status()?;

        let license_response: LicenseResponse = response.json().await?;
        Ok(license_response)
    }

    /// Update a license
    pub async fn update_license(
        &self,
        account_id: &str,
        license_id: &str,
        attributes: UpdateLicenseAttributes,
    ) -> Result<LicenseResponse, Box<dyn std::error::Error + Send + Sync>> {
        let request = UpdateLicenseRequest {
            data: UpdateLicenseData {
                type_: "licenses".to_string(),
                attributes,
            },
        };

        let url = self.api_base.join(&format!(
            "v1/accounts/{}/licenses/{}",
            account_id, license_id
        ))?;

        let response = self
            .client
            .patch(url)
            .header("Content-Type", "application/vnd.api+json")
            .header("Accept", "application/vnd.api+json")
            .json(&request)
            .send()
            .await?
            .error_for_status()?;

        let license_response: LicenseResponse = response.json().await?;
        Ok(license_response)
    }

    /// Delete a license
    pub async fn delete_license(
        &self,
        account_id: &str,
        license_id: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let url = self.api_base.join(&format!(
            "v1/accounts/{}/licenses/{}",
            account_id, license_id
        ))?;

        self.client
            .delete(url)
            .header("Accept", "application/vnd.api+json")
            .send()
            .await?
            .error_for_status()?;

        Ok(())
    }

    /// List all licenses with optional query parameters
    pub async fn list_licenses(
        &self,
        account_id: &str,
        params: Option<LicenseQueryParams>,
    ) -> Result<LicenseListResponse, Box<dyn std::error::Error + Send + Sync>> {
        let mut url = self
            .api_base
            .join(&format!("v1/accounts/{}/licenses", account_id))?;

        if let Some(p) = params {
            let mut query_pairs = url.query_pairs_mut();

            if let Some(limit) = p.limit {
                query_pairs.append_pair("limit", &limit.to_string());
            }
            if let Some(page) = p.page {
                query_pairs.append_pair("page", &page.to_string());
            }
            if let Some(user_id) = p.user_id {
                query_pairs.append_pair("user", &user_id);
            }
            if let Some(policy_id) = p.policy_id {
                query_pairs.append_pair("policy", &policy_id);
            }
            if let Some(status) = p.status {
                query_pairs.append_pair("status", &status);
            }
        }

        let response = self
            .client
            .get(url)
            .header("Accept", "application/vnd.api+json")
            .send()
            .await?
            .error_for_status()?;

        let license_list: LicenseListResponse = response.json().await?;
        Ok(license_list)
    }

    /// Validate a license by ID
    pub async fn validate_license(
        &self,
        account_id: &str,
        license_id: &str,
        fingerprint: Option<String>,
    ) -> Result<ValidationResponse, Box<dyn std::error::Error + Send + Sync>> {
        let request = ValidateLicenseRequest {
            meta: fingerprint.map(|fp| ValidateMeta {
                scope: Some(ValidationScope {
                    fingerprint: Some(fp),
                }),
            }),
        };

        let url = self.api_base.join(&format!(
            "v1/accounts/{}/licenses/{}/actions/validate",
            account_id, license_id
        ))?;

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/vnd.api+json")
            .header("Accept", "application/vnd.api+json")
            .json(&request)
            .send()
            .await?
            .error_for_status()?;

        let validation_response: ValidationResponse = response.json().await?;
        Ok(validation_response)
    }

    /// Validate a license by key (no authentication required)
    pub async fn validate_license_key(
        &self,
        account_id: &str,
        license_key: &str,
        fingerprint: Option<String>,
    ) -> Result<ValidationResponse, Box<dyn std::error::Error + Send + Sync>> {
        let request = ValidateKeyRequest {
            meta: ValidateKeyMeta {
                key: license_key.to_string(),
                scope: fingerprint.map(|fp| ValidationScope {
                    fingerprint: Some(fp),
                }),
            },
        };

        let url = self.api_base.join(&format!(
            "v1/accounts/{}/licenses/actions/validate-key",
            account_id
        ))?;

        let response = self
            .client
            .post(url)
            .header("Content-Type", "application/vnd.api+json")
            .header("Accept", "application/vnd.api+json")
            .json(&request)
            .send()
            .await?
            .error_for_status()?;

        let validation_response: ValidationResponse = response.json().await?;
        Ok(validation_response)
    }
}

// Helper functions for creating common attribute objects
impl CreateLicenseAttributes {
    pub fn new() -> Self {
        Self {
            key: None,
            expiry: None,
            max_machines: None,
            metadata: None,
        }
    }

    pub fn with_key(mut self, key: String) -> Self {
        self.key = Some(key);
        self
    }

    pub fn with_expiry(mut self, expiry: String) -> Self {
        self.expiry = Some(expiry);
        self
    }

    pub fn with_max_machines(mut self, max_machines: u32) -> Self {
        self.max_machines = Some(max_machines);
        self
    }

    pub fn with_metadata(mut self, metadata: HashMap<String, serde_json::Value>) -> Self {
        self.metadata = Some(metadata);
        self
    }
}

impl UpdateLicenseAttributes {
    pub fn new() -> Self {
        Self {
            expiry: None,
            status: None,
            max_machines: None,
            metadata: None,
        }
    }

    pub fn with_expiry(mut self, expiry: String) -> Self {
        self.expiry = Some(expiry);
        self
    }

    pub fn with_status(mut self, status: String) -> Self {
        self.status = Some(status);
        self
    }

    pub fn with_max_machines(mut self, max_machines: u32) -> Self {
        self.max_machines = Some(max_machines);
        self
    }

    pub fn with_metadata(mut self, metadata: HashMap<String, serde_json::Value>) -> Self {
        self.metadata = Some(metadata);
        self
    }
}

impl LicenseQueryParams {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_limit(mut self, limit: u32) -> Self {
        self.limit = Some(limit);
        self
    }

    pub fn with_page(mut self, page: u32) -> Self {
        self.page = Some(page);
        self
    }

    pub fn with_user_id(mut self, user_id: String) -> Self {
        self.user_id = Some(user_id);
        self
    }

    pub fn with_policy_id(mut self, policy_id: String) -> Self {
        self.policy_id = Some(policy_id);
        self
    }

    pub fn with_status(mut self, status: String) -> Self {
        self.status = Some(status);
        self
    }
}
