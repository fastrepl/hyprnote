pub fn json_string<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::de::DeserializeOwned,
{
    let value: Option<String> = serde::Deserialize::deserialize(deserializer)?;

    match value {
        Some(s) => serde_json::from_str(&s).map_err(serde::de::Error::custom),
        None => serde_json::from_value(serde_json::Value::Null).map_err(serde::de::Error::custom),
    }
}
