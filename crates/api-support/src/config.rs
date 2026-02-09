use crate::env::{GitHubAppEnv, OpenRouterEnv, SupabaseDbEnv};

#[derive(Clone)]
pub struct SupportConfig {
    pub github: GitHubAppEnv,
    pub openrouter: OpenRouterEnv,
    pub supabase_db: SupabaseDbEnv,
}

impl SupportConfig {
    pub fn new(
        github: &GitHubAppEnv,
        openrouter: &OpenRouterEnv,
        supabase_db: &SupabaseDbEnv,
    ) -> Self {
        Self {
            github: github.clone(),
            openrouter: openrouter.clone(),
            supabase_db: supabase_db.clone(),
        }
    }
}
