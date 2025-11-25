use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DeepLinkInfo {
    pub name: String,
    pub description: String,
    pub example: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum DeepLink {
    Auth(AuthDeepLink),
    Unknown { url: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "action")]
pub enum AuthDeepLink {
    Callback {
        access_token: String,
        refresh_token: String,
    },
}

impl DeepLink {
    pub fn parse(url: &str) -> crate::Result<Self> {
        let parsed = url::Url::parse(url)?;

        let host = parsed.host_str().unwrap_or("");
        let path = parsed.path().trim_start_matches('/');
        let full_path = if path.is_empty() {
            host.to_string()
        } else {
            format!("{}/{}", host, path)
        };

        let query_params: HashMap<String, String> = parsed.query_pairs().into_owned().collect();

        match full_path.as_str() {
            "auth/callback" | "auth" => {
                let access_token = query_params
                    .get("access_token")
                    .cloned()
                    .unwrap_or_default();
                let refresh_token = query_params
                    .get("refresh_token")
                    .cloned()
                    .unwrap_or_default();

                Ok(DeepLink::Auth(AuthDeepLink::Callback {
                    access_token,
                    refresh_token,
                }))
            }
            _ => Ok(DeepLink::Unknown {
                url: url.to_string(),
            }),
        }
    }

    pub fn available_deep_links() -> Vec<DeepLinkInfo> {
        vec![DeepLinkInfo {
            name: "Auth Callback".to_string(),
            description: "Handle authentication callback with access and refresh tokens"
                .to_string(),
            example: "hyprnote://auth/callback?access_token=xxx&refresh_token=yyy".to_string(),
        }]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_auth_callback() {
        let url = "hyprnote://auth/callback?access_token=test_access&refresh_token=test_refresh";
        let result = DeepLink::parse(url).unwrap();

        match result {
            DeepLink::Auth(AuthDeepLink::Callback {
                access_token,
                refresh_token,
            }) => {
                assert_eq!(access_token, "test_access");
                assert_eq!(refresh_token, "test_refresh");
            }
            _ => panic!("Expected Auth::Callback"),
        }
    }

    #[test]
    fn test_parse_unknown() {
        let url = "hyprnote://unknown/path";
        let result = DeepLink::parse(url).unwrap();

        match result {
            DeepLink::Unknown { url: parsed_url } => {
                assert_eq!(parsed_url, url);
            }
            _ => panic!("Expected Unknown"),
        }
    }
}
