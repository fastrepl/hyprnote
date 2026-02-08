use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct SupabaseEnv {
    pub supabase_url: String,
    pub supabase_anon_key: String,
}

#[derive(Clone, Deserialize)]
pub struct NangoEnv {
    #[serde(default)]
    pub nango_api_base: Option<String>,
    pub nango_api_key: String,
}
