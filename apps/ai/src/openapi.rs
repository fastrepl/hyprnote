//! OpenAPI documentation generation.
//!
//! This module generates OpenAPI 3.0 specifications for the AI API,
//! merging schemas from the LLM and STT proxy crates and adding
//! authentication security schemes.

use utoipa::openapi::security::{ApiKey, ApiKeyValue, Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi};

/// Base OpenAPI documentation structure.
///
/// This is extended with routes and schemas from proxy crates.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Hyprnote AI API",
        version = "1.0.0",
        description = "AI services API for speech-to-text transcription and LLM chat completions"
    ),
    tags(
        (name = "stt", description = "Speech-to-text transcription endpoints"),
        (name = "llm", description = "LLM chat completions endpoints")
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

/// Generates the complete OpenAPI specification.
///
/// Merges documentation from:
/// - STT proxy endpoints and schemas
/// - LLM proxy endpoints and schemas
/// - Security schemes for authentication
///
/// # Returns
///
/// A complete OpenAPI 3.0 document that can be served as JSON.
pub fn openapi() -> utoipa::openapi::OpenApi {
    let mut doc = ApiDoc::openapi();

    let stt_doc = hypr_transcribe_proxy::openapi();
    let llm_doc = hypr_llm_proxy::openapi();

    doc.merge(stt_doc);
    doc.merge(llm_doc);

    doc
}

/// Modifier that adds security schemes to the OpenAPI document.
struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        if let Some(components) = openapi.components.as_mut() {
            components.add_security_scheme(
                "bearer_auth",
                SecurityScheme::Http(
                    Http::builder()
                        .scheme(HttpAuthScheme::Bearer)
                        .bearer_format("JWT")
                        .description(Some("Supabase JWT token"))
                        .build(),
                ),
            );
            components.add_security_scheme(
                "device_fingerprint",
                SecurityScheme::ApiKey(ApiKey::Header(ApiKeyValue::with_description(
                    "x-device-fingerprint",
                    "Optional device fingerprint for analytics",
                ))),
            );
        }
    }
}
