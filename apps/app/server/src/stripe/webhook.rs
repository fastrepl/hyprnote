use std::str::FromStr;

use axum::{
    body::Body,
    extract::{FromRequest, State},
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use stripe::{CustomerId, Event, EventObject, EventType, Expandable, Object};

use crate::state::WebhookState;

// https://github.com/arlyon/async-stripe/blob/c71a7eb/examples/webhook-axum.rs
pub struct StripeEvent(Event);

impl FromRequest<WebhookState> for StripeEvent {
    type Rejection = Response;

    async fn from_request(
        req: Request<Body>,
        state: &WebhookState,
    ) -> Result<Self, Self::Rejection> {
        let signature = if let Some(sig) = req.headers().get("stripe-signature") {
            sig.to_owned()
        } else {
            return Err(StatusCode::BAD_REQUEST.into_response());
        };

        let payload = String::from_request(req, state)
            .await
            .map_err(IntoResponse::into_response)?;

        Ok(Self(
            stripe::Webhook::construct_event(
                &payload,
                signature.to_str().unwrap(),
                &state.stripe_webhook_signing_secret,
            )
            .map_err(|_| StatusCode::BAD_REQUEST.into_response())?,
        ))
    }
}

// https://github.com/t3dotgg/stripe-recommendations
// https://docs.stripe.com/api/events/types
pub async fn handler(
    State(state): State<WebhookState>,
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
            let stripe_customer_id: Option<String> =
                match &event.data.object {
                    EventObject::CheckoutSession(checkout_session) => checkout_session
                        .customer
                        .as_ref()
                        .map(|customer| match customer {
                            Expandable::Id(id) => id.to_string(),
                            Expandable::Object(customer_obj) => customer_obj.id().to_string(),
                        }),
                    EventObject::Subscription(subscription) => {
                        Some(subscription.customer.id().to_string())
                    }
                    EventObject::Customer(customer) => Some(customer.id().to_string()),
                    EventObject::Invoice(invoice) => {
                        invoice.customer.as_ref().map(|customer| match customer {
                            Expandable::Id(id) => id.to_string(),
                            Expandable::Object(customer_obj) => customer_obj.id().to_string(),
                        })
                    }
                    EventObject::PaymentIntent(payment_intent) => payment_intent
                        .customer
                        .as_ref()
                        .map(|customer| match customer {
                            Expandable::Id(id) => id.to_string(),
                            Expandable::Object(customer_obj) => customer_obj.id().to_string(),
                        }),

                    _ => None,
                };

            // TODO: do this with background worker with concurrency limit
            if let Some(stripe_customer_id) = stripe_customer_id {
                tokio::spawn({
                    async move {
                        let customer = stripe::Customer::retrieve(
                            &state.stripe,
                            CustomerId::from_str(&stripe_customer_id).as_ref().unwrap(),
                            &["subscriptions"],
                        )
                        .await
                        .unwrap();

                        let customer_id = customer.id().to_string();

                        if let Err(e) = state.admin_db.update_stripe_customer(&customer).await {
                            tracing::error!("stripe_customer_update_failed: {:?}", e);
                        }

                        let subscriptions = customer.subscriptions.unwrap_or_default();
                        let subscription = subscriptions.data.first();

                        if let Err(e) = state
                            .admin_db
                            .update_stripe_subscription(customer_id, subscription)
                            .await
                        {
                            tracing::error!("stripe_subscription_update_failed: {:?}", e);
                        }
                    }
                });
            }
        }
        _ => {
            tracing::debug!("stripe_webhook_unhandled: {:?}", event);
        }
    }

    StatusCode::OK
}
