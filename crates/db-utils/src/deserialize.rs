pub fn json_string<'de, D, T>(deserializer: D) -> Result<T, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::de::DeserializeOwned,
{
    let v = <String as serde::Deserialize>::deserialize(deserializer)?;
    serde_json::from_str(&v).map_err(serde::de::Error::custom)
}

pub fn optional_json_string<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
where
    D: serde::Deserializer<'de>,
    T: serde::de::DeserializeOwned,
{
    let v = <Option<String> as serde::Deserialize>::deserialize(deserializer)?;
    match v {
        None => Ok(None),
        Some(s) => serde_json::from_str(&s)
            .map(Some)
            .map_err(serde::de::Error::custom),
    }
}
