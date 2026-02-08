use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct GitHubAppEnv {
    pub github_app_id: u64,
    pub github_app_private_key: String,
    pub github_app_installation_id: u64,
    pub github_repo_id: String,
    pub github_discussion_category_id: String,
}

#[derive(Clone, Deserialize)]
pub struct OpenRouterEnv {
    pub openrouter_api_key: String,
}
