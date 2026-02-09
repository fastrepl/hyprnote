use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct GitHubAppEnv {
    pub github_bot_app_id: u64,
    pub github_bot_private_key: String,
    pub github_bot_installation_id: u64,
    pub github_repo_id: String,
    pub github_discussion_category_id: String,
}

pub use hypr_api_env::OpenRouterEnv;
