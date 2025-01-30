use axum::{
    body::Body,
    extract::FromRequest,
    http::{Request, StatusCode},
    response::{IntoResponse, Response},
};
use stripe::{Event, EventType};

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

pub async fn handler(StripeEvent(event): StripeEvent) -> impl IntoResponse {
    match event.type_ {
        EventType::CheckoutSessionCompleted => {}
        EventType::SubscriptionScheduleCanceled => {}
        _ => {}
    }

    StatusCode::OK
}
