use serde::Deserialize;

pub fn filter_empty<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    Ok(s.filter(|s| !s.is_empty()))
}

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

#[derive(Clone, Deserialize)]
pub struct OpenRouterEnv {
    pub openrouter_api_key: String,
}
