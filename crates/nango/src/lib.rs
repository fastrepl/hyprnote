mod client;
mod connect_session;
mod connection;
mod error;
pub mod proxy;
mod trigger;
mod types;

pub use client::*;
pub use connect_session::*;
pub use connection::*;
pub use error::*;
pub use proxy::NangoProxyBuilder;
pub use trigger::*;
pub use types::*;

macro_rules! common_derives {
    ($item:item) => {
        #[derive(
            Debug,
            Eq,
            PartialEq,
            Clone,
            serde::Serialize,
            serde::Deserialize,
            specta::Type,
            schemars::JsonSchema,
        )]
        $item
    };
}

pub(crate) use common_derives;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore]
    async fn test_create_connect_session() {
        let nango_client = NangoClientBuilder::default()
            .api_base("https://api.nango.dev")
            .api_key("de9c36c9-33dc-4ebf-b006-153d458583ea")
            .build()
            .unwrap();

        let _ = nango_client
            .create_connect_session(CreateConnectSessionRequest {
                end_user: EndUser {
                    id: "id".to_string(),
                    display_name: None,
                    email: None,
                    tags: None,
                },
                organization: None,
                allowed_integrations: None,
                integrations_config_defaults: None,
            })
            .await
            .unwrap();
    }

    #[test]
    fn test_proxy() {
        let nango_client = NangoClientBuilder::default()
            .api_base("https://api.nango.dev")
            .api_key("api_key")
            .build()
            .unwrap();

        let _ = nango_client
            .for_connection(NangoIntegration::GoogleCalendar, "connection")
            .get("/users")
            .unwrap();
    }

    #[test]
    fn test_build_missing_api_key() {
        let result = NangoClientBuilder::default()
            .api_base("https://api.nango.dev")
            .build();

        assert!(result.is_err());
    }

    #[test]
    fn test_build_missing_api_base() {
        let result = NangoClientBuilder::default().api_key("key").build();

        assert!(result.is_err());
    }
}
