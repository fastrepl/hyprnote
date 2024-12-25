use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use shuttle_service::{CustomError, Error, IntoResource, ResourceFactory, ResourceInputBuilder};

pub use stytch;
pub use stytch::client::Client;

#[derive(Default, Serialize)]
pub struct Stytch {
    project_id: Option<String>,
    secret: Option<String>,
}

impl Stytch {
    pub fn project_id(mut self, project_id: &str) -> Self {
        self.project_id = Some(project_id.to_string());
        self
    }

    pub fn secret(mut self, secret: &str) -> Self {
        self.secret = Some(secret.to_string());
        self
    }
}

#[derive(Serialize, Deserialize)]
pub struct Config {
    project_id: String,
    secret: String,
}

#[async_trait]
impl ResourceInputBuilder for Stytch {
    type Input = Config;
    type Output = Config;

    async fn build(self, _factory: &ResourceFactory) -> Result<Self::Input, Error> {
        let project_id = self.project_id.ok_or(Error::Custom(CustomError::msg(
            "Stytch project ID required",
        )))?;

        let secret = self
            .secret
            .ok_or(Error::Custom(CustomError::msg("Stytch secret required")))?;

        Ok(Config { project_id, secret })
    }
}

#[async_trait]
impl IntoResource<Client> for Config {
    async fn into_resource(self) -> Result<Client, Error> {
        let client = Client::new(self.project_id.as_str(), self.secret.as_str())
            .map_err(|e| Error::Custom(CustomError::msg(e.to_string())))?;

        Ok(client)
    }
}
