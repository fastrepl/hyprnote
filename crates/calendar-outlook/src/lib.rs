mod errors;
mod models;

pub use errors::*;
pub use models::*;

use graph_rs_sdk::GraphClient;

pub struct Client {
    inner: GraphClient,
}

impl std::ops::Deref for Client {
    type Target = GraphClient;

    fn deref(&self) -> &Self::Target {
        &self.inner
    }
}

impl Client {
    pub fn with_user(&self, user_id: impl Into<String>) -> UserClient {
        UserClient {
            user_id: user_id.into(),
            client: self,
        }
    }
}

#[derive(Default)]
pub struct ClientBuilder {
    token: Option<String>,
}

impl ClientBuilder {
    pub fn build(self) -> Client {
        Client {
            inner: GraphClient::new(self.token.unwrap()),
        }
    }
}

pub struct UserClient<'a> {
    user_id: String,
    client: &'a Client,
}

impl<'a> UserClient<'a> {
    // https://learn.microsoft.com/en-us/graph/api/user-list-calendars
    pub async fn list_calendars(&self) -> Result<Vec<()>, Error> {
        let _response = self
            .client
            .user(&self.user_id)
            .calendars()
            .list_calendars()
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        Ok(vec![])
    }

    // https://learn.microsoft.com/en-us/graph/api/event-delta
    // https://learn.microsoft.com/en-us/graph/delta-query-events
    pub async fn delta_events(&self, _calendar_id: &str) -> Result<Vec<()>, Error> {
        let _delta_2 = self
            .client
            .user(&self.user_id)
            .calendar_views()
            .delta()
            .append_query_pair("startdatetime", "2016-12-01T00:00:00Z")
            .append_query_pair("enddatetime", "2016-12-30T00:00:00Z")
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        Ok(vec![])
    }
}
