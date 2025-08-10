use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub status: ServerStatusType,
    pub model: String,
    pub version: String,
    pub model_state: String,
    pub verbose: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ServerStatusType {
    Ready,
    Initializing,
    Uninitialized,
    Unloaded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InitRequest {
    pub api_key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_base: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_repo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_folder: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tokenizer_folder: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fast_load: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fast_load_encoder_compute_units: Option<ComputeUnits>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fast_load_decoder_compute_units: Option<ComputeUnits>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_vad: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verbose: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ComputeUnits {
    Cpu,
    #[serde(rename = "cpuandgpu")]
    CpuAndGpu,
    #[serde(rename = "cpuandneuralengine")]
    CpuAndNeuralEngine,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InitResponse {
    pub status: String,
    pub message: String,
    pub model: String,
    pub verbose: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenericResponse {
    pub status: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub status: String,
    pub message: String,
}
