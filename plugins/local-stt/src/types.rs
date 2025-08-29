#[derive(Debug)]
pub struct Connection {
    pub model: Option<String>,
    pub base_url: String,
    pub api_key: Option<String>,
}
