use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct SupabaseEnv {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}

#[derive(Clone, Deserialize)]
pub struct NangoEnv {
    pub nango_api_base: String,
    pub nango_api_key: String,
}
