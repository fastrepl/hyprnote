use hypr_api_env::{NangoEnv, SupabaseEnv};

#[derive(Clone)]
pub struct CalendarConfig {
    pub nango: NangoEnv,
    pub supabase: SupabaseEnv,
}

impl CalendarConfig {
    pub fn new(nango: &NangoEnv, supabase: &SupabaseEnv) -> Self {
        Self {
            nango: nango.clone(),
            supabase: supabase.clone(),
        }
    }
}
