pub fn server_api_base() -> String {
    if cfg!(debug_assertions) {
        "http://localhost:1234".to_string()
    } else {
        "https://app.hyprnote.com".to_string()
    }
}

pub fn server_api_key() -> String {
    if cfg!(debug_assertions) {
        "123".to_string()
    } else {
        "123".to_string()
    }
}
