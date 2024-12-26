use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use shuttle_service::{CustomError, Error, IntoResource, ResourceFactory, ResourceInputBuilder};

pub use clerk_rs;
pub use clerk_rs::{
    clerk::Clerk as ClerkClient,
    validators::{axum::ClerkLayer, jwks::MemoryCacheJwksProvider},
};

use clerk_rs::ClerkConfiguration as ClerkConfig;

#[derive(Default, Serialize)]
pub struct Clerk {
    secret_key: Option<String>,
}

impl Clerk {
    pub fn secret_key(mut self, secret_key: &str) -> Self {
        self.secret_key = Some(secret_key.to_string());
        self
    }
}

#[derive(Serialize, Deserialize)]
pub struct Config {
    secret_key: String,
}

#[async_trait]
impl ResourceInputBuilder for Clerk {
    type Input = Config;
    type Output = Config;

    async fn build(self, _factory: &ResourceFactory) -> Result<Self::Input, Error> {
        let secret_key = self
            .secret_key
            .ok_or(Error::Custom(CustomError::msg("'secret_key' is required")))?;

        Ok(Config { secret_key })
    }
}

#[async_trait]
impl IntoResource<ClerkClient> for Config {
    async fn into_resource(self) -> Result<ClerkClient, Error> {
        let config = ClerkConfig::new(None, None, Some(self.secret_key), None);
        let clerk = ClerkClient::new(config);
        Ok(clerk)
    }
}
