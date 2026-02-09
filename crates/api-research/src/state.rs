use hypr_exa::ExaClient;

use crate::config::ResearchConfig;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) exa: ExaClient,
}

impl AppState {
    pub(crate) fn new(config: ResearchConfig) -> Self {
        let exa = ExaClient::builder()
            .api_key(config.exa_api_key)
            .build()
            .expect("failed to build Exa client");

        Self { exa }
    }
}
