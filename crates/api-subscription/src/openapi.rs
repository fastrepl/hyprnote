use utoipa::OpenApi;

use crate::routes::{CanStartTrialResponse, Interval, StartTrialResponse};

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::routes::rpc::can_start_trial,
        crate::routes::billing::start_trial,
    ),
    components(
        schemas(
            CanStartTrialResponse,
            StartTrialResponse,
            Interval,
        )
    ),
    tags(
        (name = "subscription", description = "Subscription and trial management")
    )
)]
struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
