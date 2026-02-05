use serde::Deserialize;

#[derive(Deserialize)]
pub struct Env {
    pub openrouter_api_key: String,
}

pub struct ApiKey(pub String);

impl From<&Env> for ApiKey {
    fn from(env: &Env) -> Self {
        Self(env.openrouter_api_key.clone())
    }
}
