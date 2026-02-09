use crate::env::{GitHubAppEnv, OpenRouterEnv, SupportDatabaseEnv};

#[derive(Clone)]
pub struct SupportConfig {
    pub github: GitHubAppEnv,
    pub openrouter: OpenRouterEnv,
    pub support_database: SupportDatabaseEnv,
}

impl SupportConfig {
    pub fn new(
        github: &GitHubAppEnv,
        openrouter: &OpenRouterEnv,
        support_database: &SupportDatabaseEnv,
    ) -> Self {
        Self {
            github: github.clone(),
            openrouter: openrouter.clone(),
            support_database: support_database.clone(),
        }
    }
}
