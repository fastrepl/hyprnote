macro_rules! common_derives {
    ($item:item) => {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        $item
    };
}

common_derives! {
    #[serde(rename_all = "camelCase")]
    pub struct ServerStatus {
        pub status: ServerStatusType,
        pub model: String,
        pub version: String,
        pub model_state: ModelState,
        pub verbose: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub download_progress: Option<DownloadProgress>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub message: Option<String>,
    }
}

common_derives! {
    #[serde(rename_all = "camelCase")]
    pub struct DownloadProgress {
        pub progress_percentage: f64,
        pub is_downloading: bool,
    }
}

common_derives! {
    #[derive(Eq, PartialEq)]
    #[serde(rename_all = "lowercase")]
    pub enum ServerStatusType {
        Ready,
        Initializing,
        Uninitialized,
        Unloaded,
    }
}

common_derives! {
    #[derive(Eq, PartialEq)]
    #[serde(rename_all = "lowercase")]
    pub enum ModelState {
        Unloading,
        Unloaded,
        Loading,
        Loaded,
        Prewarming,
        Prewarmed,
        Downloading,
        Downloaded,
    }
}

common_derives! {
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
        #[serde(skip_serializing_if = "Option::is_none")]
        pub custom_vocabulary: Option<Vec<String>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        pub custom_vocabulary_model_folder: Option<String>,
    }
}

common_derives! {
    #[serde(rename_all = "lowercase")]
    pub enum ComputeUnits {
        Cpu,
        #[serde(rename = "cpuandgpu")]
        CpuAndGpu,
        #[serde(rename = "cpuandneuralengine")]
        CpuAndNeuralEngine,
        All,
    }
}

common_derives! {
    pub struct InitResponse {
        pub status: String,
        pub message: String,
        pub model: String,
        pub verbose: bool,
    }
}

common_derives! {
    pub struct GenericResponse {
        pub status: String,
        pub message: String,
    }
}

common_derives! {
    pub struct ErrorResponse {
        pub status: String,
        pub message: String,
    }
}
