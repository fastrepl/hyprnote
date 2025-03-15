pub use google_calendar3::common::GetToken;
use std::{future::Future, pin::Pin};

#[derive(Debug, Clone)]
pub struct Storage {
    // TODO: some user_id

    // we might want to store nango client here, with lifetime specified

    // Actually, we just make GetToken public, and expect server provide it.
    // we expect that we receive impl GetToken.
}

pub type GetTokenOutput<'a> = Pin<
    Box<
        dyn Future<Output = Result<Option<String>, Box<dyn std::error::Error + Send + Sync>>>
            + Send
            + 'a,
    >,
>;

impl Storage {
    pub async fn impl_get_token(
        &self,
    ) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
        // Fetch token from nango, using user_id
        Ok(Some("TODO".to_string()))
    }
}

impl GetToken for Storage {
    fn get_token<'a>(&'a self, _scopes: &'a [&str]) -> GetTokenOutput<'a> {
        Box::pin(self.impl_get_token())
    }
}
