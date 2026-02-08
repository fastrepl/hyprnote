//! Environment variable handling and API key management

use std::collections::HashMap;

use owhisper_client::Provider;
use serde::Deserialize;

/// Environment variables for STT provider API keys
///
/// This struct can be deserialized from environment variables or configuration files.
#[derive(Default, Deserialize)]
pub struct Env {
    #[serde(default)]
    pub deepgram_api_key: Option<String>,
    #[serde(default)]
    pub assemblyai_api_key: Option<String>,
    #[serde(default)]
    pub soniox_api_key: Option<String>,
    #[serde(default)]
    pub fireworks_api_key: Option<String>,
    #[serde(default)]
    pub openai_api_key: Option<String>,
    #[serde(default)]
    pub gladia_api_key: Option<String>,
    #[serde(default)]
    pub elevenlabs_api_key: Option<String>,
}

/// Collection of API keys mapped to their respective providers
///
/// This is typically constructed from an `Env` instance and filters out
/// empty or missing keys.
pub struct ApiKeys(pub HashMap<Provider, String>);

impl ApiKeys {
    /// Returns a list of all providers that have configured API keys
    pub fn configured_providers(&self) -> Vec<Provider> {
        self.0.keys().copied().collect()
    }

    /// Logs information about configured providers
    ///
    /// Logs an error if no providers are configured, otherwise logs the list of available providers.
    pub fn log_configured_providers(&self) {
        let providers = self.configured_providers();
        if providers.is_empty() {
            tracing::error!("no_stt_providers_configured");
        } else {
            let names: Vec<_> = providers.iter().map(|p| format!("{:?}", p)).collect();
            tracing::info!(providers = ?names, "stt_providers_configured");
        }
    }
}

impl From<&Env> for ApiKeys {
    fn from(env: &Env) -> Self {
        let mut map = HashMap::new();
        if let Some(key) = env.deepgram_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::Deepgram, key.clone());
        }
        if let Some(key) = env.assemblyai_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::AssemblyAI, key.clone());
        }
        if let Some(key) = env.soniox_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::Soniox, key.clone());
        }
        if let Some(key) = env.fireworks_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::Fireworks, key.clone());
        }
        if let Some(key) = env.openai_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::OpenAI, key.clone());
        }
        if let Some(key) = env.gladia_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::Gladia, key.clone());
        }
        if let Some(key) = env.elevenlabs_api_key.as_ref().filter(|s| !s.is_empty()) {
            map.insert(Provider::ElevenLabs, key.clone());
        }
        Self(map)
    }
}
