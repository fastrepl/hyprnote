use std::sync::Arc;

#[derive(Clone)]
pub struct CalendarConfig {
    pub auth: Option<Arc<hypr_supabase_auth::SupabaseAuth>>,
}

impl CalendarConfig {
    pub fn new() -> Self {
        Self { auth: None }
    }

    pub fn with_auth(mut self, auth: Arc<hypr_supabase_auth::SupabaseAuth>) -> Self {
        self.auth = Some(auth);
        self
    }
}
