mod calendar;

use axum::{Router, routing::post};
use utoipa::OpenApi;

use crate::config::CalendarConfig;
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

pub fn router(config: CalendarConfig) -> Result<Router, crate::error::CalendarError> {
    let state = AppState::new(config)?;

    Ok(Router::new()
        .route("/calendars", post(calendar::list_calendars))
        .route("/events", post(calendar::list_events))
        .route("/events/create", post(calendar::create_event))
        .with_state(state))
}
