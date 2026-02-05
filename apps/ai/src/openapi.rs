use utoipa::openapi::security::{ApiKey, ApiKeyValue, Http, HttpAuthScheme, SecurityScheme};
use utoipa::{Modify, OpenApi};

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

pub fn openapi() -> utoipa::openapi::OpenApi {
    let mut doc = ApiDoc::openapi();

    let stt_doc = hypr_transcribe_proxy::openapi();
    let llm_doc = hypr_llm_proxy::openapi();

    doc.merge(stt_doc);
    doc.merge(llm_doc);

    doc
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
