use crate::routes::AppState;

#[derive(Clone)]
pub struct FeedbackConfig {
    pub github_app_id: Option<String>,
    pub github_app_private_key: Option<String>,
    pub github_app_installation_id: Option<String>,
    pub openrouter_api_key: Option<String>,
}

impl FeedbackConfig {
    pub(crate) fn into_state(self) -> AppState {
        AppState {
            client: reqwest::Client::new(),
            config: self,
        }
    }
}
