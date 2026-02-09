use crate::routes::AppState;

#[derive(Clone)]
pub struct FeedbackConfig {
    pub charlie: hypr_api_env::CharlieAppEnv,
    pub openrouter: Option<hypr_api_env::OpenRouterEnv>,
}

impl FeedbackConfig {
    pub(crate) fn into_state(self) -> AppState {
        AppState {
            client: reqwest::Client::new(),
            config: self,
        }
    }
}
