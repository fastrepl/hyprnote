mod calendar;

use axum::{Router, middleware, routing::post};
use utoipa::OpenApi;

use crate::state::AppState;

pub use calendar::ListEventsResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        calendar::list_calendars,
        calendar::list_events,
        calendar::create_event,
    ),
    components(
        schemas(
            calendar::ListCalendarsRequest,
            calendar::ListCalendarsResponse,
            calendar::ListEventsRequest,
            ListEventsResponse,
            calendar::CreateEventRequest,
            calendar::CreateEventResponse,
            calendar::EventDateTime,
            calendar::EventAttendee,
        )
    ),
    tags(
        (name = "calendar", description = "Calendar management")
    )
)]
pub struct ApiDoc;

pub fn openapi() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}

pub fn router(state: AppState) -> Router {
    let auth_state = state.auth.clone();

    Router::new()
        .route("/calendar/calendars", post(calendar::list_calendars))
        .route("/calendar/events", post(calendar::list_events))
        .route("/calendar/events/create", post(calendar::create_event))
        .route_layer(middleware::from_fn_with_state(
            auth_state,
            hypr_api_auth::require_auth,
        ))
        .with_state(state)
}
