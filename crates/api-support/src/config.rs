use crate::env::{GitHubAppEnv, OpenRouterEnv};

#[derive(Clone)]
pub struct SupportConfig {
    pub github: GitHubAppEnv,
    pub openrouter: OpenRouterEnv,
}

impl SupportConfig {
    pub fn new(github: &GitHubAppEnv, openrouter: &OpenRouterEnv) -> Self {
        Self {
            github: github.clone(),
            openrouter: openrouter.clone(),
        }
    }
}
