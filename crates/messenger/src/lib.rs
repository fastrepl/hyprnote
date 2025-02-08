pub use slack_morphism::axum_support;
use slack_morphism::prelude::*;

pub struct Client {
    slack: SlackClient,
}

impl Client {
    pub fn new(token: String) -> Self {
        let slack = SlackClient::new(SlackClientHyperConnector::new());
        Self { slack }
    }
}
