use utoipa::openapi::security::{ApiKey, ApiKeyValue, Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi};

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Hyprnote AI API",
        version = "1.0.0",
        description = "AI services API for speech-to-text transcription, LLM chat completions, and subscription management"
    ),
    tags(
        (name = "stt", description = "Speech-to-text transcription endpoints"),
        (name = "llm", description = "LLM chat completions endpoints"),
        (name = "subscription", description = "Subscription and trial management")
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    let mut doc = ApiDoc::openapi();

    let stt_doc = hypr_transcribe_proxy::openapi();
    let llm_doc = hypr_llm_proxy::openapi();
    let subscription_doc = hypr_api_subscription::openapi();

    doc.merge(stt_doc);
    doc.merge(llm_doc);
    doc.merge(subscription_doc);

    doc
}

pub fn write_json() {
    let doc = openapi();
    let json = serde_json::to_string_pretty(&doc).expect("Failed to serialize OpenAPI spec");
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("openapi.gen.json");
    std::fs::write(&path, json).expect("Failed to write openapi.gen.json");
}

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
