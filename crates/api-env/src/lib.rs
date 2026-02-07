use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct SupabaseEnv {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}
