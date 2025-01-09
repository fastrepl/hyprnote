// https://github.com/arlyon/async-stripe/blob/c71a7eb/examples/webhook-axum.rs#L68

use axum::{extract::State, response::IntoResponse};
use stripe::{EventObject, EventType};

use crate::{state::AppState, stripe::StripeEvent};

pub async fn handler(
    State(_state): State<AppState>,
    StripeEvent(event): StripeEvent,
) -> impl IntoResponse {
    match event.type_ {
        EventType::CustomerCreated => {
            if let EventObject::Customer(_customer) = event.data.object {}
        }
        EventType::CustomerUpdated => {
            if let EventObject::Customer(_customer) = event.data.object {}
        }
        EventType::CustomerDeleted => {
            if let EventObject::Customer(_customer) = event.data.object {}
        }
        EventType::CustomerSubscriptionCreated => {
            if let EventObject::Subscription(_subscription) = event.data.object {}
        }
        EventType::CustomerSubscriptionUpdated => {
            if let EventObject::Subscription(_subscription) = event.data.object {}
        }
        EventType::CustomerSubscriptionDeleted => {
            if let EventObject::Subscription(_subscription) = event.data.object {}
        }
        _ => {}
    }
}
