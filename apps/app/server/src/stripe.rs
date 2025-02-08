use axum::{
    body::Body,
    extract::{FromRequest, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use stripe::{Event, EventObject, EventType};

use crate::state::AppState;

// https://github.com/arlyon/async-stripe/blob/c71a7eb/examples/webhook-axum.rs
pub struct StripeEvent(Event);

impl<S> FromRequest<S> for StripeEvent
where
    String: FromRequest<S>,
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request(req: Request<Body>, state: &S) -> Result<Self, Self::Rejection> {
        let signature = if let Some(sig) = req.headers().get("stripe-signature") {
            sig.to_owned()
        } else {
            return Err(StatusCode::BAD_REQUEST.into_response());
        };

        let payload = String::from_request(req, state)
            .await
            .map_err(IntoResponse::into_response)?;

        Ok(Self(
            stripe::Webhook::construct_event(&payload, signature.to_str().unwrap(), "whsec_xxxxx")
                .map_err(|_| StatusCode::BAD_REQUEST.into_response())?,
        ))
    }
}

// https://github.com/t3dotgg/stripe-recommendations
pub async fn handler(
    State(state): State<AppState>,
    StripeEvent(event): StripeEvent,
) -> impl IntoResponse {
    match event.type_ {
        EventType::CheckoutSessionCompleted
        | EventType::CustomerSubscriptionCreated
        | EventType::CustomerSubscriptionUpdated
        | EventType::CustomerSubscriptionDeleted
        | EventType::CustomerSubscriptionPaused
        | EventType::CustomerSubscriptionResumed
        | EventType::CustomerSubscriptionPendingUpdateApplied
        | EventType::CustomerSubscriptionPendingUpdateExpired
        | EventType::CustomerSubscriptionTrialWillEnd
        | EventType::InvoicePaid
        | EventType::InvoicePaymentFailed
        | EventType::InvoicePaymentActionRequired
        | EventType::InvoiceUpcoming
        | EventType::InvoiceMarkedUncollectible
        | EventType::InvoicePaymentSucceeded
        | EventType::PaymentIntentSucceeded
        | EventType::PaymentIntentPaymentFailed
        | EventType::PaymentIntentCanceled => {
            if let Err(e) = match &event.data.object {
                EventObject::Customer(customer) => {
                    state.admin_db.update_stripe_customer(customer).await
                }
                EventObject::Subscription(subscription) => {
                    state
                        .admin_db
                        .update_stripe_subscription(
                            subscription.customer.id().to_string(),
                            subscription,
                        )
                        .await
                }
                _ => Ok(None),
            } {
                tracing::error!("stripe_webhook: {:?}", e);
            }
        }
        _ => {
            tracing::debug!("stripe_webhook_unhandled: {:?}", event);
        }
    }

    StatusCode::OK
}
