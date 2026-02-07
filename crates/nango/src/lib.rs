mod client;
mod error;
pub mod proxy;
mod types;

pub use client::*;
pub use error::*;
pub use proxy::NangoProxyBuilder;
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
    async fn test_non_proxy() {
        let nango_client = NangoClientBuilder::default()
            .api_base("https://api.nango.dev")
            .api_key("de9c36c9-33dc-4ebf-b006-153d458583ea")
            .build();

        let _ = nango_client
            .create_connect_session(NangoConnectSessionRequest {
                end_user: NangoConnectSessionRequestUser {
                    id: "id".to_string(),
                    display_name: None,
                    email: None,
                },
                organization: None,
                allowed_integrations: vec![],
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
            .build();

        let _ = nango_client
            .for_connection(NangoIntegration::GoogleCalendar, "connection")
            .get("/users");
    }
}
