use google_calendar3::common::GetToken;
use std::{future::Future, pin::Pin};

#[derive(Debug, Clone)]
pub struct Storage {}

type GetTokenOutput<'a> = Pin<
    Box<
        dyn Future<Output = Result<Option<String>, Box<dyn std::error::Error + Send + Sync>>>
            + Send
            + 'a,
    >,
>;

impl GetToken for Storage {
    fn get_token<'a>(&'a self, _scopes: &'a [&str]) -> GetTokenOutput<'a> {
        Box::pin(async move { Ok(Some("your_oauth_token_here".to_string())) })
    }
}
