use utoipa::OpenApi;

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
    )
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
