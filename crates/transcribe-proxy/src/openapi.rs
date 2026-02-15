use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(crate::routes::status::handler),
    components(schemas(
        hypr_restate_stt_types::PipelineStatus,
        hypr_restate_stt_types::SttStatusResponse,
    )),
    tags((name = "stt", description = "Speech-to-text transcription proxy"))
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
