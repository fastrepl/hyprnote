//! OpenAPI documentation generation

use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(),
    components(schemas()),
    tags((name = "llm", description = "LLM chat completions proxy"))
)]
pub struct ApiDoc;

/// Generate OpenAPI documentation for the LLM proxy
pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
