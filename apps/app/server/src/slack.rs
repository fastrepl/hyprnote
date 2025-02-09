// https://slack-rust.abdolence.dev/events-api-axum.html

use hypr_slack::slack_morphism::prelude::*;

use axum::{http::StatusCode, response::IntoResponse, Extension};
use std::sync::Arc;

#[allow(unused)]
async fn oauth_install_function(
    resp: SlackOAuthV2AccessTokenResponse,
    _client: Arc<SlackHyperClient>,
    _states: SlackClientEventsUserState,
) {
    println!("{:#?}", resp);
}

#[allow(unused)]
async fn push_event(
    Extension(_environment): Extension<Arc<SlackHyperListenerEnvironment>>,
    Extension(event): Extension<SlackPushEvent>,
) -> impl IntoResponse {
    match event {
        SlackPushEvent::UrlVerification(url_ver) => url_ver.challenge,
        _ => "".to_string(),
    }
}

#[allow(unused)]
async fn command_event(
    Extension(_environment): Extension<Arc<SlackHyperListenerEnvironment>>,
    Extension(event): Extension<SlackCommandEvent>,
) -> axum::Json<SlackCommandEventResponse> {
    println!("Received command event: {:?}", event);
    axum::Json(SlackCommandEventResponse::new(
        SlackMessageContent::new().with_text("Working on it".into()),
    ))
}

#[allow(unused)]
async fn interaction_event(
    Extension(_environment): Extension<Arc<SlackHyperListenerEnvironment>>,
    Extension(event): Extension<SlackInteractionEvent>,
) {
    println!("Received interaction event: {:?}", event);
}

#[allow(unused)]
fn error_handler(
    err: Box<dyn std::error::Error + Send + Sync>,
    _client: Arc<SlackHyperClient>,
    _states: SlackClientEventsUserState,
) -> impl IntoResponse {
    StatusCode::BAD_REQUEST
}
