use crate::stripe::StripeEvent;
use axum::response::IntoResponse;
use stripe::{EventObject, EventType};

pub async fn handler(StripeEvent(event): StripeEvent) -> impl IntoResponse {
    match event.type_ {
        EventType::CheckoutSessionCompleted => {
            if let EventObject::CheckoutSession(session) = event.data.object {
                println!(
                    "Received checkout session completed webhook with id: {:?}",
                    session.id
                );
            }
        }
        EventType::AccountUpdated => {
            if let EventObject::Account(account) = event.data.object {
                println!(
                    "Received account updated webhook for account: {:?}",
                    account.id
                );
            }
        }
        _ => println!("Unknown event encountered in webhook: {:?}", event.type_),
    }
}
